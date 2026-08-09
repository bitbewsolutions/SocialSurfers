/**
 * Automated WCAG contrast audit against the RENDERED page.
 *
 * Every contrast bug on this site so far came from the same place: a section
 * gradient whose stops are percentages, so the ground under a fixed piece of text
 * moves when the section's height changes. You cannot catch that by reading CSS —
 * the declared colour is fine, the pixel behind it is not. So this measures pixels.
 *
 * For each element with its own text run it takes the modal (most common) pixel
 * colour inside the element's box — for text, that is the background, since glyphs
 * never cover half the box — composites the declared colour over it, and reports
 * the ratio against the AA threshold for that text's size and weight.
 *
 *   node qa/contrast.mjs <url> [--vp 1440x900] [--min 4.5]
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:4399/';
const flag = (n, d) => {
  const i = args.indexOf('--' + n);
  return i === -1 ? d : args[i + 1];
};
const [VW, VH] = String(flag('vp', '1440x900')).split('x').map(Number);

const chromePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => p && existsSync(p));

const port = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${path.join(process.env.TEMP || '/tmp', 'ss-contrast-' + port)}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try {
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    wsUrl = tabs.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch { /* not up yet */ }
  if (!wsUrl) await sleep(250);
}

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let msgId = 0;
const pending = new Map();
const evListeners = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  } else if (m.method) evListeners.get(m.method)?.forEach((fn) => fn(m.params));
});
const send = (method, params = {}) => {
  const id = ++msgId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej }));
};
const once = (method) =>
  new Promise((r) => {
    if (!evListeners.has(method)) evListeners.set(method, []);
    evListeners.get(method).push(r);
  });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width: VW, height: VH, deviceScaleFactor: 1, mobile: false,
});

const loaded = once('Page.loadEventFired');
await send('Page.navigate', { url });
await loaded;
await sleep(2600);

/*
 * Fire every reveal, or half the page measures as transparent-on-transparent.
 *
 * The walk still runs — it is what loads the lazy logo tiles — but it is no longer
 * what decides whether an element is visible when the screenshot is taken. Relying
 * on it was silently lossy: elements still mid-transition compute to opacity 0 and
 * are dropped from the audit, and the count swung between 183 and 233 across
 * consecutive runs of the same page. A pass that skipped a quarter of the page for
 * timing reasons is not a pass, and the missing quarter is invisible in the output.
 *
 * So the final state is forced rather than awaited. `.js-motion` is the class that
 * hides reveal elements in the first place — dropping it is exactly the no-JS /
 * reduced-motion rendering, which is the state every element must be legible in
 * anyway. Adding .is-in as well covers anything keyed off the observer instead.
 */
await send('Runtime.evaluate', {
  awaitPromise: true,
  expression: `(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    document.documentElement.style.scrollBehavior = 'auto';
    const step = Math.round(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y); await pause(150);
    }
    scrollTo(0, 0); await pause(200);
    document.documentElement.classList.remove('js-motion');
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
    await pause(500);
  })()`,
});

const { result: dims } = await send('Runtime.evaluate', {
  expression: 'JSON.stringify({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight})',
  returnByValue: true,
});
const { w, h } = JSON.parse(dims.value);

const { data: png } = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: w, height: Math.min(h, 24000), scale: 1 },
});

// Collect every element that owns a text run, in document coordinates.
const { result: nodes } = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `JSON.stringify((() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      // own text only — a wrapper's box would sample its children's grounds
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === 3 && n.textContent.trim())
        .map((n) => n.textContent.trim()).join(' ');
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      /* The union of the element's OWN text, not its border box.
         The box spans children too, and their pixels are then sampled as if they
         were this element's ground: "About <em>Us</em>" measured its dark heading
         against the light gradient of "Us" and reported 2.92:1 for a run that is
         actually on pale lavender at over 12:1. A Range over the own text nodes is
         exactly the ink this element is responsible for. */
      const own_rects = [];
      for (const n of el.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const rg = document.createRange();
        rg.selectNodeContents(n);
        for (const rr of rg.getClientRects()) {
          if (rr.width >= 2 && rr.height >= 2) own_rects.push(rr);
        }
      }
      if (!own_rects.length) continue;
      /* Kept as SEPARATE rects, never merged into one box. A union spans the gap
         between lines, and for "Let's Surf Your <em>Brand</em> / to the <em>Social
         Waves.</em>" that gap contains the gradient words — which then measured as
         the white heading's ground and reported 2.31:1 for a run sitting on ink. */
      const rects = own_rects.map((q) => ({
        x: Math.round(q.left + scrollX), y: Math.round(q.top + scrollY),
        w: Math.round(q.width), h: Math.round(q.height),
      })).filter((q) => q.w >= 4 && q.h >= 4);
      if (!rects.length) continue;
      const r = { width: Math.max(...rects.map((q) => q.w)), height: rects[0].h };
      if (r.width < 4 || r.height < 4) continue;
      // skip anything parked offscreen (honeypot, skip link)
      if (r.left + scrollX < -500 || r.top + scrollY < -500) continue;
      // Gradient text (background-clip:text) computes to color:transparent, so the
      // declared colour tells us nothing — those get measured off the glyph pixels.
      const clipText = cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text';
      // WCAG 1.4.3 exempts logotypes: "text that is part of a logo or brand name has
      // no minimum contrast requirement". Opt in explicitly per element — never by
      // guessing — so an exemption is always a visible decision in the markup.
      const exempt = !!el.closest('[data-contrast-exempt]');
      out.push({
        sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : ''),
        text: own.slice(0, 42),
        color: cs.color,
        clipText,
        exempt,
        size: parseFloat(cs.fontSize),
        weight: parseInt(cs.fontWeight, 10) || 400,
        rects,
        x: rects[0].x, y: rects[0].y,
        w: Math.round(r.width), h: Math.round(r.height),
      });
    }
    return out;
  })())`,
});

