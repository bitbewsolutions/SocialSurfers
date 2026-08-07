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

/** Industries the agency already works in. */
export const industries = [
  'Real Estate',
  'Education',
  'Gym & Fitness',
  'Healthcare',
  'Fashion',
  'Restaurant',
  'Salon & Spa',
  'E-commerce',
  'Automobile',
  'Travel',
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

export interface Project {
  name: string;
  industry: string;
  /** true = still on a retainer today, false/absent = delivered and closed out */
  current?: boolean;
  /** TODO(assets): path under /public once real logo files land. */
  logo?: string;
}

/**
 * The project wall.
 *
 * TODO(client): this is the confirmed-named subset only. The client has ~40–45
 * delivered projects and is choosing which ones he's happy to name publicly.
 * Adding them is *only* a matter of appending rows here — the wall is a plain
 * grid with no fixed count, and the "+N more" tile recomputes itself from
 * `stats.projectsDelivered` (it disappears on its own once the list catches up).
 *
 * When logo files arrive, set `logo` and the tile swaps the name for the image.
 */
export const projects: readonly Project[] = [
  { name: 'BEES Fitness+', industry: 'Gym & Fitness', current: true },
  { name: 'Royale Group', industry: 'Real Estate', current: true },
  { name: 'SQDC', industry: 'Retail', current: true },
  { name: 'Evergreen Lawns & Panel', industry: 'Events', current: true },
  { name: 'PRO Ultimate Gym', industry: 'Gym & Fitness', current: true },
  { name: 'The Raw Romance', industry: 'Fashion', current: true },
] as const;

/** Brands on an active retainer right now. */
export const clients = projects.filter((p) => p.current);

/**
 * Headline figures.
 *
 * `projectsDelivered` is the client's own count, relayed through the account lead
 * as "around 40–45, a few more in the pipeline". Stated as the conservative floor
 * (40+) until he confirms an exact number — understating is recoverable, the
 * reverse is not.
 */
export const stats = {
  projectsDelivered: 40,
  industriesServed: industries.length,
  serviceLines: services.length,
  onRetainer: clients.length,
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
