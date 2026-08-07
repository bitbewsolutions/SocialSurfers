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

// fire every reveal, or half the page measures as transparent-on-transparent
await send('Runtime.evaluate', {
  awaitPromise: true,
  expression: `(async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    document.documentElement.style.scrollBehavior = 'auto';
    const step = Math.round(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y); await pause(150);
    }
    scrollTo(0, 0); await pause(600);
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
      const r = el.getBoundingClientRect();
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
        x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY),
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

/** Most common pixel in the box = the ground the glyphs sit on. */
function modalBg(x, y, bw, bh) {
  const counts = new Map();
  const x1 = Math.min(info.width, x + bw), y1 = Math.min(info.height, y + bh);
  let n = 0;
  for (let py = Math.max(0, y); py < y1; py++) {
    for (let px = Math.max(0, x); px < x1; px++) {
      const i = (py * info.width + px) * ch;
      // quantise so anti-aliasing noise doesn't split the mode across neighbours
      const key = ((raw[i] >> 2) << 12) | ((raw[i + 1] >> 2) << 6) | (raw[i + 2] >> 2);
      counts.set(key, (counts.get(key) || 0) + 1);
      n++;
    }
  }
  if (!n) return null;
  let best = null, bestC = 0;
  for (const [k, c] of counts) if (c > bestC) { bestC = c; best = k; }
  return {
    rgb: [((best >> 12) & 63) << 2, ((best >> 6) & 63) << 2, (best & 63) << 2],
    share: bestC / n,
  };
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
function glyphRatio(x, y, bw, bh, bgRgb) {
  const bgL = lum(bgRgb);
  const x1 = Math.min(info.width, x + bw), y1 = Math.min(info.height, y + bh);

  // First pass: how far from the background does this element's ink actually get?
  let maxD = 0;
  for (let py = Math.max(0, y); py < y1; py++) {
    for (let px = Math.max(0, x); px < x1; px++) {
      const i = (py * info.width + px) * ch;
      const d = Math.abs(raw[i] - bgRgb[0]) + Math.abs(raw[i + 1] - bgRgb[1]) + Math.abs(raw[i + 2] - bgRgb[2]);
      if (d > maxD) maxD = d;
    }
  }
  if (maxD < 60) return null;

  /* Second pass: keep only pixels at >=65% of that distance — i.e. glyph CORE.
     A fixed cutoff let partially-covered antialiased pixels through, and their share
     of the box roughly doubles as type gets smaller, so the same colour scored worse
     at 34px than at 65px purely from edge fringe. */
  const cut = maxD * 0.65;
  const ratios = [];
  for (let py = Math.max(0, y); py < y1; py++) {
    for (let px = Math.max(0, x); px < x1; px++) {
      const i = (py * info.width + px) * ch;
      const d = Math.abs(raw[i] - bgRgb[0]) + Math.abs(raw[i + 1] - bgRgb[1]) + Math.abs(raw[i + 2] - bgRgb[2]);
      if (d < cut) continue;
      ratios.push(ratio(lum([raw[i], raw[i + 1], raw[i + 2]]), bgL));
    }
  }
  if (ratios.length < 30) return null;
  ratios.sort((a, b) => a - b);
  return ratios[Math.floor(ratios.length * 0.1)];
}

const rows = [];
const exempted = [];
for (const e of els) {
  if (e.exempt) { exempted.push(e); continue; }
  const fg = parseColor(e.color);
  if (!fg && !e.clipText) continue;
  const bg = modalBg(e.x, e.y, e.w, e.h);
  if (!bg || bg.share < 0.25) continue; // too busy to judge (images, dense chips)

  let r;
  if (e.clipText) {
    r = glyphRatio(e.x, e.y, e.w, e.h, bg.rgb);
    if (r === null) continue;
  } else {
    const composited = fg.rgb.map((v, i) => v * fg.a + bg.rgb[i] * (1 - fg.a));
    r = ratio(lum(composited), lum(bg.rgb));
  }

  // WCAG "large text": >=24px, or >=18.66px when bold
  const large = e.size >= 24 || (e.size >= 18.66 && e.weight >= 700);
  const need = large ? 3 : 4.5;
  rows.push({ ...e, r, need, large });
}

const fails = rows.filter((x) => x.r < x.need).sort((a, b) => a.r - b.r);

console.log(`\n  ${url}  @ ${VW}x${VH}`);
console.log(`  ${rows.length} text elements measured against the rendered pixels`);
if (exempted.length) {
  console.log(`  ${exempted.length} skipped as declared logotypes: ` +
    exempted.map((e) => JSON.stringify(e.text)).join(", "));
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
