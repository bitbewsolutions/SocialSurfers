/** Measure what each built page actually costs on the wire (gzip, as a CDN serves it). */
import { readdir, readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const DIST = 'dist';
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => (n / 1024).toFixed(1).padStart(7) + ' KB';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = await walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith('.html'));

// shared assets every page pulls
const assets = files.filter((f) => /\.(css|js|woff2)$/.test(f));
const cssGz = (await Promise.all(assets.filter((f) => f.endsWith('.css')).map(async (f) => gz(await readFile(f))))).reduce((a, b) => a + b, 0);
const jsGz = (await Promise.all(assets.filter((f) => f.endsWith('.js')).map(async (f) => gz(await readFile(f))))).reduce((a, b) => a + b, 0);
const fontBytes = (await Promise.all(assets.filter((f) => f.endsWith('.woff2')).map(async (f) => (await stat(f)).size))).reduce((a, b) => a + b, 0);

console.log('\n  SHARED ASSETS (cached across the whole site)');
console.log('  ' + '-'.repeat(52));
console.log(`  CSS (gzipped)          ${kb(cssGz)}`);
console.log(`  JS  (gzipped)          ${kb(jsGz)}   <- external chunks only`);
console.log(`  Fonts (woff2, precompressed) ${kb(fontBytes)}`);

console.log('\n  PER PAGE (HTML gzipped; inline CSS/JS counted here)');
console.log('  ' + '-'.repeat(52));

let worst = 0;
for (const f of htmlFiles.sort()) {
  const raw = await readFile(f);
  const g = gz(raw);
  const route = '/' + path.relative(DIST, f).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '');
  const first = g + cssGz + jsGz + fontBytes;
  worst = Math.max(worst, first);
  console.log(`  ${route.padEnd(36)} ${kb(g)}   first visit: ${kb(first)}`);
}

console.log('\n  ' + '-'.repeat(52));
console.log(`  Heaviest first visit:  ${kb(worst)}`);
console.log(`  Budget:                ${kb(110 * 1024)} JS + fonts`);
console.log(`  JS actually shipped:   ${kb(jsGz)} external + inline (see per-page)\n`);
