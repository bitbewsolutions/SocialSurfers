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
| JS (external chunks, gzipped) | 2.4 KB |
| Fonts (woff2, precompressed) | 26.6 KB |
| Heaviest page, first visit | **51.3 KB** |
| Hero image (WebP, one of four widths) | 44.5–151 KB |
| Client logo tiles (27, lazy) | 178 KB |

The shader is parked (see below) and no longer bundled, which is most of the JS drop.
Fonts got smaller while gaining a family — see **Type**.

## Type

The client's poster is one neutral neo-grotesque: very heavy caps, regular body, and
**no monospace anywhere**. So Space Grotesk *and* JetBrains Mono were both replaced by
**Archivo** — a single variable file at 100–900 that sets display at 900, body at 400,
and the small letterspaced caps the mono used to set. **Dancing Script** sets the
brochure's handwritten line and nothing else.

| | before | after |
|---|---|---|
| display + body | Space Grotesk 14.8 KB | Archivo 20.1 KB |
| labels | JetBrains Mono 24.6 KB | *(same file)* |
| handwriting | — | Dancing Script 5.9 KB |
| **total** | **39.4 KB** | **26.6 KB** |

Both are cut from the `@fontsource-variable` packages in devDependencies, so no binary
is vendored and a version bump is an `npm install`. Run `python .fontsrc/subset.py`
after changing either.

The script face is subset to **exactly the characters `site.voiceLine` uses** — 5.9 KB
against 19.2 KB for the full alphabet. That is only safe because the subsetter reads
the string out of `site.ts` rather than having it typed a second time: change the line,
re-run, and the glyph set follows. If that field is ever renamed the script raises
instead of quietly shipping a font with holes in it.

`--w-display: 900` is where most of "make the headings bigger" actually came from. On a
neo-grotesque, weight buys more apparent size than points do, and it costs no line
breaks — the sizes went up too, but far less than the result suggests.

## Shape of the site

**One page, plus sixteen service pages.**

- `/` carries hero → stats → about → services → process → clients → contact. The nav
  links are in-page anchors (`/#services`, `/#process`, `/#clients`, `/#contact`).
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

**Full-bleed photograph, headline centred across the width.** The client replaced the
cutout render with a cinematic landscape and asked for the copy to run edge to edge.

That flips the hero to a **dark chapter at the top of a light-first page**, which is
the thing to understand before editing it:

- `.tone-dark` is on the section, so `--l1/--l2/--l3` and `--grad-text` resolve to
  their on-ink values. The accent words take `--grad-on-dark`; the paper ramp's dark
  end measures 1.6:1 here and would simply vanish.
- It has to hand over to the paper below. The usual `.to-light` class paints that ramp
  as the section's own `background-image`, which the `<img>` covers — so the same
  `--ramp-ink-to-mid` is composed into a separate masked `.handover` element, and
  `Stats` carries `.from-dark`. The pair still meets at `--tone-mid`.
- The handover is **masked to fade in over its first third**. Layered straight in it
  was an opaque ramp starting at `#0c0620` against a lighter scrimmed image, and drew
  exactly the hard horizontal line the tonal system exists to prevent.

### The scrim is not decoration

Measured on the unscrimmed image, the band the headline occupies means **89.6/255** —
mid-tone, with a near-white sunset at the left. White type over the raw picture would
have failed in the place the eye goes first. `node tools/hero.mjs --check` reprints
those numbers per band. Four layers do the work: a top gradient behind the nav, a
radial pool under the copy, a left-weighted wash over the sunset, and the base veil.

The nav also has to survive the change. `initScroll` adds `.on-dark` while the bar's
**lower edge** is still inside the hero — not at `y > 40`, which would have put a
frosted light bar on a dark photograph for the remaining ~850px. Everything in the bar
that is a token follows automatically; the three things that are literals had to be
inverted by hand — the ghost button's white fill, the burger's white pill, and the
mark's indigo half, which is `#4134aa` and near-invisible on ink.

### Motion

`--hp` is hero scroll progress, 0 at the top and 1 once the section has scrolled its
own height. It is written by the existing scroll loop, so the hero's scroll motion
costs no extra listener and no second rAF. The background is scaled slightly and lags
the page as it leaves. Under `prefers-reduced-motion` the scale stays and the travel
stops.

### The shader and the cutout are parked, not deleted

`src/scripts/fluid.ts` still exists and is commented out in three places in
`Hero.astro`. With the import commented the module is **not bundled at all**, so it
costs nothing parked. It is the fallback if the client's render ever has to be
withdrawn over the platform marks — see *Still open*.

