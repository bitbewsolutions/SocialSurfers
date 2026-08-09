/**
 * Enquiry intake — the site's only server-side code.
 *
 * One endpoint, two destinations: the enquiry is appended to the client's Google
 * Sheet (the record he reviews) and an email is sent to him (the alert that makes
 * him look at it). Both matter and they are not interchangeable — nobody opens a
 * spreadsheet unprompted, and nobody keeps a pipeline in their inbox.
 *
 * ── why a function at all ──────────────────────────────────────────────────────
 * The site is static and a static site cannot hold a secret: anything reachable
 * from the browser is in the bundle, and `PUBLIC_*` is in the bundle by definition.
 * Posting to the Apps Script Web App directly from the page would have published a
 * write endpoint to the client's spreadsheet, with no way to rotate it short of
 * redeploying the script. Here the URL and its token live in Netlify env vars and
 * the browser only ever sees `/api/enquiry` on our own origin — which also means no
 * CORS preflight, and no third-party request on the visitor's critical path.
 *
 * This does NOT make the site an SSR app. Netlify Functions deploy alongside a
 * static publish directory; `output` stays `static` and no Astro adapter is
 * involved. Do not add one to make this work.
 *
 * ── environment ───────────────────────────────────────────────────────────────
 *   SHEET_WEBHOOK_URL     Apps Script /exec URL          (optional*)
 *   SHEET_WEBHOOK_TOKEN   shared secret, must match Code.gs
 *   RESEND_API_KEY        Resend key                     (optional*)
 *   NOTIFY_TO             where alerts go                (default below)
 *   NOTIFY_FROM           verified Resend sender         (default below)
 *
 * * Optional individually, not collectively. With neither configured the function
 *   refuses the request rather than accepting a lead it has nowhere to put — a form
 *   that returns success and drops the submission is worse than one that is
 *   visibly not wired up yet. Leave PUBLIC_FORM_ENDPOINT unset until one of them
 *   is; the form then falls back to the visitor's mail client on its own.
 */

export const config = { path: '/api/enquiry' };

const NOTIFY_TO_DEFAULT = 'socialsurfersmedia@gmail.com';
const NOTIFY_FROM_DEFAULT = 'Social Surfers <enquiries@socialsurfers.in>';

/* Length caps are the cheapest defence there is. They are generous enough that no
   real enquiry hits them and small enough that nobody pastes a novel into the
   client's spreadsheet. */
const LIMITS = { name: 80, business: 120, phone: 24, email: 160, message: 2000 };

/* A human cannot read the section, decide to enquire and fill four fields in under
   two and a half seconds. A script fills them instantly. This is not rate limiting
   — a stateless function cannot rate limit without a store — but it costs nothing
   and stops the traffic that a public form actually attracts. */
const MIN_FILL_MS = 2500;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Digits only, with India assumed for a bare 10-digit number — for the wa.me link. */
function waNumber(phone) {
  const d = phone.replace(/\D+/g, '');
  if (!d) return '';
  if (d.length === 10) return '91' + d;
  return d.replace(/^0+/, '');
}

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function validate(body) {
  const out = {
    name: str(body.name),
    business: str(body.business),
    phone: str(body.phone),
    email: str(body.email),
    message: str(body.message),
    page: str(body.page).slice(0, 200),
  };

  const missing = ['name', 'business', 'phone'].filter((k) => !out[k]);
  if (missing.length) return { error: `missing: ${missing.join(', ')}` };

  for (const [k, max] of Object.entries(LIMITS)) {
    if (out[k].length > max) return { error: `${k} too long` };
  }
  /* Not a phone-number parser — just enough digits that a typo is caught and a
     bot posting "phone: test" is not. Real numbers arrive in a dozen formats and
     rejecting an unfamiliar one costs a lead. */
  if (waNumber(out.phone).length < 8) return { error: 'phone does not look like a number' };
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) {
    return { error: 'email does not look like an address' };
  }
  return { value: out };
}

/**
 * Append to the sheet through the Apps Script Web App.
 *
 * Apps Script answers a POST with a 302 to script.googleusercontent.com; fetch
 * follows it, so the body we read is the real one. It also answers 200 for
 * application errors, which is why the parsed `ok` is checked rather than the
 * status — a rejected token would otherwise look like a successful write.
 */
async function appendToSheet(record) {
  const res = await fetch(process.env.SHEET_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: process.env.SHEET_WEBHOOK_TOKEN, ...record }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`sheet HTTP ${res.status}: ${text.slice(0, 200)}`);
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error(`sheet non-JSON: ${text.slice(0, 200)}`); }
  if (!parsed.ok) throw new Error(`sheet refused: ${parsed.error || 'unknown'}`);
}

