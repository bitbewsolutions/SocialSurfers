/**
 * Hero illustration pipeline: the client's render on white -> a knocked-out WebP.
 *
 *   node tools/hero.mjs [--check]
 *
 * The client supplies the surfer as a flat image with the background baked in at
 * roughly 252/255 — not transparent, and not exactly the page's paper either
 * (--paper is #f6f5f9). Dropped in as-is it reads as a pale rectangle sitting on
 * the page, so the ground has to come off.
 *
 * The naive way to do that is a luminance threshold, and it destroys this
 * particular image: the surfboard and the Brand cube are the two whitest objects
 * in the frame, so any threshold that catches the ground also punches holes
 * through the subject. Instead the background is found by FLOOD FILL inward from
 * the border — enclosed whites are unreachable and survive by construction.
 *
 * The remaining problem is the fringe. Pixels along the silhouette are the
 * renderer's own antialiasing, part subject and part white ground, and a binary
 * mask keeps them at full opacity — a bright halo, most visible where the artwork
 * meets the paper. So the mask is eroded by a pixel before it is applied, then
 * softened, which trades a hair of the outline for an edge that composites
 * cleanly on any ground.
 *
 * Output is alpha WebP at two widths, which is why this cannot be an .astro
 * <Image> one-liner: the keying has to happen before the encode.
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/* The client's export, in preference order. hero.png is the 650px original and is
   only a stand-in — it is soft at 2x. See README for the export spec. */
const CANDIDATES = ['src/assets/hero-surfer.png', 'hero.png'];
const OUT = 'public/art';
const MANIFEST = 'src/data/hero-art.json';
const WIDTHS = [560, 1120];          // 1x and 2x of the widest the column ever gets
const NAME = 'surfer';

/* A pixel is ground if none of its channels drops below this. The render's ground
   measures 252 and its darkest antialiased skirt still sits well above 238; the
   lightest thing inside the subject (the cube's lit face) measures below it. */
const GROUND = 238;

const src = CANDIDATES.find((f) => existsSync(f));
if (!src) {
  console.error(`no source image found — looked for:\n  ${CANDIDATES.join('\n  ')}`);
  process.exit(1);
}

/**
 * Alpha from a border flood fill.
 *
 * Iterative rather than recursive: at 1120x1730 a recursive fill is ~2M frames
 * deep and blows the stack. The frontier is a plain Int32Array used as a stack of
 * pixel indices.
 */
function keyBackground({ data, info }) {
  const { width: w, height: h } = info;
  const n = w * h;
  const isGround = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    isGround[i] = data[o] >= GROUND && data[o + 1] >= GROUND && data[o + 2] >= GROUND ? 1 : 0;
  }

  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;

  const push = (i) => {
    if (i >= 0 && i < n && !seen[i] && isGround[i]) {
      seen[i] = 1;
      stack[top++] = i;
    }
  };

  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }

  while (top > 0) {
    const i = stack[--top];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    push(i - w);
    push(i + w);
  }

  // seen === reached from outside === background. Everything else is subject.
  const mask = Buffer.alloc(n);
  let kept = 0;
  for (let i = 0; i < n; i++) {
    const on = seen[i] ? 0 : 255;
    mask[i] = on;
    if (on) kept++;
  }
  return { mask, w, h, coverage: kept / n };
}

const raw = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { mask, w, h, coverage } = keyBackground(raw);

/* Erode by one pixel, then soften. A 3x3 minimum would be the textbook erode;
   sharp has no morphology, but blurring the mask and then pushing the midpoint
   up with a linear ramp cuts the outermost ring and feathers what is left in a
   single pass.
   `.toColourspace('b-w').raw()` is load-bearing: without both, sharp hands back a
   three-channel buffer for a one-channel input and every byte after the first
   pixel is off by two. */
const alpha = await sharp(mask, { raw: { width: w, height: h, channels: 1 } })
  .blur(1.1)
  .linear(1.7, -0.7 * 255)
  .toColourspace('b-w')
  .raw()
  .toBuffer();

if (alpha.length !== w * h) {
  console.error(`alpha is ${alpha.length} bytes for ${w * h} pixels — refusing to guess`);
  process.exit(1);
}

/* Written straight into the source's own alpha byte rather than composed with
   joinChannel, which appends the mask as an extra colour band and leaves the
   result opaque. One pass over the buffer, and the result is unambiguously RGBA. */
for (let i = 0; i < w * h; i++) raw.data[i * 4 + 3] = alpha[i];

const keyed = await sharp(raw.data, { raw: { width: w, height: h, channels: 4 } })
  .png()
  .toBuffer();

/* Trim what the flood fill just made transparent. The render carries a wide empty
   margin; leaving it in would mean the column sizes itself to whitespace and the
   artwork lands smaller than the layout asks for. */
const trimmed = await sharp(keyed).trim({ threshold: 1 }).toBuffer();
const meta = await sharp(trimmed).metadata();

await mkdir(OUT, { recursive: true });

const report = [];
for (const width of WIDTHS) {
  const out = `${OUT}/${NAME}-${width}.webp`;
  const buf = await sharp(trimmed)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toBuffer();
  await writeFile(out, buf);
  const m = await sharp(buf).metadata();
  report.push({ out, w: m.width, h: m.height, kb: +(buf.length / 1024).toFixed(1) });
}

/* The markup reads its dimensions from here rather than hard-coding them. While the
   source is smaller than the 2x target, `withoutEnlargement` silently returns a file
   narrower than its name — a hand-written srcset would then advertise a width the
   file does not have, and the browser would pick it on a retina screen and get less
   detail than it asked for. Recording the measured widths makes that impossible. */
await mkdir('src/data', { recursive: true });
await writeFile(
  MANIFEST,
  JSON.stringify(
    {
      note: 'generated by tools/hero.mjs — do not edit by hand',
      src: `/${report.at(0).out.replace(/^public\//, '')}`,
      width: report.at(-1).w,
      height: report.at(-1).h,
      /* Two entries collapse to one while the source is too small to fill both
         widths — a srcset with a repeated descriptor is just a bigger download for
         identical pixels. */
      sources: report
        .filter((r, i) => report.findIndex((o) => o.w === r.w) === i)
        .map((r) => ({ src: `/${r.out.replace(/^public\//, '')}`, w: r.w })),
    },
    null,
    2,
  ) + '\n',
);

if (process.argv.includes('--check')) {
  /* Composite on paper and on white so the fringe is visible where it would show. */
  for (const [label, bg] of [['paper', '#f6f5f9'], ['white', '#ffffff']]) {
    await sharp(trimmed)
      .resize({ width: 700 })
      .flatten({ background: bg })
      .png()
      .toFile(`${OUT}/_check-${label}.png`);
  }
  console.log(`wrote ${OUT}/_check-*.png — these are diagnostics, do not commit them`);
}

console.log(`source     ${src} (${raw.info.width}x${raw.info.height})`);
console.log(`subject    ${(coverage * 100).toFixed(1)}% of frame, trimmed to ${meta.width}x${meta.height}`);
for (const r of report) console.log(`wrote      ${r.out}  ${r.w}x${r.h}  ${r.kb} KB`);

if (meta.width < WIDTHS.at(-1)) {
  console.log(
    `\nNOTE: the trimmed source is ${meta.width}px wide, short of the ${WIDTHS.at(-1)}px 2x\n` +
      `target, so the retina file was not enlarged and will look soft. Drop a bigger\n` +
      `export at src/assets/hero-surfer.png and re-run.`,
  );
}
