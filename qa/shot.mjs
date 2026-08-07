/**
 * QA screenshot tool — drives headless Chrome over CDP.
 *
 * Why not `chrome --screenshot`: that flag ignores --window-size under display
 * scaling (giving wrong CSS viewports) and its --virtual-time-budget does not
 * advance CSS animations, so every entrance animation screenshots at frame 0.
 * CDP gives exact device metrics and real wall-clock settling.
 *
 * Usage:
 *   node qa/shot.mjs <url> <outDir> [--wait 3500] [--full] [--reduce]
 *   node qa/shot.mjs http://localhost:4321/ qa-shots --wait 4000
 *
 * Scroll-linked sections need to be caught mid-scrub, not at the top:
 *   --at "<selector>" --p 0.55
 * parks the viewport exactly where that element's initSectionProgress() --p would
 * read 0.55, so a screenshot can prove what the reader actually sees at that point.
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

const DEFAULT_VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, mobile: true, dsf: 2 },
  { name: 'tablet', width: 768, height: 1024, mobile: true, dsf: 2 },
  { name: 'desktop', width: 1440, height: 900, mobile: false, dsf: 1 },
];

const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:4321/';
const outDir = args[1] || 'qa-shots';
const flag = (n, d) => {
  const i = args.indexOf('--' + n);
  return i === -1 ? d : args[i + 1];
};
const has = (n) => args.includes('--' + n);
const waitMs = Number(flag('wait', 3500));
const fullPage = has('full');
const reduceMotion = has('reduce');
const prefix = flag('prefix', '');
const atSel = flag('at', '');
const atP = Number(flag('p', 0.5));

// --vp 1200x630[:name] renders a single custom viewport (used for the OG card)
const vpArg = flag('vp', '');
const VIEWPORTS = vpArg
  ? (() => {
      const [dims, name = 'custom'] = vpArg.split(':');
      const [w, h] = dims.split('x').map(Number);
      return [{ name, width: w, height: h, mobile: false, dsf: 1 }];
    })()
  : DEFAULT_VIEWPORTS;

const chromePath = CHROME_CANDIDATES.find((p) => p && existsSync(p));
if (!chromePath) {
  console.error('No Chrome/Edge found.');
  process.exit(1);
}

const port = 9333 + Math.floor(Math.random() * 400);
const userDir = path.join(process.env.TEMP || '/tmp', 'ss-cdp-' + port);

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-first-run',
  '--disable-extensions',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  ...(reduceMotion ? ['--force-prefers-reduced-motion'] : []),
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDir}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const tabs = await res.json();
      const page = tabs.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never came up');
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        this.listeners.get(msg.method)?.forEach((fn) => fn(msg.params));
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }
  once(method) {
    return new Promise((resolve) => this.on(method, resolve));
  }
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
const cdp = new CDP(ws);

await cdp.send('Page.enable');
await cdp.send('Runtime.enable');

await mkdir(outDir, { recursive: true });

for (const vp of VIEWPORTS) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: vp.dsf,
    mobile: vp.mobile,
  });

  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await loaded;
  await sleep(waitMs); // real time, so entrance animations actually finish

  // Walk the page so every IntersectionObserver reveal actually fires, then return
  // to the top. Without this a full-page capture shows every below-fold section at
  // opacity 0 — and we'd be screenshotting the reveal bug rather than the design.
  await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const pause = (ms) => new Promise((r) => setTimeout(r, ms));
      // the site sets scroll-behavior:smooth for anchor links; each scrollTo would
      // animate and be cancelled by the next one, so the walk would never arrive
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      const step = Math.round(innerHeight * 0.75);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await pause(160);
      }
      window.scrollTo(0, 0);
      await pause(500);
      document.documentElement.style.scrollBehavior = prev;
    })()`,
  });

  if (atSel) {
    await cdp.send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async () => {
        const pause = (ms) => new Promise((r) => setTimeout(r, ms));
        document.documentElement.style.scrollBehavior = 'auto';
        const el = document.querySelector(${JSON.stringify(atSel)});
        if (!el) throw new Error('no element for ${atSel}');
        const anchor = innerHeight * (Number(el.dataset.progressAnchor) || 0.62);
        const r = el.getBoundingClientRect();
        // invert p = (anchor - top) / height  ->  the scrollY that lands on it
        const top = r.top + scrollY;
        window.scrollTo(0, Math.round(top - anchor + ${atP} * r.height));
        await pause(400);
      })()`,
    });
  }

  let clip;
  if (fullPage) {
    const { result } = await cdp.send('Runtime.evaluate', {
      expression: `(${() => {
        const d = document.documentElement;
        return JSON.stringify({ w: d.scrollWidth, h: d.scrollHeight });
      }})()`,
      returnByValue: true,
    });
    const { w, h } = JSON.parse(result.value);
    clip = { x: 0, y: 0, width: w, height: Math.min(h, 24000), scale: 1 };
  }

  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: fullPage,
    ...(clip ? { clip } : {}),
  });

  const suffix = reduceMotion ? '-reduced' : '';
  const file = path.join(outDir, `${prefix}${vp.name}${fullPage ? '-full' : ''}${suffix}.png`);
  await writeFile(file, Buffer.from(data, 'base64'));
  console.log(`  ${file}  (${vp.width}x${vp.height}${fullPage ? ' full' : ''})`);
}

ws.close();
chrome.kill();
process.exit(0);