ws.close();
chrome.kill();

const els = JSON.parse(nodes.value);
const img = sharp(Buffer.from(png, 'base64'));
const { data: raw, info } = await img.raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;

const srgb = (c) => (c /= 255) <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};
const parseColor = (s) => {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map((v) => parseFloat(v));
  return { rgb: [p[0], p[1], p[2]], a: p[3] === undefined ? 1 : p[3] };
};

/**
 * Most common pixel in the box = the ground the glyphs sit on.
 *
 * With one correction, which the gradient service cards forced. The mode is taken
 * over QUANTISED colours, and that quietly assumes the ground is flatter than the
 * text. On a gradient ground it is the other way round: the ground's pixels spread
 * across dozens of buckets while the glyphs are all exactly one colour, so the mode
 * returns the TEXT and the element measures against itself.
 *
 * Measured on "Branding & Identity" — a 900-weight heading on a gradient card — the
 * ground held 63.2% of the box and the glyphs 33.6%, yet the winning bucket was the
 * glyph white at 25.6%. It reported 1.03:1 against a true 6.4:1. The same fault
 * would just as happily invent a PASS, which is worse.
 *
 * So when the declared text colour is opaque and known, its pixels are excluded
 * before the mode is taken. If that empties the box — text and ground genuinely the
 * same colour — it falls back to the unfiltered mode so a real failure still reports.
 */
function modalBg(rects, textRgb) {
  const tally = (skipText) => {
    const counts = new Map();
    let n = 0;
    for (const rc of rects) {
    const x1 = Math.min(info.width, rc.x + rc.w), y1 = Math.min(info.height, rc.y + rc.h);
    for (let py = Math.max(0, rc.y); py < y1; py++) {
      for (let px = Math.max(0, rc.x); px < x1; px++) {
        const i = (py * info.width + px) * ch;
        const r = raw[i], g = raw[i + 1], b = raw[i + 2];
        if (skipText) {
          /* Chebyshev distance, and the radius is deliberately TIGHT — solid glyph
             interiors only, not the antialiased fringe.
             A generous radius is the obvious choice and it is wrong: it also
             swallows any ground that merely resembles the text, which is precisely
             the case this tool exists to catch. At 46 a white-on-92%-white button
             had its ground excluded too, the mode fell through to the dark pixels
             around the pill, and a 2.4:1 failure reported as a pass. Caught by
             deliberately reintroducing that bug and re-running. */
          const d = Math.max(
            Math.abs(r - textRgb[0]), Math.abs(g - textRgb[1]), Math.abs(b - textRgb[2]),
          );
          if (d <= 8) continue;
        }
        // quantise so anti-aliasing noise doesn't split the mode across neighbours
        const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
        counts.set(key, (counts.get(key) || 0) + 1);
        n++;
      }
    }
    }
    if (!n) return null;
    let best = null, bestC = 0;
    for (const [k, c] of counts) if (c > bestC) { bestC = c; best = k; }
    return {
      rgb: [((best >> 12) & 63) << 2, ((best >> 6) & 63) << 2, (best & 63) << 2],
      share: bestC / n,
    };
  };

  return (textRgb && tally(true)) || tally(false);
}

