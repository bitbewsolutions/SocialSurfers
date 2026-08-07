/**
 * Client logo pipeline: raw phone screenshots in -> uniform web tiles out.
 *
 *   node tools/logos.mjs [--sheet]
 *
 * The source material is what a client actually sends: iPhone screenshots of
 * Instagram profile pictures (2–6 MB each, with the status bar and the
 * Following/Share/QR buttons still attached), a few already-cropped avatars, and
 * some loose rectangular wordmarks on white, cream, black or transparency.
 *
 * Two things make this automatable rather than an afternoon of manual cropping:
 *
 * 1. In the screenshots the avatar is the ONLY sharp thing on the frame — Instagram
 *    blurs the backdrop behind it. So instead of hunting for a circle, find the
 *    region with real high-frequency detail. The status bar and the button row are
 *    also sharp, so those bands are excluded by position first.
 *
 * 2. Backgrounds never have to be removed. Every logo is composited onto a tile
 *    filled with its OWN background colour, sampled from its corners. A black
 *    wordmark keeps its black tile, a transparent PNG gets paper. That is both
 *    honest to each brand and visually uniform, which is what a logo wall needs.
 */

import sharp from 'sharp';
import { readdir, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'src/assets';
const OUT = 'public/clients';
const TILE = 320;          // exported tile edge, CSS px @1x is half this
const PAD = 0.14;          // share of the tile left as breathing room
const SHEET = process.argv.includes('--sheet');

const isImage = (f) => /\.(png|jpe?g|webp)$/i.test(f);

/** Screenshots are tall and phone-shaped; logos are roughly square or wide. */
const looksLikeScreenshot = (m) => m.height / m.width >= 1.7;

/**
 * Locate the sharp region of a blurred-backdrop screenshot.
 * Returns a square crop box in full-resolution coordinates, or null.
 */
async function findAvatar(file, meta) {
  const w = 220;
  const h = Math.round((meta.height / meta.width) * w);
  const { data } = await sharp(file).greyscale().resize(w, h, { fit: 'fill' })
    .raw().toBuffer({ resolveWithObject: true });

  // gradient magnitude — blurred pixels have near-zero difference from neighbours
  const grad = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      grad[i] = Math.abs(data[i] - data[i + 1]) + Math.abs(data[i] - data[i + w]);
    }
  }

  // The status bar (top) and the action buttons (bottom) are sharp too, so cut
  // them by position before looking at anything.
  const yTop = Math.round(h * 0.13);
  const yBot = Math.round(h * 0.76);
  const xPad = Math.round(w * 0.10);

  // Thresholds are relative to this frame's own strongest row, not absolute. A fixed
  // cutoff missed every avatar that is mostly flat colour — a black disc with a
  // wordmark on it has huge edge contrast but very few edge PIXELS, so counting
  // "pixels over 14" scored it below a busy photographic logo and it was skipped.
  const rowSum = new Float32Array(h);
  for (let y = yTop; y < yBot; y++) {
    let s = 0;
    for (let x = xPad; x < w - xPad; x++) s += grad[y * w + x];
    rowSum[y] = s;
  }
  const rowMax = Math.max(...rowSum);
  if (rowMax <= 0) return null;
  const rowCut = rowMax * 0.2;

  /* Instagram's avatar viewer is a fixed layout: the disc is centred horizontally and
     is a constant share of the frame width. When the adaptive pass finds nothing —
     a pale logo on a pale blurred backdrop has almost no edge energy anywhere — fall
     back to that geometry, anchored to whichever row carries the most detail. */
  const geometric = () => {
    let peak = yTop;
    for (let y = yTop; y < yBot; y++) if (rowSum[y] > rowSum[peak]) peak = y;
    const scale = meta.width / w;
    const side = Math.round(meta.width * 0.68);
    const left = Math.round((meta.width - side) / 2);
    const top = Math.max(0, Math.min(meta.height - side, Math.round(peak * scale - side / 2)));
    return { left, top, width: side, height: side, how: 'geometric' };
  };

  // longest run of rows carrying real detail = the avatar band
  let best = { start: -1, end: -1, len: 0 };
  let run = -1;
  for (let y = yTop; y <= yBot; y++) {
    const on = y < yBot && rowSum[y] > rowCut;
    if (on && run === -1) run = y;
    if (!on && run !== -1) {
      if (y - run > best.len) best = { start: run, end: y, len: y - run };
      run = -1;
    }
  }
  if (best.len < h * 0.06) return geometric();

  // horizontal extent within that band, thresholded the same relative way
  const colSum = new Float32Array(w);
  for (let y = best.start; y < best.end; y++) {
    for (let x = xPad; x < w - xPad; x++) colSum[x] += grad[y * w + x];
  }
  const colCut = Math.max(...colSum) * 0.2;
  let minX = w, maxX = 0;
  for (let x = xPad; x < w - xPad; x++) {
    if (colSum[x] > colCut) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
  }
  if (maxX <= minX) return geometric();

  const scale = meta.width / w;
  const cx = ((minX + maxX) / 2) * scale;
  const cy = ((best.start + best.end) / 2) * scale;
  // square on the larger axis so a slightly clipped edge never crops the mark
  const size = Math.max((maxX - minX) * scale, best.len * scale) * 1.02;

  const half = size / 2;
  const left = Math.max(0, Math.round(cx - half));
  const top = Math.max(0, Math.round(cy - half));
  const side = Math.round(Math.min(size, meta.width - left, meta.height - top));
  return { left, top, width: side, height: side };
}

