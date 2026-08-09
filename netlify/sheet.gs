/**
 * Leads sheet writer — Google Apps Script.
 *
 * NOT deployed by this repo. This file is the source of truth for a script that
 * lives inside the client's own spreadsheet; it is kept here so the code is in
 * version control instead of only existing in a browser tab nobody can find later.
 *
 * ── install ───────────────────────────────────────────────────────────────────
 *  1. Create a Google Sheet named "Social Surfers — Leads" in the account that
 *     should OWN the data. Owner matters: whoever creates it is who keeps it if
 *     the agency relationship ends, so this should be the client's account, with
 *     the agency added as an editor. (The reverse also works and is easier to set
 *     up today — it is just worth choosing on purpose rather than by accident.)
 *  2. Extensions → Apps Script. Delete the placeholder, paste this file.
 *  3. Put a long random string in TOKEN below — the same one that goes into the
 *     Netlify env var SHEET_WEBHOOK_TOKEN. Anything from a password manager is
 *     fine; it never has to be typed by a human.
 *  4. Run `setup` once from the editor and accept the permission prompt. That
 *     creates the tab and the header row, and is also where Google asks for
 *     consent — do it before deploying, so the first real enquiry is not the
 *     thing that discovers an unapproved script.
 *  5. Deploy → New deployment → type: Web app.
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     "Anyone" is unavoidable — Netlify cannot hold a Google login — which is
 *     exactly why TOKEN exists and why the URL is only ever stored server-side.
 *  6. Copy the /exec URL into the Netlify env var SHEET_WEBHOOK_URL.
 *
 * ── when you edit this ────────────────────────────────────────────────────────
 * Apps Script serves the version you DEPLOYED, not the one in the editor. After
 * any change: Deploy → Manage deployments → edit → Version: New version. Saving
 * alone changes nothing about what the site is talking to, and this is the single
 * most common way an Apps Script "fix" appears not to work.
 */

const TOKEN = 'PASTE-THE-SAME-SECRET-AS-SHEET_WEBHOOK_TOKEN';
const TAB = 'Leads';

const HEADERS = [
  'Received',
  'Name',
  'Business',
  'Phone',
  'Email',
  'What they need',
  'Page',
  'Status',
  'Notes',
];

/** Run once from the editor. Safe to re-run — it will not duplicate the header. */
function setup() {
  const sheet = tab();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(6, 320);
  }
  return sheet.getLastRow();
}

function tab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(TAB) || ss.insertSheet(TAB);
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    /* Constant-ish comparison is pointless here — this is one HTTPS round trip
       away over the public internet and the timing channel is drowned in it. The
       token's job is to make the URL useless on its own, and it does that. */
    if (body.token !== TOKEN) return reply({ ok: false, error: 'bad token' });

    const sheet = tab();
    if (sheet.getLastRow() === 0) setup();

    /* Two blank cells at the end are the point: Status and Notes are HIS columns.
       The script only ever appends, so anything he types there stays put and no
       later submission can overwrite it. */
    sheet.appendRow([
      body.received || new Date().toISOString(),
      body.name || '',
      body.business || '',
      /* A leading apostrophe keeps Sheets from reading "+91 8684-010403" as a
         formula or reformatting it into something that is no longer a phone
         number. It does not appear in the cell, only in the formula bar. */
      "'" + (body.phone || ''),
      body.email || '',
      body.message || '',
      body.page || '',
      '',
      '',
    ]);

    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  }
}

/** Browsing to the /exec URL should say nothing useful. */
function doGet() {
  return reply({ ok: false, error: 'POST only' });
}