/**
 * The ground under text that HAS no single ground — a photograph, a gradient wash.
 *
 * The modal method assumes one dominant colour exists. Once the hero became a
 * full-bleed photograph and half the sections carried gradient washes, 101 of 295
 * text runs stopped having one, and every one of them was being dropped from the
 * audit in silence — the hero headline, both accent words, the sub, both buttons.
 *
 * Instead of a single ground this takes the WORST of the real ones: glyph pixels are
 * excluded by colour, and the surviving ground pixels are ranked by how little they
 * contrast with the text. The 5th percentile is the answer — bad enough to catch a
 * headline crossing a lit icon, not so absolute that one stray specular pixel
 * condemns an otherwise legible line.
 *
 * Only for text whose painted colour is known. Gradient text has no single colour to
 * exclude, so its glyphs cannot be told from its ground here; those stay reported as
 * unmeasurable rather than guessed at.
 */
function worstGround(rects, textRgb, textL) {
  const ratios = [];
  for (const rc of rects) {
    /* A few pixels of air around the text. On a 10.5px chip the glyphs fill their own
       line box, and once the fringe is grown away the only "ground" left is the inside
       of letter counters — which is fringe all the way through. Sampling just outside
       the text finds the actual fill. Kept small so it cannot reach a chip's border. */
    const pad = 3;
    const x0 = Math.max(0, rc.x - pad), y0 = Math.max(0, rc.y - pad);
    const x1 = Math.min(info.width, rc.x + rc.w + pad);
    const y1 = Math.min(info.height, rc.y + rc.h + pad);
    const w = x1 - x0, h = y1 - y0;
    if (w < 3 || h < 3) continue;

    /* Mark the glyph bodies, then GROW the mark by two pixels.
       Colour distance alone is not enough: an antialiased edge is a ramp from the text
       colour to the ground, so its outer half survives any threshold that does not cut
       into the glyph itself — and being nearly text-coloured, it then reports as a
       ground with almost no contrast. Left in, it produced 56 failures at 2.5–4:1 on
       cards whose real contrast is over 10:1. The fringe is a rendering artefact of
       the text; it is not a ground anyone reads against. */
    const glyph = new Uint8Array(w * h);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = ((py + y0) * info.width + (px + x0)) * ch;
        const d = Math.max(
          Math.abs(raw[i] - textRgb[0]),
          Math.abs(raw[i + 1] - textRgb[1]),
          Math.abs(raw[i + 2] - textRgb[2]),
        );
        if (d <= 60) glyph[py * w + px] = 1;
      }
    }
    const R = 2;
    const grown = new Uint8Array(w * h);
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (!glyph[py * w + px]) continue;
        for (let dy = -R; dy <= R; dy++) {
          const ny = py + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -R; dx <= R; dx++) {
            const nx = px + dx;
            if (nx < 0 || nx >= w) continue;
            grown[ny * w + nx] = 1;
          }
        }
      }
    }

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        if (grown[py * w + px]) continue;
        const i = ((py + y0) * info.width + (px + x0)) * ch;
        ratios.push(ratio(textL, lum([raw[i], raw[i + 1], raw[i + 2]])));
      }
    }
  }
  if (ratios.length < 40) return null;
  ratios.sort((a, b) => a - b);
  return ratios[Math.floor(ratios.length * 0.05)];
}

/**
 * Worst realistic contrast of painted glyphs against their ground.
 *
 * For gradient text there is no single declared colour to composite — the fill varies
 * across the glyphs — so measure the pixels. Everything far enough from the modal
 * background is glyph; take a low percentile of those ratios so the answer reflects
 * the lightest part of the ramp without being dragged to zero by the antialiased
 * fringe, which is genuinely mid-way between fg and bg and is not what anyone reads.
 */
function glyphRatio(rects, bgRgb) {
  const bgL = lum(bgRgb);

  // First pass: how far from the background does this element's ink actually get?
  let maxD = 0;
  for (const rc of rects) {
    const x1 = Math.min(info.width, rc.x + rc.w), y1 = Math.min(info.height, rc.y + rc.h);
    for (let py = Math.max(0, rc.y); py < y1; py++) {
      for (let px = Math.max(0, rc.x); px < x1; px++) {
        const i = (py * info.width + px) * ch;
        const d = Math.abs(raw[i] - bgRgb[0]) + Math.abs(raw[i + 1] - bgRgb[1]) + Math.abs(raw[i + 2] - bgRgb[2]);
        if (d > maxD) maxD = d;
      }
    }
  }
  if (maxD < 60) return null;

  /* Second pass: keep only pixels at >=65% of that distance — i.e. glyph CORE.
     A fixed cutoff let partially-covered antialiased pixels through, and their share
     of the box roughly doubles as type gets smaller, so the same colour scored worse
     at 34px than at 65px purely from edge fringe. */
  const cut = maxD * 0.65;
  const ratios = [];
  for (const rc of rects) {
    const x1 = Math.min(info.width, rc.x + rc.w), y1 = Math.min(info.height, rc.y + rc.h);
    for (let py = Math.max(0, rc.y); py < y1; py++) {
      for (let px = Math.max(0, rc.x); px < x1; px++) {
        const i = (py * info.width + px) * ch;
        const d = Math.abs(raw[i] - bgRgb[0]) + Math.abs(raw[i + 1] - bgRgb[1]) + Math.abs(raw[i + 2] - bgRgb[2]);
        if (d < cut) continue;
        ratios.push(ratio(lum([raw[i], raw[i + 1], raw[i + 2]]), bgL));
      }
    }
  }
  if (ratios.length < 30) return null;
  ratios.sort((a, b) => a - b);
  return ratios[Math.floor(ratios.length * 0.1)];
}

