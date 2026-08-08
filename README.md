# Social Surfers — website

Static marketing site for Social Surfers, a social media & digital marketing agency.
The office is in Yamunanagar, Haryana; the work is delivered remotely and the site is
not geo-scoped — see **Reach** below.

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # -> dist/  (static, deploy anywhere)
npm run preview
```

## Stack

**Astro 7, static output.** No UI framework, no GSAP, no Three.js, no R3F.

Astro is a *build-time* framework and those are *runtime* libraries — they were never
in competition, and capability was never the constraint. Budget was. The hero's flowing
current is a fragment shader on one full-screen triangle in **raw WebGL, ~5 KB**.
Three.js exists to manage scenes, cameras, lights and materials, none of which a 2D
field uses, and would have cost ~150 KB gzipped; R3F would additionally have pulled
React into a site that has no framework at all.

| | on the wire |
|---|---|
| CSS (gzipped) | 9.5 KB |
| JS (external chunks, gzipped) | 5.3 KB |
| Fonts (woff2, precompressed) | 39.4 KB |
| Heaviest page, first visit | **63.5 KB** |
| Client logo tiles (27, lazy) | 178 KB |

Lighter than the dark version this replaced (69.5 KB) *including* the shader: Fraunces
(22.5 KB, display only) was dropped for Space Grotesk (14.8 KB), which serves display
**and** body. Both faces are self-hosted and hard-subset with `fonttools` —
see `.fontsrc/subset.py`. JetBrains Mono 31 KB → 24.6 KB.

## Shape of the site

**One page, plus seven service pages.**

- `/` carries hero → stats → services → process → clients → contact. The nav links are
  in-page anchors (`/#services`, `/#process`, `/#clients`, `/#contact`).
- `/services/<slug>` — each service keeps its own page. They hold the detail and the
  search intent a homepage section can't, and they are the only routes in the sitemap
  besides `/`.
- `/services` and `/contact` still resolve: both are `redirects` in `astro.config.mjs`
  pointing at their sections, so links already in the wild (business profile, brochure,
  a forwarded message) don't 404. They emit `noindex` stubs and are filtered out of
  the sitemap.

Cross-page anchors are load-bearing here, so `initScroll()` lands on the fragment
itself — see the comment on `landOnHash()` for why the browser's own behaviour and
`scrollIntoView` both get it wrong on this page.

## Voice

