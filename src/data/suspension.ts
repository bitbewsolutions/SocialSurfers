/**
 * ═══════════════════════════════════════════════════════════════════
 * SUSPENSION SWITCH — read this before touching anything else in here.
 * ═══════════════════════════════════════════════════════════════════
 *
 * When this is on, every page in the build renders the notice in
 * components/Suspended.astro INSTEAD of its own content. Nothing else in the
 * project changes shape: no component is deleted, no route is removed, no copy
 * is edited. Base.astro simply stops rendering its <slot />.
 *
 * That is the whole point. Turning the site back on is one boolean and a
 * rebuild — there is no un-picking to do, and no chance of the real site coming
 * back subtly different from how it went down.
 *
 *   TAKE THE SITE DOWN     npm run site:down   → commit → push
 *   PUT THE SITE BACK UP   npm run site:up     → commit → push
 *
 * Or, without a commit at all: set an environment variable named
 * SITE_SUSPENDED in the Netlify UI (Site configuration → Environment
 * variables) to "true" or "false" and trigger a redeploy. The variable wins
 * over the constant below, so the site can be restored from a phone at 11pm
 * without a laptop, a checkout, or a git push.
 *
 * Removing the feature entirely, if it is never needed again: delete this file
 * and components/Suspended.astro, then drop the four suspension lines from
 * layouts/Base.astro. `git log --grep=suspension` finds the commit that added
 * them.
 */

/** The committed default. `npm run site:down` / `site:up` rewrites this line. */
const SUSPENDED_BY_DEFAULT = true;

/**
 * Netlify's env var, read at build time (this file is evaluated in Node during
 * `astro build`, not in the browser). Deliberately NOT `import.meta.env` —
 * Astro only exposes PUBLIC_-prefixed variables there, and this one has no
 * business being readable from the client bundle.
 */
const override = typeof process !== 'undefined' ? process.env?.SITE_SUSPENDED : undefined;

export const SUSPENDED =
  override === undefined || override === ''
    ? SUSPENDED_BY_DEFAULT
    : /^(1|true|yes|on)$/i.test(override.trim());

/**
 * Every word the notice says, in one place — so the tone can be changed under
 * pressure without opening a component. Kept factual and unemotional on
 * purpose: this page sits on the client's own domain in front of his
 * customers, his family and anyone he has ever handed a card to, and a
 * statement of fact is both harder to argue with and safer to have published
 * than an accusation.
 */
export const suspension = {
  /** <title> and og:title while suspended. */
  title: 'Site temporarily unavailable',
  /** meta description while suspended. */
  description:
    'This website is temporarily offline. The site owner can restore it by contacting Bitbew, the studio that built it.',

  label: 'Temporarily offline',
  heading: 'This site is temporarily unavailable.',
  body:
    'The website has been suspended by Bitbew, the studio that designed and built it, while the account for the project is settled. It will be restored in full — every page exactly as it was — as soon as that is resolved.',
  visitorNote:
    'If you were trying to reach Social Surfers, please check back shortly.',

  ownerHeading: 'If you are the site owner',
  ownerNote: 'Message or call us and this comes down the same day.',

  /* Bitbew's own channels. The number is the one the footer credit already
     uses, so it is known good. The address is NOT — nothing in this repo
     records a Bitbew email, so it is a guess: check it resolves before this
     goes live, or set it to '' and the notice drops the email row entirely. */
  phone: '918146622525',
  phoneLabel: '+91 81466 22525',
  email: 'hello@bitbew.com',
  studioUrl: 'https://bitbew.com',
  whatsappMessage:
    "Hi Bitbew — I'd like to settle the account for the Social Surfers website and get it back online.",
} as const;

export const suspensionWaLink = `https://wa.me/${suspension.phone.replace(/\D/g, '')}?text=${encodeURIComponent(suspension.whatsappMessage)}`;
export const suspensionTelLink = `tel:+${suspension.phone}`;
export const suspensionMailLink = `mailto:${suspension.email}?subject=${encodeURIComponent('Social Surfers website — account')}`;