/** WCAG "large text": >=24px, or >=18.66px when bold. */
const isLarge = (size, weight) => size >= 24 || (size >= 18.66 && weight >= 700);
const threshold = (size, weight) => (isLarge(size, weight) ? 3 : 4.5);

const rows = [];
const exempted = [];
const unmeasurable = [];
for (const e of els) {
  if (e.exempt) { exempted.push(e); continue; }
  const fg = parseColor(e.color);
  if (!fg && !e.clipText) continue;
  /* Gradient text has no single painted colour to exclude, so it keeps the plain
     mode — glyphRatio below measures those off the pixels anyway. */
  const bg = modalBg(e.rects, e.clipText || !fg || fg.a < 0.9 ? null : fg.rgb);
  /* No dominant ground — a photograph, a gradient wash, a dense chip row. Text whose
     painted colour is known gets measured against the worst of its real grounds
     instead; the rest are COUNTED and named, because silently dropping them turns
     "no failures found" into "none in the parts we could read". */
  if (!bg || bg.share < 0.25) {
    if (!fg || e.clipText || fg.a < 0.9) { unmeasurable.push(e); continue; }
    const r2 = worstGround(e.rects, fg.rgb, lum(fg.rgb));
    if (r2 === null) { unmeasurable.push(e); continue; }
    rows.push({ ...e, r: r2, need: threshold(e.size, e.weight), busy: true });
    continue;
  }

  let r;
  if (e.clipText) {
    r = glyphRatio(e.rects, bg.rgb);
    if (r === null) continue;
  } else {
    const composited = fg.rgb.map((v, i) => v * fg.a + bg.rgb[i] * (1 - fg.a));
    r = ratio(lum(composited), lum(bg.rgb));
  }

  rows.push({ ...e, r, need: threshold(e.size, e.weight), large: isLarge(e.size, e.weight) });
}

const fails = rows.filter((x) => x.r < x.need).sort((a, b) => a.r - b.r);

console.log(`\n  ${url}  @ ${VW}x${VH}`);
console.log(`  ${rows.length} text elements measured against the rendered pixels`);
if (exempted.length) {
  console.log(`  ${exempted.length} skipped as declared logotypes: ` +
    exempted.map((e) => JSON.stringify(e.text)).join(", "));
}
if (unmeasurable.length) {
  console.log(`  ${unmeasurable.length} UNMEASURABLE — no dominant ground, judge these by eye:`);
  /* "…and 26 more" is fine as a summary and useless as a work list — these are
     exactly the runs a human has to check, so --all prints every one of them. */
  const shown = args.includes('--all') ? unmeasurable : unmeasurable.slice(0, 12);
  for (const e of shown) {
    console.log(`     ${e.sel}  ${JSON.stringify(e.text)}`);
  }
  if (shown.length < unmeasurable.length) {
    console.log(`     …and ${unmeasurable.length - shown.length} more (--all to list them)`);
  }
}
console.log('  ' + '-'.repeat(78));
if (!fails.length) {
  console.log('  PASS — every text run clears its AA threshold.');
  const tight = rows.sort((a, b) => a.r / a.need - b.r / b.need).slice(0, Number(flag('worst', 0)));
  if (tight.length) {
    console.log('\n  tightest margins:');
    for (const t of tight) {
      console.log(`   ${t.r.toFixed(2)}:1 / ${t.need}  ${String(t.size) + 'px'}  ${t.sel}  "${t.text}"`);
    }
  }
  console.log('');
} else {
  console.log(`  ${fails.length} BELOW THRESHOLD:\n`);
  for (const f of fails) {
    console.log(`  ${f.r.toFixed(2)}:1  (needs ${f.need})  ${f.size}px${f.weight >= 700 ? ' bold' : ''}`);
    console.log(`     ${f.sel}  "${f.text}"`);
    console.log(`     color ${f.color}  at ${f.x},${f.y}`);
  }
  console.log('');
}
process.exit(fails.length ? 1 : 0);