/**
 * Alert the client.
 *
 * `reply_to` is the lead's own address when they gave one, so hitting Reply in
 * Gmail answers the customer rather than a no-reply mailbox. The WhatsApp deep
 * link is there because for this business that is the channel that actually
 * converts — it is one tap from the notification to a conversation.
 */
async function notify(record) {
  const wa = waNumber(record.phone);
  const rows = [
    ['Name', record.name],
    ['Business', record.business],
    ['Phone', record.phone],
    ['Email', record.email || '—'],
    ['Needs', record.message || '—'],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#6b6480;font:600 11px/1.4 system-ui,sans-serif;` +
        `letter-spacing:.08em;text-transform:uppercase;vertical-align:top;white-space:nowrap">${k}</td>` +
        `<td style="padding:6px 0;color:#16102b;font:400 15px/1.5 system-ui,sans-serif">${escapeHtml(v)}</td></tr>`,
    )
    .join('');

  const html =
    `<div style="max-width:520px;margin:0 auto;padding:28px 24px;font-family:system-ui,sans-serif">` +
    `<p style="margin:0 0 4px;font:700 11px/1 system-ui,sans-serif;letter-spacing:.18em;` +
    `text-transform:uppercase;color:#c41b6e">New enquiry</p>` +
    `<h1 style="margin:0 0 20px;font:800 24px/1.2 system-ui,sans-serif;color:#16102b">` +
    `${escapeHtml(record.business)}</h1>` +
    `<table style="border-collapse:collapse;width:100%">${rows}</table>` +
    (wa
      ? `<p style="margin:24px 0 0"><a href="https://wa.me/${wa}" ` +
        `style="display:inline-block;padding:12px 22px;border-radius:999px;background:#c41b6e;` +
        `color:#fff;font:700 12px/1 system-ui,sans-serif;letter-spacing:.08em;` +
        `text-transform:uppercase;text-decoration:none">WhatsApp ${escapeHtml(record.name)}</a></p>`
      : '') +
    `<p style="margin:22px 0 0;font:400 12px/1.5 system-ui,sans-serif;color:#6b6480">` +
    `Sent from the enquiry form on socialsurfers.in. It is also in the leads sheet.</p></div>`;

  const text = [
    `New enquiry — ${record.business}`,
    '',
    `Name:     ${record.name}`,
    `Business: ${record.business}`,
    `Phone:    ${record.phone}`,
    `Email:    ${record.email || '—'}`,
    `Needs:    ${record.message || '—'}`,
    wa ? `\nWhatsApp: https://wa.me/${wa}` : '',
  ].join('\n');

  const payload = {
    from: process.env.NOTIFY_FROM || NOTIFY_FROM_DEFAULT,
    to: [process.env.NOTIFY_TO || NOTIFY_TO_DEFAULT],
    subject: `New enquiry — ${record.business} (${record.name})`,
    html,
    text,
  };
  if (record.email) payload.reply_to = record.email;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only' });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: 'expected JSON' });
  }

  /* Both bot checks answer 200. Telling a script which of its tricks was spotted
     is free tuning information; a plain success teaches it nothing and it moves on. */
  if (str(body.website)) return json(200, { ok: true });
  const elapsed = Number(body.elapsed);
  if (Number.isFinite(elapsed) && elapsed < MIN_FILL_MS) return json(200, { ok: true });

  const { value, error } = validate(body);
  if (error) return json(422, { ok: false, error });

  const record = { received: new Date().toISOString(), ...value };

  /* Deliberately no IP address. It would be the only thing here the client cannot
     act on, it is the one field that turns this from a contact record into
     personal data he is now responsible for, and Netlify already logs it for the
     abuse case it would exist for. */

  const tasks = [];
  if (process.env.SHEET_WEBHOOK_URL) tasks.push(['sheet', appendToSheet(record)]);
  if (process.env.RESEND_API_KEY) tasks.push(['email', notify(record)]);

  if (!tasks.length) {
    console.error('enquiry: no destination configured — set SHEET_WEBHOOK_URL and/or RESEND_API_KEY');
    return json(503, { ok: false, error: 'not configured' });
  }

  const results = await Promise.allSettled(tasks.map(([, p]) => p));
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? `${tasks[i][0]}: ${r.reason?.message || r.reason}` : null))
    .filter(Boolean);

  /* Succeed if EITHER destination took it. The two are independent copies, so one
     of them working means the lead is not lost, and failing the visitor at that
     point would send them away from a form that did in fact reach the client.
     Both failing is a real outage and says so, which is what puts the WhatsApp
     fallback message on screen. */
  if (failed.length === results.length) {
    console.error('enquiry FAILED:', failed.join(' | '));
    return json(502, { ok: false, error: 'could not record the enquiry' });
  }
  if (failed.length) console.error('enquiry partial:', failed.join(' | '));

  return json(200, { ok: true });
};
