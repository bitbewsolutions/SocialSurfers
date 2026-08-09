import { services } from './services';

/** The 7-step working process, in the order it runs each month. */
export const process = [
  {
    n: 1,
    title: 'Discovery Meeting',
    body: 'We sit down to understand your business, your goals, and exactly who you want to reach.',
  },
  {
    n: 2,
    title: 'Strategy Planning',
    body: 'A plan built for your brand and your market — not a template we ran for someone else last month.',
  },
  {
    n: 3,
    title: 'Content Creation',
    body: 'We write, shoot, design and schedule everything the plan asks for.',
  },
  {
    n: 4,
    title: 'Client Approval',
    body: 'You see everything before it goes live. Your feedback comes back in, and we make it right.',
  },
  {
    n: 5,
    title: 'Publishing',
    body: 'Posted on time, every time — and the comments and DMs get answered, not ignored.',
  },
  {
    n: 6,
    title: 'Performance Tracking',
    body: 'We watch what the numbers do and adjust while the campaign is still running, not after.',
  },
  {
    n: 7,
    title: 'Monthly Report',
    body: 'A clear report every month: what we did, what it earned you, and what we are changing next.',
  },
] as const;

/**
 * The About copy, transcribed from the client's brochure rather than written here —
 * it is his description of his own business and he has already approved it.
 */
export const about = {
  body: [
    "At Social Surfers, we don't just manage your social media — we build your digital presence, tell your brand story and drive real growth.",
    'From creative content to performance marketing, we provide 360° digital solutions that help your business stand out, engage more and convert better.',
  ],
} as const;

/**
 * The three points that sit beside the About copy in the brochure, under the
 * category line. Short by design: they are a summary of the seven services, not a
 * competing list of them.
 */
export const solutions = [
  { icon: 'target', text: 'Build your digital presence.' },
  { icon: 'bubble', text: 'Tell your brand story.' },
  { icon: 'chart', text: 'Drive real growth.' },
] as const;

/**
 * Industries the agency works in, each with a line icon for the grid in Industries.astro.
 *
 * Extended from 10 to 20 at the client's request — the ten it had were the ones his
 * roster proves, and the rest are ordinary SMB categories a regional digital agency
 * serves. The count is what `stats.industriesServed` reads, so this list and the "20+"
 * tile cannot drift apart.
 *
 * Icons are single-path, 24×24, stroke-only, drawn to one weight so the grid reads as
 * a set rather than as twenty separate downloads. Circles are arcs inside the same `d`
 * — one path per industry keeps the markup flat.
 */
export interface Industry {
  name: string;
  d: string;
}

export const industries: readonly Industry[] = [
  { name: 'Real Estate', d: 'M3 10.6 12 4l9 6.6V20a1 1 0 0 1-1 1h-4.5v-6h-7v6H4a1 1 0 0 1-1-1z' },
  { name: 'Education', d: 'M2.5 8.6 12 4.2l9.5 4.4L12 13zM6.5 10.9V16c0 1.6 2.5 2.9 5.5 2.9s5.5-1.3 5.5-2.9v-5.1M21.5 8.6v5.6' },
  { name: 'Gym & Fitness', d: 'M3.5 9.5v5M6.5 7.5v9M17.5 7.5v9M20.5 9.5v5M6.5 12h11' },
  { name: 'Healthcare', d: 'M12 20.3S4.8 15.9 4.8 11a3.9 3.9 0 0 1 7.2-2.1A3.9 3.9 0 0 1 19.2 11c0 4.9-7.2 9.3-7.2 9.3z' },
  { name: 'Fashion', d: 'M12 6.6a1.9 1.9 0 1 1 1.9 1.9c-1 0-1.9.7-1.9 1.7v.6M3.4 18.2 12 12.4l8.6 5.8a1 1 0 0 1-.6 1.8H4a1 1 0 0 1-.6-1.8z' },
  { name: 'Restaurant & Café', d: 'M5.5 3v5.5a2.5 2.5 0 0 0 5 0V3M8 8.5V21M17.5 3c-1.4 1.3-2 3.1-2 5.1 0 1.8.8 3.2 2 3.6V21' },
  { name: 'Salon & Spa', d: 'M7 4l10 11M17 4 7 15M6.6 19.4a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM17.4 19.4a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z' },
  { name: 'E-commerce', d: 'M2.8 4.4h2.4l2.2 10.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2l1.4-6H6.2M9.6 20.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2zM17.8 20.2a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2z' },
  { name: 'Automobile', d: 'M3.6 15.4h16.8M5.4 15.4v3.2a.8.8 0 0 1-.8.8H3.8a.8.8 0 0 1-.8-.8v-3.2M21 15.4v3.2a.8.8 0 0 1-.8.8h-.8a.8.8 0 0 1-.8-.8v-3.2M3.6 15.4l1.7-5.1A2 2 0 0 1 7.2 9h9.6a2 2 0 0 1 1.9 1.3l1.7 5.1' },
  { name: 'Travel & Hospitality', d: 'M21 4 3 10.9l6.5 2.6zM9.5 13.5 21 4l-6.3 15.7-2.7-5.5z' },
  { name: 'Interior & Architecture', d: 'M3.5 20.5h17M6 20.5V8.4l6-4.4 6 4.4v12.1M9.5 20.5v-5h5v5M9.5 11h5' },
  { name: 'Jewellery', d: 'M6.2 3.6h11.6l3.2 5-9 12.2-9-12.2zM2.6 8.6h18.8M9 3.6l-2.4 5L12 20.8l5.4-12.2L15 3.6' },
  { name: 'Retail', d: 'M3.6 9.4h16.8V20a1 1 0 0 1-1 1H4.6a1 1 0 0 1-1-1zM3 9.4 4.8 4h14.4L21 9.4M9.6 21v-6.4h4.8V21' },
  { name: 'Events & Weddings', d: 'M4 6.6h16a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7.6a1 1 0 0 1 1-1zM8 3.4v4M16 3.4v4M3 11.4h18M12 13.8l.85 1.75 1.95.28-1.4 1.37.33 1.93L12 18.2l-1.73.91.33-1.93-1.4-1.37 1.95-.28z' },
  { name: 'Finance & Insurance', d: 'M3.4 9.6 12 4.6l8.6 5zM5.6 12.4v5.4M10 12.4v5.4M14 12.4v5.4M18.4 12.4v5.4M3 20.4h18' },
  { name: 'Legal & Consulting', d: 'M12 4.2v16.2M8 20.4h8M5 6.6h14M6.4 6.9 3 13.2h6.8zM17.6 6.9 14.2 13.2H21M3 13.2a3.4 3.4 0 0 0 6.8 0M14.2 13.2a3.4 3.4 0 0 0 6.8 0' },
  { name: 'Manufacturing', d: 'M3.4 20.6h17.2M4.6 20.6v-9.4l4.8 3v-3l4.8 3V7h5.2v13.6M8 17h1.6M13 17h1.6' },
  { name: 'Agriculture', d: 'M12 21v-7.2M12 13.8c0-3.4 2.7-6.2 6.1-6.2 0 3.4-2.7 6.2-6.1 6.2zM12 13.8c0-2.9-2.3-5.3-5.1-5.3 0 2.9 2.3 5.3 5.1 5.3z' },
  { name: 'Technology & SaaS', d: 'M8.6 8.6h6.8v6.8H8.6zM4 9.4h4.6M4 14.6h4.6M15.4 9.4H20M15.4 14.6H20M9.4 4v4.6M14.6 4v4.6M9.4 15.4V20M14.6 15.4V20' },
  { name: 'NGO & Non-profit', d: 'M12 12.6a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6zM4.4 20.4a7.6 7.6 0 0 1 15.2 0' },
] as const;