**Plain, literal, self-explanatory.** The surf idea lives in the brand name, the logo
and the hero headline (which is the client's own tagline) — nowhere in the interface
language. Section headings say "How we work", not "How it runs"; "Our clients", not
"Who's in the water"; the stats say "Projects delivered", not "Logged". If a label
needs the visitor to decode a metaphor before they know what it means, rewrite it.

## The hero

Light ground, type on the left, one dense focal element on the right.

The focal element is the client's own render, knocked out of its white ground by
`tools/hero.mjs` so it sits *on* the paper. It is treated as a **monogram, not a
picture**: the silhouette is an S, and so is the board, and so is the wetsuit. That is
why it gets no frame, no card and no drop shadow — a container would turn the brand's
own letterform back into stock art.

Three motions compose on it, which is why the markup nests three elements rather than
one: they cannot share a `transform`.

| | what | driven by |
|---|---|---|
| **swell** | clip-revealed bottom-up on load, so the wave rises into frame rather than fading in | one-shot CSS animation — the hero is above the fold, so no observer |
| **ride** | slow drift along the wave's tangent, ±0.6° roll, 11s | infinite CSS animation |
| **descent** | lags the page downward and rolls into the direction of travel as the hero scrolls away | `--hp` from `initScroll` |

`--hp` is hero scroll progress, 0 at the top and 1 once the section has scrolled its own
height. It is written by the existing scroll loop, so the hero's scroll motion costs no
extra listener and no second rAF. All three are scoped to `html.js-motion`, which is
absent under `prefers-reduced-motion` — that is what makes them respect the setting
without a media query.

### The shader is parked, not deleted

`src/scripts/fluid.ts` still exists and is commented out in three places in
`Hero.astro` (markup, styles, script). With the import commented the module is **not
bundled at all**, so it costs nothing while parked. It is kept because it is the
fallback if the client's render ever has to be withdrawn over the platform marks — see
*Still open*. The placeholder metric/post/reel cards that went with it are in git at
`fa956c3^`.

It is off because the render's ground is now transparent, so the artwork would sit on a
live, saturated, moving gradient; the 3D icons and the shader compete for the same
attention at the same size and the surfer loses.

Notes worth keeping on it — domain-warped fractal noise evaluated from a clock, so there
is **no loop to seam**, unlike the video that is the usual way to get this look (1–3 MB
plus a visible repeat). Notes worth keeping:

- Feature scale is deliberately low. At texture density it reads as marbled paper; a
  current needs features about as large as the element.
- The mask follows the layout. Masking by `x` puts the field behind the copy once the
  hero stacks to one column on a phone, so a `uNarrow` uniform switches it to a
  bottom-weighted band.
- Rendered at 0.5–0.55× with no DPR scaling. It is a soft field with no edges to alias,
  so upscaling costs nothing visually and roughly a third of the fragment work.
- Every failure mode — no WebGL, lost context, ≤2 cores, `prefers-reduced-motion` —
  leaves the static CSS gradient underneath visible. There is no blank rectangle.

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
                 services.ts (7 services + per-page SEO), content.ts (process,
                 projects, stats)
  components/    one file per section; styles are Astro-scoped
  scripts/
    fluid.ts     the hero's WebGL current
    scroll.ts    progress thread, fragment landing, per-element --p, reveal observer
  layouts/Base.astro   <head>, OG tags, LocalBusiness / Service / Breadcrumb JSON-LD
qa/
  shot.mjs       CDP screenshots. --full, --reduce, --vp WxH:name, and
                 --at <selector> --p 0.55 to park mid-scrub on a scroll-linked section
  probe.mjs      evaluate JS in the built page + surface console errors.
                 --nowalk skips the reveal walk (which ends at scrollTo(0,0) and would
                 destroy any load-time scroll state you're trying to measure)
  contrast.mjs   WCAG audit against rendered pixels — see below
  seams.mjs      hard-step detector for tone boundaries — see below
  weigh.mjs      per-page gzipped weight against the budget
tools/
  logos.mjs      client logo pipeline — see below
  hero.mjs       hero render -> knocked-out WebP + manifest — see below
  clients.json   source filename -> client name/industry (hand-maintained)
.fontsrc/        font sources + the subsetting script (not shipped)
brand/           the client's original artwork; source of truth, not served
```

## The brand mark

`components/Logo.astro` is vector, not the supplied raster. Fitting circles to the
traced edges of the client's PNG showed the geometry is exact and simple: **two discs
of identical radius sharing a centre-x, their centres one radius apart** — the upper
minus its bottom-right quadrant, the lower minus its top-left. That interlock is the S.

So it is ~500 bytes of path data instead of 14.5 KB of pixels, crisp at every size
including `favicon.svg`, and the two brand colours became tokens.

The wordmark keeps `--brand-pink` `#E35E9D` exactly as supplied, which measures 2.99:1
on paper. WCAG 1.4.3 exempts logotypes — and that exemption is *declared* in the markup
via `data-contrast-exempt="logotype"` so the audit reports it rather than either failing
every run or being silently waved through. Distorting a client's own brand colour to
satisfy a rule that explicitly does not apply would be the wrong fix.

## Client logos: `node tools/logos.mjs [--sheet]`

Raw phone screenshots in, uniform web tiles out. 27 clients, 178 KB total.

The source material is what a client actually sends: iPhone screenshots of Instagram
profile pictures, 2–6 MB each, with the status bar and the Following/Share/QR buttons
still attached, plus loose wordmarks on white, cream, black and transparency. Two
observations made this automatable rather than an afternoon of manual cropping:

1. **Instagram blurs the backdrop behind the avatar**, so the avatar is the only sharp
   thing on the frame — finding the region with real high-frequency detail beats hunting
   for a circle. Thresholds are relative to each frame's own strongest row: a fixed
   cutoff missed every avatar that was mostly flat colour, because a black disc with a
   wordmark on it has enormous edge contrast but very few edge *pixels*. Where even that
   finds nothing, a geometric fallback uses the viewer's fixed layout (disc centred, a
   constant share of frame width).
2. **Backgrounds never have to be removed.** Each logo is composited onto a tile filled
   with its own corner colour. Black wordmarks keep black tiles, transparent PNGs get
   paper — and a *light* mark on transparency gets an ink tile, which is what stops the
   white Romeo Lane wordmark rendering as an empty rectangle.

Names live in `tools/clients.json`. The tool writes `src/data/clients.json`, which the
site reads — never hand-edit that one. To add a client: drop artwork into `src/assets`,
add a line to the name map, re-run.

> `src/assets` is **38 MB** of raw originals and is committed deliberately — it is the
> only copy of the client's source artwork and the pipeline needs it to re-run. Move it
> to asset storage (Drive, S3) before this repo gets a remote; nothing in the build
> depends on it, only `tools/logos.mjs` does.

## Hero artwork: `node tools/hero.mjs [--check]`

Takes the client's render on white and emits alpha WebP at two widths plus
`src/data/hero-art.json`, which is what `Hero.astro` reads its `srcset` and intrinsic
size from. Nothing is hard-coded in the markup, so a re-export cannot leave the page
advertising a width the file does not have.

The background is found by **flood fill inward from the border**, not by a luminance
threshold. That distinction matters for this image specifically: the surfboard and the
Brand cube are the two whitest objects in the frame, so any threshold that catches the
ground punches holes straight through the subject. Enclosed whites are unreachable from
the border and survive by construction.

`--check` writes `_check-paper.png` and `_check-white.png` — the cutout composited on
both grounds so the fringe is visible where it would actually show. They are
diagnostics; delete them before committing.

### What the export needs to be

The current source is `hero.png` at the repo root, 650×1008. It is a **stand-in** — too
small for the 2× file, so the tool refuses to upscale and says so. To replace it, drop a
new export at `src/assets/hero-surfer.png` and re-run. It needs to be:

- **PNG, at least 1120 px wide** (≈1740 px tall at this ratio). 1300×2000 is ideal.
  Long edge 2000 is a good thing to ask Canva for.
- **On a flat background.** White is fine — the tool removes it. What breaks the fill is
  a *gradient* background, a drop shadow under the artwork, or a border: all three give
  the flood fill a path around the subject or a soft ramp it cannot cut cleanly.
  Transparent PNG also works and skips the keying question entirely.
- **Nothing touching the canvas edge.** The fill seeds from the border; artwork bleeding
  off the edge blocks it and the ground stays opaque. Leave a margin — the tool trims
  the empty space afterwards, so generous is free.
- **No text, no logo, no frame.** The page supplies all of those.

## Design system

Tokens in `src/styles/tokens.css`. **Light-first, but not uniformly light** — a wall of
paper from top to bottom reads as unfinished.

One dark chapter sits in the middle (how we work + the clients), and the footer closes
on dark. `.tone-dark` in `global.css` does two things:

- carries a **260px fixed-pixel ramp** in and out, with the sections padding past it so
  no text ever sits on the transition. The ramp has many stops leaning through the brand
  violet — a straight two-stop paper→ink gradient passes through a muddy neutral and
  reads as dirt.
- **redefines the light-ground tokens to their dark equivalents.** `--l1` becomes
  `--t1`, hairlines flip, and `--violet`/`--rose` are swapped for values legible on ink
  (they measure 1.6:1 and 3.3:1 there). Components keep one set of rules and work on
  either ground, which is why moving a section between chapters costs nothing.

The old dawn → midday → dusk arc is still gone, and stays gone. It was a metaphor the
visitor had to decode before the page made sense. What replaced it is tone used as
*structure*, not as narrative: light, dark, light. **Every** contrast failure on this
project came from a percentage-stop gradient drifting under fixed text when a section's
height changed, which is why the ramps above are in pixels.

### The gradient is rationed

There is exactly **one** gradient token, `--grad`, and it appears in exactly **two**
places: the hero's accent phrase, and the primary button. Gradients read as
AI-generated the moment they are everywhere. Everything else — pennants, chart lines,
card accents, icons — uses a flat brand colour. Keep it that way.

The ramp stops at `--rose` rather than running out to coral so white text clears 5.6:1
at every stop along it. That is what lets one token serve both a heading fill and a
button label. Coral is beautiful and cannot carry text on paper (2.55:1).

**Contrast rules that are not negotiable** (measured, not estimated):

- `--bio` `#EA1C82` is 3.8:1 on paper — **display sizes only**. Small text uses
  `--rose` `#C41B6E` (5.1:1).
- `--coral` never carries text anywhere. It exists for the shader.
- `--t4` is decorative (separators). It is ~2:1 as text.
- **A dark section must set its own `color`.** Its contents inherit `--l1` from body
  otherwise and land dark-on-dark — exactly how the logo wordmark reached 1.08:1 in the
  footer during this rework.

### `node qa/contrast.mjs <url> [--vp 1440x900] [--worst 10]`

You cannot catch that class of bug by reading CSS: the declared colour is fine, the
pixel behind it is not. The tool renders the page, takes the modal pixel inside each
text element's box as its true background, composites the declared colour over it, and
checks the ratio against the AA threshold for that size and weight.

Gradient text (`background-clip: text`) computes to `color: transparent`, so for those
it measures the painted glyph pixels instead. The glyph-core cutoff is adaptive: it
keeps only pixels at 65%+ of the element's own maximum distance from its ground. A fixed
cutoff let partially-covered antialiased pixels through, and their share of the box
roughly doubles as type gets smaller — so the same colour scored 2.79:1 at 34px and
passed comfortably at 65px, purely from edge fringe.

Elements carrying `data-contrast-exempt` are skipped and reported by name. That is for
logotypes only (WCAG 1.4.3); it is not a general-purpose silencer.

Exits non-zero on any failure. Run it on `/`, a service page and `/404` at both
1440x900 and 390x844 after touching any background.

## Still open

- **`PUBLIC_FORM_ENDPOINT` is unset.** The enquiry form currently falls back to opening
  the visitor's mail client with the fields prefilled. Set the env var (Formspree,
  Web3Forms, or your own handler) to switch it to background AJAX submission.
