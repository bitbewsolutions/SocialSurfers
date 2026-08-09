# Going live: leads, email, deploy

Everything in code is done and tested. What is left is account work — three logins,
about 40 minutes, most of it waiting for DNS.

**Do the steps in order.** Step 5 is the switch that sends real enquiries down this
path, and until you set it the form falls back to opening the visitor's mail client
with the fields filled in. That fallback is a working form, so nothing is broken
while you are part-way through. Turning the switch on *before* a destination exists
is the one way to have a form that looks fine and drops leads.

---

## The flow, once it is running

```
  visitor fills the form
          │
          ▼
  POST /api/enquiry            ← Netlify Function, same origin as the site
          │
          ├──▶ Apps Script /exec ──▶ new row in the Leads sheet
          │
          └──▶ Resend ──▶ email in the client's inbox
```

**Yes — it is permanent and automatic.** Once deployed there is nothing to run,
nothing to re-authorise on a schedule and nothing to keep open. Every submission
appends a row, forever, whether or not anyone is looking. The sheet is the record;
the email is what makes him look at it.

Two things that would stop it, both of them deliberate acts:

- Deleting the Apps Script deployment, or the sheet it lives in.
- Rotating `SHEET_WEBHOOK_TOKEN` on one side and not the other.

Volume is a non-issue at this scale. A row append takes well under a second, against
an Apps Script daily runtime budget measured in hours.

---

## 1 · The leads sheet

In the Google account that should **own the data** — see the note at the bottom about
which account that is.

1. New Google Sheet. Name it `Social Surfers — Leads`.
2. **Extensions → Apps Script.** A new tab opens with an empty `Code.gs`.
3. Delete the placeholder `myFunction`. Paste the entire contents of
   [`netlify/sheet.gs`](netlify/sheet.gs) from this repo.
4. Replace the `TOKEN` line at the top with a long random string:

   ```js
   const TOKEN = 'a-long-random-string-from-your-password-manager';
   ```

   Keep it somewhere — it goes into Netlify unchanged in step 4. It is never typed by
   a human, so make it long and ugly.
5. Save (Ctrl+S). Name the project anything.
6. In the function dropdown at the top pick **`setup`**, then **Run**.

   Google will ask for permission. It will also show *"Google hasn't verified this
   app"* — that warning is for apps asking for **your** data on someone else's behalf;
   this is your own script in your own spreadsheet. Click **Advanced → Go to
   \<project name\> (unsafe)** and allow.

   Do this now rather than skipping it. Authorising here is what stops the first real
   enquiry being the thing that discovers an unapproved script.
7. Back in the sheet you should now see a **Leads** tab with a frozen bold header row.
   If you do, the script can write. That is the only thing worth verifying here.

### Deploy it as an endpoint

8. **Deploy → New deployment.** Click the gear next to "Select type" → **Web app**.
9. Set:

   | | |
   |---|---|
   | Description | `enquiry intake` |
   | Execute as | **Me** |
   | Who has access | **Anyone** |

   **"Anyone" is required and is not the security hole it looks like.** Netlify cannot
   hold a Google login, so the endpoint has to be reachable without one. What protects
   it is that the URL is a secret held server-side and every request must carry the
   token. Nothing in the browser ever sees either. Without the token the script
   refuses and writes nothing.
10. **Deploy**, then copy the **Web app URL**. It ends in `/exec`. That is
    `SHEET_WEBHOOK_URL`.

> **If you ever edit the script:** Apps Script serves the version you *deployed*, not
> the one in the editor. Saving changes nothing. You must do
> **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. This is the
> reason an Apps Script fix usually appears not to work.

---

## 2 · Netlify

If the site is not connected yet:

1. **Add new site → Import an existing project** → GitHub → this repo.
2. Netlify reads `netlify.toml`, so build command, publish directory and the functions
   folder are already correct. Don't override them in the UI — the file is the source
   of truth so a rebuild can't quietly differ.
3. Deploy. The site will be live at `<something>.netlify.app` immediately; the form
   still uses the mail-client fallback because step 5 has not happened.