const relLum = (r, g, b) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

/**
 * The tile's ground: the median of the four corners.
 *
 * If the corners are transparent there is no ground to inherit, so pick one from the
 * artwork instead — a white wordmark on transparency needs a DARK tile. Defaulting
 * those to paper is what made the Romeo Lane logo render as an empty rectangle.
 */
async function tileGround(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const s = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  const px = [];
  for (const [ox, oy] of [[0, 0], [w - s, 0], [0, h - s], [w - s, h - s]]) {
    for (let y = oy; y < oy + s; y++) {
      for (let x = ox; x < ox + s; x++) {
        const i = (y * w + x) * c;
        if (data[i + 3] < 128) continue;
        px.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
  }
  if (px.length >= 8) {
    const med = (k) => px.map((p) => p[k]).sort((a, b) => a - b)[Math.floor(px.length / 2)];
    return { r: med(0), g: med(1), b: med(2) };
  }

  // transparent corners — judge by the mean luminance of the opaque artwork
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += c) {
    if (data[i + 3] < 128) continue;
    sum += relLum(data[i], data[i + 1], data[i + 2]);
    n++;
  }
  const light = n > 0 && sum / n > 0.5;
  return light ? { r: 23, g: 16, b: 47 } : { r: 246, g: 245, b: 249 };
}

/* Source filenames are IMG_6327.PNG and 'WhatsApp Image ... (2).jpeg'. The name map
   turns those into real slugs so the exported tiles and the data file are readable,
   and so re-running the pipeline is idempotent. */
const names = JSON.parse(await readFile('tools/clients.json', 'utf8'));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const files = (await readdir(SRC)).filter(isImage).sort();
await mkdir(OUT, { recursive: true });

const manifest = [];
const previews = [];

for (const f of files) {
  const src = path.join(SRC, f);
  const meta = await sharp(src).metadata();
  let pipe = sharp(src);
  let how = 'as-is';

  if (looksLikeScreenshot(meta)) {
    const box = await findAvatar(src, meta);
    if (!box) { console.log(`  SKIP  ${f} — no sharp region found`); continue; }
    pipe = sharp(src).extract({ left: box.left, top: box.top, width: box.width, height: box.height });
    how = `${box.how ?? "avatar"} ${box.width}px @ ${box.left},${box.top}`;
  }

  // drop any uniform border the source carried in
  let body = await pipe.trim({ threshold: 12 }).toBuffer().catch(() => pipe.toBuffer());
  const bm = await sharp(body).metadata();
  if (!bm.width || !bm.height) continue;

  const bg = await tileGround(body);

  const inner = Math.round(TILE * (1 - PAD * 2));
  const logo = await sharp(body)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  const lm = await sharp(logo).metadata();

  const known = names[f];
  const slug = known ? slugify(known.name) : f.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const outFile = path.join(OUT, `${slug}.webp`);

  await sharp({ create: { width: TILE, height: TILE, channels: 4, background: { ...bg, alpha: 1 } } })
    .composite([{ input: logo, left: Math.round((TILE - lm.width) / 2), top: Math.round((TILE - lm.height) / 2) }])
    .webp({ quality: 86, effort: 6 })
    .toFile(outFile);

  manifest.push({
    name: known?.name ?? slug,
    industry: known?.industry ?? '',
    logo: `/clients/${slug}.webp`,
    ...(known?.verify ? { verify: true } : {}),
    from: f,
    bg: `#${[bg.r, bg.g, bg.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`,
  });
  if (SHEET) previews.push({ slug, buf: await sharp(outFile).resize(170, 170).png().toBuffer() });
  console.log(`  ok    ${f}  ->  ${slug}.webp   (${how})`);
}

await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
// the site reads this one; re-running the pipeline keeps it in sync
const clients = manifest.map(({ name, industry, logo }) => ({ name, industry, logo }));
await writeFile('src/data/clients.json', JSON.stringify(clients, null, 2) + '\n');
console.log(`\n  ${manifest.length} tiles -> ${OUT}`);

if (SHEET && previews.length) {
  const cols = 6;
  const rows = Math.ceil(previews.length / cols);
  await sharp({ create: { width: cols * 174, height: rows * 174, channels: 3, background: '#e9e7ee' } })
    .composite(previews.map((p, i) => ({
      input: p.buf, left: (i % cols) * 174 + 2, top: Math.floor(i / cols) * 174 + 2,
    })))
    .png()
    .toFile(path.join(OUT, '_sheet.png'));
  console.log(`  contact sheet -> ${OUT}/_sheet.png`);
}
