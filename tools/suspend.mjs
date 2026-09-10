/**
 * Flip the suspension switch without opening an editor.
 *
 *   node tools/suspend.mjs on     → site serves the notice        (npm run site:down)
 *   node tools/suspend.mjs off    → site serves the real site     (npm run site:up)
 *   node tools/suspend.mjs        → print the current state
 *
 * It rewrites exactly one boolean in src/data/suspension.ts and nothing else, so
 * the diff it produces is one line and is safe to read at a glance before pushing.
 * Netlify's SITE_SUSPENDED environment variable, if one is set, still overrides
 * whatever this writes — the script says so rather than letting a push look like
 * it worked and change nothing.
 */
import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../src/data/suspension.ts', import.meta.url);
const LINE = /^(const SUSPENDED_BY_DEFAULT = )(true|false)(;)$/m;

const arg = (process.argv[2] ?? '').toLowerCase();
const source = await readFile(FILE, 'utf8');
const match = source.match(LINE);

if (!match) {
  console.error(
    'tools/suspend.mjs: could not find `const SUSPENDED_BY_DEFAULT = …` in\n' +
      '  src/data/suspension.ts\n' +
      'Edit the boolean there by hand — the file is the source of truth, not this script.',
  );
  process.exit(1);
}

const current = match[2] === 'true';

if (!arg) {
  console.log(`Site is currently ${current ? 'SUSPENDED' : 'LIVE'} (in this checkout).`);
  console.log('Change it with:  npm run site:down   |   npm run site:up');
  process.exit(0);
}

const wanted = { on: true, down: true, off: false, up: false }[arg];
if (wanted === undefined) {
  console.error(`tools/suspend.mjs: expected "on" or "off", got "${arg}".`);
  process.exit(1);
}

if (wanted === current) {
  console.log(`Already ${wanted ? 'SUSPENDED' : 'LIVE'}. Nothing written.`);
} else {
  await writeFile(FILE, source.replace(LINE, `$1${wanted}$3`), 'utf8');
  console.log(`Site is now ${wanted ? 'SUSPENDED' : 'LIVE'} — one line changed in src/data/suspension.ts.`);
}

console.log('\nNext:  git commit -am "' + (wanted ? 'Suspend site' : 'Restore site') + '" && git push');
console.log('Netlify rebuilds on push. If SITE_SUSPENDED is set in the Netlify UI,');
console.log('clear it or set it to match — the environment variable wins over this file.');