Two earlier heroes are in git rather than in the tree:

| | where |
|---|---|
| shader + placeholder metric/post/reel cards | `fa956c3^` |
| the cutout monogram, and the border flood-fill that keyed it | `bb15c55` |

## The About section and the services grid

**About** is the brochure spread, brought over as the client drew it: heading and two
paragraphs left, the category line and its three points right, and the handwritten line
closing the left column. The line *writes itself on* — a clip wipe per line with the
swash drawing after, rather than a fade, because a fade gives the ending away before
the stroke reaches it. It opts out of the generic reveal's opacity/transform for the
same reason.

**Services** are gradient cards, per the client — but **one gradient, not seven**. Each
card is a slice of the same violet→rose ramp stepped by its index, so reading across
the grid walks the ramp end to end, and `--p` (section scroll progress) slides the whole
set along it as the section passes. The slice is computed in the frontmatter, not in
CSS: mapping each card's background onto its grid *cell* would have to be redeclared at
every breakpoint, since the column count changes underneath it.

Both ends of the mix stay dark enough for white type. The ramp stops at `--rose` and
never reaches `--brand-pink`, on which white measures ~2.6:1 — the same cap `--grad`
has, for the same reason. The eighth tile is the CTA rather than a filler service: seven
cards leave a hole in the last row, and it is the one card that is *not* a gradient, so
the exit doesn't get buried among the services.

## Reach and the address

The business takes work from anywhere. `areaServed` in the schema is `Worldwide`, and
no `<title>`, description or body copy is scoped to a town.

**The visible address is two states and nothing more** — `site.locations`, rendered as
"Haryana · Chandigarh" in the footer and the contact band. That is the client's
instruction. Chandigarh is a second location with no street address of its own.

**The full street address still goes to Google**, via the LocalBusiness JSON-LD in
`Base.astro`, which reads `site.address`. The Business Profile is matched on that
record, so dropping it from the schema would cost the local listing — the opposite of
what was asked for. `site.address` is therefore schema-only now; no page renders it.
Address ≠ service area, and neither is the same as what's printed on the page.

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
.fontsrc/        subset.py — cuts the two faces from node_modules (not shipped)
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

Resizes the client's render to four widths of WebP and writes
`src/data/hero-art.json` with the **measured** dimensions of each. The markup reads
its `srcset` from there, so a re-export at a different size cannot leave the page
advertising widths the files do not have.

| width | on the wire |
|---|---|
| 640 | 44.5 KB |
| 960 | 80.7 KB |
| 1280 | 119.9 KB |
| 1536 | 151.2 KB |

A first visit pays **one** of these, not the sum. 1536 is the source's own width and
the ceiling — the tool never upscales, because a larger file with no more detail is
just bytes.

`--check` additionally prints mean luminance for the nav, headline and CTA bands of
the **unscrimmed** image. That is the number that decides whether white type is safe,
and it is worth re-running whenever the client swaps the artwork: a lighter render
needs a heavier scrim, and nothing else will tell you before the contrast audit does.

The source is `hero.png` at the repo root, which is where he drops each new render.
It is **tracked**, so every previous render is recoverable with `git show <ref>:hero.png`
— which is not hypothetical: the file was once replaced mid-project with a
background-removed copy at a third of the pixels, and that is how the original came
back. `tools/hero.mjs` also checks `src/assets/hero-full.png` first and
`brand/hero-full.png` last, so a better or a pinned source can be dropped in without
editing the tool.

The keying pipeline that produced the old cutout hero — border flood-fill, alpha
feathering, the lot — is in git at `bb15c55`. It has no job while the image is the
background: there is no ground to remove when the render *is* the ground.

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
- **Three client names need confirming.** They could not be read off the logo with
  confidence and are flagged `"verify": true` in `tools/clients.json`: *Silomin*,
  *Looms in Velvet*, and one still called *Client 27*. Fix the name map and re-run the
  tool; the tile filenames and the data file follow automatically.
- **Two headline figures are the client's own and cannot be checked here.**
  `projectsDelivered` (80+) and `brands` (54+) are literals he supplied; the logo wall
  renders 27 tiles and is explicitly framed as "a selection of", which is what makes
  that consistent. `industriesServed` and `serviceLines` are derived from the data
  again — the icon grid holds 20 and the capability list holds 16 — so those two
  cannot drift from what a visitor can count. Every figure renders with a trailing
  "+", at his request.
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