/** Why choose us — 9 points, styled as a pre-session checklist. */
export const whyUs = [
  'Dedicated & passionate team',
  'Customized strategy for every brand',
  'High quality content & designs',
  'Latest tools & technologies',
  'Fast communication & support',
  'Monthly performance reports',
  'Transparent work & timely delivery',
  'Result-driven digital marketing',
  'End-to-end brand management',
] as const;

/** The four value pillars from the brochure. */
export const pillars = ['Strategy', 'Creativity', 'Technology', 'Results'] as const;

import clientData from './clients.json';

export interface Client {
  name: string;
  industry: string;
  /** tile under /public/clients, generated by tools/logos.mjs */
  logo: string;
}

/**
 * The client roster.
 *
 * Generated — do not hand-edit `clients.json`. It is written by `tools/logos.mjs`
 * from the raw artwork in `src/assets` plus the name map in `tools/clients.json`.
 * To add a client: drop the artwork in, add a line to the name map, re-run the tool.
 *
 * TODO(client): three names could not be read off the logo with confidence and are
 * flagged `verify` in tools/clients.json — Silomin, Looms in Velvet, and one that is
 * still a placeholder ("Client 27"). Confirm before launch.
 */
export const clients: readonly Client[] = clientData;

/**
 * Headline figures. Every one is rendered with a trailing "+", at the client's
 * request — he has been trading a long time and does not want the site fixing a
 * ceiling he has already passed.
 *
 * The four values here are the ones HE supplied in this pass (500 / 150 / 20 / 25),
 * raised from 80 / 54 / 20 / 16. Two are his own trading record and nobody else can
 * check them; two are countable on the page, so they are derived rather than typed:
 *
 *   industriesServed  `industries.length` — exactly the 20 he asked for, and the
 *                     grid in Industries.astro renders that same array. The "and
 *                     many more" tile is deliberately not in it; it is a gesture,
 *                     not a category, and counting it would make the tile read 21.
 *
 *   serviceLines      the one figure worth understanding before changing. It is 25
 *                     at his instruction while the services grid shows 16 CARDS, so
 *                     at a glance the two look like they disagree. They do not: the
 *                     16 cards are categories, and the `items` beneath them list 200
 *                     individual services — every card already says "+14 more" or
 *                     similar. 25 is comfortably true against the thing the number
 *                     actually names, and comfortably conservative against 200.
 *                     If it ever needs defending, that is the answer; if he would
 *                     rather it were unarguable, `services.length` (16) and 200 are
 *                     both derivable and both honest.
 *
 * `brands` and `projectsDelivered` stay literals: the logo wall is explicitly "a
 * selection of", and only he can confirm either.
 */
export const stats = {
  projectsDelivered: 500,
  brands: 150,
  industriesServed: industries.length,
  serviceLines: 25,
} as const;

/**
 * PLACEHOLDER — no real testimonials exist in the brochure.
 * Do NOT ship these. Either the client supplies real quotes with named businesses,
 * or the Proof section falls back to `clients` + service readouts only.
 * The section reads `hasRealTestimonials` and degrades on its own.
 */
export const hasRealTestimonials = false;

export const testimonials = [
  {
    client: 'Client Name',
    business: 'Business Name',
    industry: 'Industry',
    quote: 'Awaiting a real quote from the client — this block does not render while hasRealTestimonials is false.',
    result: '',
    date: '',
  },
] as const;
