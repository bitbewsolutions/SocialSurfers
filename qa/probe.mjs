/** Evaluate an expression in the built page and print the result + any console errors. */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'http://localhost:4321/';
const expr = process.argv[3] || '1';

const chromePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const port = 9800 + Math.floor(Math.random() * 300);
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${path.join(process.env.TEMP || '/tmp', 'ss-probe-' + port)}`,
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 60 && !wsUrl; i++) {
  try {
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    wsUrl = tabs.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
  } catch {}
  if (!wsUrl) await sleep(250);
}

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let id = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled')
    logs.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? '?').join(' '));
  if (m.method === 'Runtime.exceptionThrown')
    logs.push('[EXCEPTION] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Log.entryAdded') logs.push(`[${m.params.entry.level}] ${m.params.entry.text}`);
});
const send = (method, params = {}) =>
  new Promise((res) => { pending.set(++id, res); ws.send(JSON.stringify({ id, method, params })); });

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(3000);

// walk the page so observers fire, same as the shot tool.
// --nowalk skips it: the walk ends at scrollTo(0,0), which destroys exactly the
// state you need when what you're measuring IS the load-time scroll position.
const walk = !process.argv.includes('--nowalk');
if (walk) await send('Runtime.evaluate', {
  awaitPromise: true,
  expression: `(async()=>{const p=(m)=>new Promise(r=>setTimeout(r,m));
    document.documentElement.style.scrollBehavior='auto';
    for(let y=0;y<document.documentElement.scrollHeight;y+=innerHeight*0.75){scrollTo(0,y);await p(160);}
    scrollTo(0,0);await p(400);
    document.documentElement.style.scrollBehavior='';})()`,
});

const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
console.log('RESULT:', JSON.stringify(r.result?.result?.value ?? r.result?.result?.description, null, 2));
if (logs.length) { console.log('\nCONSOLE:'); logs.forEach((l) => console.log('  ' + l)); }
else console.log('\nCONSOLE: (clean)');

ws.close(); chrome.kill(); process.exit(0);
