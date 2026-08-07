# Social Surfers — website

Static marketing site for Social Surfers, a social media & digital marketing agency.
The studio is in Yamunanagar, Haryana; the work is delivered remotely and the site is
not geo-scoped — see **Reach** below.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # -> dist/  (static, deploy anywhere)
npm run preview
```

## Stack

**Astro 7, static output.** No UI framework, no GSAP, no Framer Motion — every animation
on the site is hand-rolled CSS plus ~7 KB of TypeScript. Astro ships zero JS by default,
which is what keeps first visit at **69.8 KB** on the heaviest page.

| | on the wire |
|---|---|
| CSS (gzipped) | 9.2 KB |
| JS (external chunks, gzipped) | 2.0 KB |
| Fonts (woff2, precompressed) | 46.0 KB |
| Heaviest page, first visit | **69.8 KB** |

Fonts are self-hosted and hard-subset with `fonttools`: Fraunces 121 KB → 22 KB (opsz
pinned to 144, SOFT 0, WONK 1; weight axis kept), JetBrains Mono 31 KB → 25 KB.

## Shape of the site

**One page, plus seven service pages.**

- `/` carries hero → stats → services → process → clients → contact. The nav links are
  in-page anchors (`/#services`, `/#process`, `/#clients`, `/#contact`).
- `/services/<slug>` — each service line keeps its own page. They hold the detail and
  the search intent a homepage section can't, and they are the only routes in the
  sitemap besides `/`.
- `/services` and `/contact` still resolve: both are `redirects` in `astro.config.mjs`
  pointing at their sections, so links already in the wild (business profile, brochure,
  a forwarded message) don't 404. They emit `noindex` stubs and are filtered out of
  the sitemap.

Cross-page anchors are load-bearing here, so `initScroll()` lands on the fragment
itself — see the comment on `landOnHash()` for why the browser's own behaviour and
`scrollIntoView` both get it wrong on this page.

## Voice

**Plain, literal, self-explanatory.** The surf idea lives in the brand name, the logo,
the hero headline (which is the client's own tagline) and the motion — nowhere in the
interface language. Section headings say "How we work", not "How it runs"; "Our
clients", not "Who's in the water"; the stats say "Projects delivered", not "Logged".
If a label needs the visitor to decode a metaphor before they know what it means,
rewrite it.

## The hero is full bleed

One screen, one message: headline, one plain sentence, two buttons, the swell line.
The counts that used to sit along its bottom edge are `components/Stats.astro`, the
band directly below — they were competing with the animation for the only screen the
hero gets. Stats also carries the dawn→day background handover that Services used to
own, so Services starts on plain foam.

There is exactly **one** stats block on the page now; the work section used to repeat
the same four figures and no longer does.

## Reach

The business takes work from anywhere. `areaServed` in the schema is `Worldwide`, and
no `<title>`, description or body copy is scoped to a town. The **address stays** — in
the footer, the contact band and the LocalBusiness JSON-LD — because it's real and
Google needs it for the Business Profile. Address ≠ service area; don't collapse the
two back together.

It's **plain text, not a map link.** Nobody is being invited to the office; the work is
delivered remotely. The address is a trust signal, and a "get directions" affordance
would only offer a visit that isn't on the table.

## Where things live

```
src/
  data/          the only place content lives — site.ts (NAP, socials, WhatsApp),
                 services.ts (7 lines + per-page SEO), content.ts (process, projects,
                 stats)
  components/    one file per section; styles are Astro-scoped
  scripts/
    swell.ts     the hero's animated Swell Line + rider + particles
    scroll.ts    progress thread, diurnal sky, fragment landing, --p, reveal observer
  layouts/Base.astro   <head>, OG tags, LocalBusiness / Service / Breadcrumb JSON-LD
qa/
  shot.mjs       CDP screenshots. --full, --reduce, --vp WxH:name, and
                 --at <selector> --p 0.55 to park mid-scrub on a scroll-linked section
  probe.mjs      evaluate JS in the built page + surface console errors.
                 --nowalk skips the reveal walk (which ends at scrollTo(0,0) and would
                 destroy any load-time scroll state you're trying to measure)
  contrast.mjs   WCAG audit against rendered pixels — see below
  weigh.mjs      per-page gzipped weight against the budget
```

## Design system

Tokens in `src/styles/tokens.css`. The page commits to one visual world — a night ocean
moving through a full day — so there is no light/dark toggle; the **diurnal arc is the
page structure**: dawn (hero) → midday (services) → golden hour (process) → dusk (work)
→ dawn again (contact).

**Contrast rules that are not negotiable** (measured, not estimated):

- Buoy Coral `#FF6A4D` carries **ink text, never white** — 6.41:1 vs 2.83:1.
- Bioluminescent pink `#EA1C82` is 4.31:1 on ink: **display sizes only** — headings,
  large numerals, glow. Small text uses `--bio-lift` `#FF4E8E` (~5.8:1).
- Coral is rationed to the single primary action per view. The nav CTA is an outline.
- `--t4` is decorative (separators, rules). It is 2.04:1 as text. Never use it as text.

**Section backgrounds use fixed-pixel gradient stops wherever light and dark text meet.**
This has now bitten twice. A percentage stop moves with section height, so the ground
under a fixed piece of text changes when anything above it reflows:

- the process section's steps landed on the light half on mobile (white on pink);
- the closing section ramped dark→foam across 100% of a ~1400px section, so its
  heading, lead and checklist all sat on mid-purple — the h2 measured **1.76:1**.

Both are now pinned bands that complete in a fixed number of pixels.

### `node qa/contrast.mjs <url> [--vp 1440x900] [--worst 10]`

Because you cannot catch that class of bug by reading CSS — the declared colour is
fine, the pixel behind it is not. The tool renders the page, takes the modal pixel
inside each text element's box as its true background, composites the declared colour
over it, and checks the ratio against the AA threshold for that size and weight.
Exits non-zero on any failure. Run it on `/`, a service page and `/404` at both
1440x900 and 390x844 after touching any background.

## Still open

- **`PUBLIC_FORM_ENDPOINT` is unset.** The enquiry form currently falls back to opening
  the visitor's mail client with the fields prefilled. Set the env var (Formspree,
  Web3Forms, or your own handler) to switch it to background AJAX submission.
- **The project wall is a partial list.** `projects` in `src/data/content.ts` holds only
  the six named clients; the client has ~40–45 delivered and is choosing which he'll
  name publicly. Append rows and the wall reflows — it's a plain grid with no fixed
  count, and the "+N more" tile recomputes from `stats.projectsDelivered` and
  disappears once the list catches up.
- **`stats.projectsDelivered` is 40**, the conservative floor of the client's own
  "around 40–45". Replace with the exact figure when he confirms it.
- **No testimonials.** `hasRealTestimonials` is `false`, so the work section renders the
  value pillars instead. Flip it once real quotes with named businesses exist. Nothing
  invented ships in the meantime.
- **Client logos** — set `logo` on a project and the tile swaps its name for the image
  with no layout change.
- **Social handles** in `site.ts` are best guesses; confirm with the client.
- **Geo coordinates** are approximate; replace with the exact pin from the Google
  Business Profile.
