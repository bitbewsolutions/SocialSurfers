/**
 * Tone-boundary seam check.
 *
 * Walks a vertical line down the rendered page and reports any place where the
 * background colour jumps further in one pixel row than a smooth ramp ever would.
 *
 * This exists because tone transitions have now broken three times, and not once
 * was it visible in the CSS:
 *   - percentage stops drifting with section height (white text on pink, mobile)
 *   - a ramp inside one section instead of straddling the boundary (hard line)
 *   - pixel stops inside a box whose height is a variable, so the ramp was clipped
 *     at 210px on phones and the two halves met at different colours
 *
 * Each was found by eye, on one viewport, after shipping. A ramp is smooth or it
 * is not, and that is a measurable property.
 *
 *   node qa/seams.mjs <url> [--vp 414x896] [--max 14]
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
// (column sampling replaced by per-row modal ground)
const MAX_STEP = Number(flag('max', 14)); // per-row channel delta budget

const chromePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => p && existsSync(p));

const port = 9900 + Math.floor(Math.random() * 90);
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${path.join(process.env.TEMP || '/tmp', 'ss-seam-' + port)}`,
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
let id = 0;
const pending = new Map();
const evs = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  else if (m.method) evs.get(m.method)?.forEach((fn) => fn(m.params));
});
const send = (method, params = {}) =>
  new Promise((res) => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })); });
const once = (m) => new Promise((r) => { if (!evs.has(m)) evs.set(m, []); evs.get(m).push(r); });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: false });
const loaded = once('Page.loadEventFired');
await send('Page.navigate', { url });
await loaded;
await sleep(2600);

// reveal everything, then park at the top so the capture is of a settled page
await send('Runtime.evaluate', {
  awaitPromise: true,
  expression: `(async () => {
    const p = (ms) => new Promise((r) => setTimeout(r, ms));
    document.documentElement.style.scrollBehavior = 'auto';
    for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.7)) {
      scrollTo(0, y); await p(140);
    }
    scrollTo(0, 0); await p(600);
  })()`,
});

const { result: dims } = await send('Runtime.evaluate', {
  expression: 'JSON.stringify({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight})',
  returnByValue: true,
});
const { w, h } = JSON.parse(dims.value);

// Where does each section start? Reported alongside any seam so a failure names
// the boundary rather than just a y coordinate.
const { result: secs } = await send('Runtime.evaluate', {
  returnByValue: true,
  expression: `JSON.stringify([...document.querySelectorAll('main > section, body > footer')].map((s) => ({
    id: s.id || s.className.split(' ')[0], top: Math.round(s.getBoundingClientRect().top + scrollY),
  })))`,
});
const sections = JSON.parse(secs.value);

const { data: png } = await send('Page.captureScreenshot', {
  format: 'png', captureBeyondViewport: true,
  clip: { x: 0, y: 0, width: w, height: Math.min(h, 24000), scale: 1 },
});
ws.close();
chrome.kill();

const { data: raw, info } = await sharp(Buffer.from(png, 'base64')).raw()
  .toBuffer({ resolveWithObject: true });
const ch = info.channels;

/**
 * The GROUND of a row is its most common pixel, not the pixel at some fixed column.
 * A single column inevitably runs through headlines, the hero shader and logo tiles,
 * and every glyph edge it crosses looks exactly like a seam. Text and imagery are a
 * minority of any row; the background is the mode.
 */
function rowGround(y) {
  const counts = new Map();
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * ch;
    // quantise so antialiasing does not split the mode across neighbours
    const key = ((raw[i] >> 2) << 12) | ((raw[i + 1] >> 2) << 6) | (raw[i + 2] >> 2);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = 0, bestC = 0;
  for (const [k, c] of counts) if (c > bestC) { bestC = c; best = k; }
  return {
    rgb: [((best >> 12) & 63) << 2, ((best >> 6) & 63) << 2, (best & 63) << 2],
    share: bestC / info.width,
  };
}

const nearest = (y) =>
  sections.reduce((a, s) => (y >= s.top && s.top >= a.top ? s : a), { id: '(top)', top: -1 });

const grounds = [];
for (let y = 0; y < info.height; y++) grounds.push(rowGround(y));

const delta = (a, b) =>
  Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

/**
 * A hairline is not a seam.
 *
 * Every border, rule and tile edge on the page is a one-pixel excursion: the ground
 * goes A -> B -> A within a couple of rows. A seam is a LEVEL CHANGE — it goes A -> B
 * and stays there. Comparing a few rows either side of a candidate separates the two,
 * and without it the section rules alone raise 40 false alarms.
 */
const SPAN = 5;
const seams = [];
for (let y = 1; y < info.height; y++) {
  const a = grounds[y - 1];
  const b = grounds[y];
  // a row too busy to have a clear ground cannot be judged
  if (a.share < 0.4 || b.share < 0.4) continue;
  if (delta(a.rgb, b.rgb) <= MAX_STEP) continue;

  const before = grounds[Math.max(0, y - 1 - SPAN)];
  const after = grounds[Math.min(info.height - 1, y + SPAN)];
  if (before.share < 0.4 || after.share < 0.4) continue;
  // returned to where it started => a line, not a step
  if (delta(before.rgb, after.rgb) <= MAX_STEP) continue;

  const s = nearest(y);
  seams.push({
    y, step: delta(before.rgb, after.rgb),
    from: before.rgb, to: after.rgb,
    section: s.id, offset: y - s.top,
  });
}

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

console.log(`\n  ${url}  @ ${VW}x${VH}`);
console.log(`  scanned ${info.height} rows, budget ${MAX_STEP}/channel per row`);
console.log('  ' + '-'.repeat(72));

if (!seams.length) {
  console.log('  PASS — no hard step anywhere down the page.\n');
} else {
  // group adjacent rows; one edge often trips two or three
  const groups = [];
  for (const s of seams) {
    const last = groups[groups.length - 1];
    if (last && s.y - last.at(-1).y <= 2) last.push(s);
    else groups.push([s]);
  }
  console.log(`  ${groups.length} HARD STEP(S):\n`);
  for (const g of groups) {
    const worst = g.reduce((a, b) => (b.step > a.step ? b : a));
    console.log(`  y=${worst.y}  step ${worst.step}  ${hex(worst.from)} -> ${hex(worst.to)}`);
    console.log(`     in "${worst.section}", ${worst.offset}px from its top\n`);
  }
}
process.exit(seams.length ? 1 : 0);
