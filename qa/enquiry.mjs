/**
 * Contract test for netlify/functions/enquiry.mjs — `node qa/enquiry.mjs`.
 *
 * The rest of the QA tools drive a browser, because the rest of the site IS the
 * browser. This one file is the exception: it is the only server-side code in the
 * project, it holds the client's leads, and the ways it fails are exactly the ways
 * nobody notices — a submission silently dropped, a rejected token counted as a
 * successful write, a bot filter that also rejects real people.
 *
 * So it runs the real handler against a fake Apps Script and a fake Resend on
 * localhost. Nothing is deployed, no credentials are needed, and every branch is
 * exercised including the degraded ones, which are otherwise only reachable in
 * production during an outage.
 *
 * Run it after touching the function, the Apps Script contract, or the form's
 * submit handler. Exits non-zero on failure.
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const captured = { sheet: [], mail: [] };
let sheetMode = 'ok';   // ok | badtoken | 500
let mailMode = 'ok';    // ok | 401

const fake = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = JSON.parse(Buffer.concat(chunks).toString() || '{}');

  if (req.url.startsWith('/exec')) {
    if (sheetMode === '500') { res.writeHead(500); return res.end('boom'); }
    if (sheetMode === 'badtoken' || body.token !== 'shhh') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'bad token' }));
    }
    captured.sheet.push(body);
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (req.url.startsWith('/emails')) {
    if (mailMode === '401') { res.writeHead(401); return res.end('bad key'); }
    captured.mail.push({ body, auth: req.headers.authorization });
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ id: 'x' }));
  }
  res.writeHead(404); res.end();
});
await new Promise((r) => fake.listen(0, r));
const base = `http://127.0.0.1:${fake.address().port}`;

process.env.SHEET_WEBHOOK_URL = `${base}/exec`;
process.env.SHEET_WEBHOOK_TOKEN = 'shhh';
process.env.RESEND_API_KEY = 'test-key';

// point the handler's hard-coded Resend host at the fake
const realFetch = globalThis.fetch;
globalThis.fetch = (url, init) =>
  realFetch(String(url).replace('https://api.resend.com', base), init);

const here = path.dirname(fileURLToPath(import.meta.url));
const { default: handler } = await import(
  pathToFileURL(path.join(here, '..', 'netlify', 'functions', 'enquiry.mjs')).href
);

const post = (body, method = 'POST') =>
  handler(new Request('https://x/api/enquiry', {
    method,
    headers: { 'content-type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  }));

const good = {
  name: 'Rahul Sharma', business: 'BEES Fitness+', phone: '+91 98765 43210',
  email: 'rahul@bees.in', message: 'Instagram + reels for a new branch',
  elapsed: 42000, page: '/',
};

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ok    ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} ${extra}`); }
};
const j = async (r) => [r.status, await r.json()];

console.log('\nhappy path');
{
  const [s, b] = await j(await post(good));
  check('200 + ok', s === 200 && b.ok === true, `got ${s} ${JSON.stringify(b)}`);
  check('row appended', captured.sheet.length === 1);
  const row = captured.sheet[0];
  check('token forwarded', row.token === 'shhh');
  check('fields intact', row.name === 'Rahul Sharma' && row.business === 'BEES Fitness+');
  check('received stamped', typeof row.received === 'string' && row.received.endsWith('Z'));
  check('no ip stored', !('ip' in row), JSON.stringify(Object.keys(row)));
  const m = captured.mail[0];
  check('email sent', !!m);
  check('bearer key', m.auth === 'Bearer test-key');
  check('reply_to is the lead', m.body.reply_to === 'rahul@bees.in');
  check('subject names the business', m.body.subject.includes('BEES Fitness+'));
  check('wa link normalised', m.body.text.includes('wa.me/919876543210'), m.body.text);
}

console.log('\nbots');
{
  captured.sheet.length = 0; captured.mail.length = 0;
  const [s1, b1] = await j(await post({ ...good, website: 'http://spam' }));
  check('honeypot -> silent 200', s1 === 200 && b1.ok === true);
  const [s2, b2] = await j(await post({ ...good, elapsed: 800 }));
  check('too fast -> silent 200', s2 === 200 && b2.ok === true);
  check('neither reached a destination', captured.sheet.length === 0 && captured.mail.length === 0);
  const [s3] = await j(await post({ ...good, elapsed: undefined }));
  check('missing elapsed still accepted', s3 === 200);
}

console.log('\nvalidation');
{
  captured.sheet.length = 0;
  const cases = [
    ['no name', { ...good, name: '' }],
    ['no business', { ...good, business: '  ' }],
    ['no phone', { ...good, phone: '' }],
    ['phone is words', { ...good, phone: 'call me' }],
    ['bad email', { ...good, email: 'nope@' }],
    ['name too long', { ...good, name: 'x'.repeat(81) }],
    ['message too long', { ...good, message: 'x'.repeat(2001) }],
  ];
  for (const [label, body] of cases) {
    const [s, b] = await j(await post(body));
    check(label + ' -> 422', s === 422 && b.ok === false, `got ${s} ${JSON.stringify(b)}`);
  }
  check('nothing written', captured.sheet.length === 0);

  const [s] = await j(await post(good, 'GET'));
  check('GET -> 405', s === 405);
  const bad = await handler(new Request('https://x/api/enquiry', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: 'not json',
  }));
  check('garbage body -> 400', bad.status === 400);
  const [s2] = await j(await post({ ...good, email: '' }));
  check('email is optional', s2 === 200);
}

console.log('\ndegraded');
{
  captured.sheet.length = 0; captured.mail.length = 0;
  sheetMode = '500';
  const [s1, b1] = await j(await post(good));
  check('sheet down, email up -> still 200', s1 === 200 && b1.ok === true, `got ${s1}`);
  check('email still went', captured.mail.length === 1);

  mailMode = '401';
  const [s2, b2] = await j(await post(good));
  check('both down -> 502', s2 === 502 && b2.ok === false, `got ${s2} ${JSON.stringify(b2)}`);

  sheetMode = 'ok'; mailMode = 'ok';

  /* A rejected token must count as a FAILED write, not a successful one — Apps
     Script answers 200 for application errors, so only the parsed `ok` says so.
     Resend is switched off here to isolate it: with email working the function is
     right to return 200, because the lead did reach the client. */
  const savedKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  captured.sheet.length = 0;
  sheetMode = 'badtoken';
  const [s3] = await j(await post({ ...good }));
  check('rejected token counts as failure', s3 === 502, `got ${s3}`);
  check('nothing appended on bad token', captured.sheet.length === 0);
  sheetMode = 'ok';
  process.env.RESEND_API_KEY = savedKey;

  delete process.env.RESEND_API_KEY;
  captured.sheet.length = 0;
  const [s4] = await j(await post(good));
  check('no Resend key -> sheet only, 200', s4 === 200 && captured.sheet.length === 1);

  delete process.env.SHEET_WEBHOOK_URL;
  const [s5, b5] = await j(await post(good));
  check('nothing configured -> 503', s5 === 503 && b5.error === 'not configured', `got ${s5}`);
}

console.log('\nescaping');
{
  process.env.SHEET_WEBHOOK_URL = `${base}/exec`;
  process.env.RESEND_API_KEY = 'test-key';
  captured.mail.length = 0;
  await post({ ...good, business: '<img src=x onerror=alert(1)>' });
  const html = captured.mail[0].body.html;
  check('html escaped in email', !html.includes('<img src=x') && html.includes('&lt;img'), html.slice(0, 120));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
fake.close();
process.exit(fail ? 1 : 0);