### Domain

4. **Domain management → Add a domain** → `socialsurfers.in`.
5. Set **`www.socialsurfers.in` as the primary** — it must match `site:` in
   `astro.config.mjs` — and let the apex redirect to it.
6. At **GoDaddy**, add the records Netlify shows you: an `A` record for the apex, and
   `CNAME www → <site>.netlify.app`. **Leave the nameservers at GoDaddy.** You are
   pointing records, not transferring anything.
7. Wait for the padlock. Netlify issues the certificate itself once DNS resolves,
   usually minutes, occasionally an hour.

---

## 3 · Resend

Optional in the sense that the sheet works without it. Not optional in practice —
nobody opens a spreadsheet unprompted.

1. Sign up, **Domains → Add domain** → `socialsurfers.in`.
2. Resend prints a set of DNS records (DKIM, SPF, and usually a DMARC suggestion).
   Add them at **GoDaddy**, alongside the Netlify records — they don't conflict.
3. Wait for the domain to read **Verified**. Usually minutes.
4. **API Keys → Create**, with *Sending access*. Copy it once; you cannot see it again.

> **The trap here:** an unverified sender fails in production and passes every test you
> run first, because Resend will happily send from `onboarding@resend.dev` — but only
> to your own account address. If `NOTIFY_FROM` is on an unverified domain, you will
> see it work in testing and silently fail for real leads. Wait for **Verified**.

---

## 4 · Environment variables

**Netlify → Site configuration → Environment variables.** Add these four (or six):

| key | value |
|---|---|
| `SHEET_WEBHOOK_URL` | the `/exec` URL from step 1.10 |
| `SHEET_WEBHOOK_TOKEN` | the same string you put in `TOKEN` |
| `RESEND_API_KEY` | from step 3.4 |
| `NOTIFY_FROM` | `Social Surfers <enquiries@socialsurfers.in>` |
| `NOTIFY_TO` | where the alert lands — his working inbox |

`NOTIFY_FROM` does **not** need to be a mailbox that exists. It only needs to be on the
verified domain. Replies go to the lead's own address anyway, because the function sets
`reply_to`.

`.env.example` in the repo lists all of these with the same notes.

---

## 5 · The switch

Last. Add one more environment variable:

| key | value |
|---|---|
| `PUBLIC_FORM_ENDPOINT` | `/api/enquiry` |

Then **Deploys → Trigger deploy → Clear cache and deploy site.** Env vars are read at
build time for anything `PUBLIC_*`, so an existing deploy will not pick this up on its
own.

---

## 6 · Prove it works

Fill the real form on the live site with your own details. Then check, in order:

1. **A row appears in the sheet**, within a second or two.
2. **The email arrives**, and hitting Reply addresses *you*, not a no-reply.
3. **Netlify → Functions → `enquiry`** shows the invocation. If something failed, the
   log line names which half — `sheet:` or `email:` — and why.

Do not skip 3 when 1 and 2 look fine. The function returns success if *either*
destination accepted the lead, so a working email can mask a broken sheet.

If nothing arrives at all, work backwards: `PUBLIC_FORM_ENDPOINT` set? deploy rebuilt
after setting it? token identical on both sides? Apps Script deployed as a *new
version* after the last edit?

Before touching production, `npm run test:enquiry` runs the whole function against a
fake sheet and a fake Resend — 34 assertions, no credentials, nothing deployed. If that
passes and production doesn't, the fault is configuration, not code.

---

## Decisions worth making on purpose

**Who owns the sheet.** Whoever creates it keeps it if the relationship ends. It should
almost certainly be the **client's** Google account, with you added as an editor. The
reverse is easier today and worse later — and "later" is exactly when it matters.

**What he does with it.** The sheet ships with empty **Status** and **Notes** columns.
The script only ever appends, so anything he types there is safe and no later
submission can overwrite it. Worth showing him once: filter by Status, and it is a
pipeline rather than a list.

**What is not stored.** No IP addresses. It is the one field he cannot act on and the
one that turns a contact record into personal data he is responsible for.