- **The hero art is a stand-in resolution.** `hero.png` is 650 px wide, so the 2× file
  is soft on a retina screen. `tools/hero.mjs` prints a warning until a bigger export
  lands at `src/assets/hero-surfer.png` — spec above.
- **Three client names need confirming.** They could not be read off the logo with
  confidence and are flagged `"verify": true` in `tools/clients.json`: *Silomin*,
  *Looms in Velvet*, and one still called *Client 27*. Fix the name map and re-run the
  tool; the tile filenames and the data file follow automatically.
- **`stats.projectsDelivered` is 40**, the conservative floor of the client's own
  "around 40–45". `stats.brands` is not an estimate — it is the length of the roster.
  Replace the 40 with the exact figure when he confirms it.
- **The hero render leans on third-party platform logos** as decorative 3D art, which
  Meta / YouTube / TikTok brand guidelines restrict. It is in use at the client's
  request, and the decision is his and on record. Ranked by likelihood: nothing happens;
  a removal request arrives and the asset is swapped; **Meta ad disapproval** — by far
  the most probable outcome with real cost, since a landing page misusing Meta's marks
  can get ads rejected or the Business Manager flagged. What actually escalates risk is
  implying partnership, so no "official partner" or "certified" copy goes anywhere near
  it. If it has to come down, restore the shader hero — see *The hero*.
- **No testimonials.** `hasRealTestimonials` is `false`, so the clients section renders
  the value pillars instead. Flip it once real quotes with named businesses exist.
  Nothing invented ships in the meantime.
- **Client logos** — set `logo` on a project and the tile swaps its name for the image
  with no layout change.
- **Social handles** in `site.ts` are best guesses; confirm with the client.
- **Geo coordinates** are approximate; replace with the exact pin from the Google
  Business Profile.
