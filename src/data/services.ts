/**
 * The 7 service lines. Each is also a landing page at /services/<slug>.
 *
 * SEO titles are intent-scoped, not geo-scoped: the agency delivers remotely and
 * takes work from anywhere, so "… in Yamunanagar" would have capped every page at
 * a town-sized audience. The studio's location still lives in the LocalBusiness
 * schema and the footer, where it belongs.
 */

export interface Service {
  slug: string;
  name: string;
  short: string;
  /** Homepage callout — one line, no marketing fluff. */
  blurb: string;
  /** Service page intro paragraph. */
  intro: string;
  items: readonly string[];
  seo: { title: string; description: string };
}

export const services: readonly Service[] = [
  {
    slug: 'social-media-management',
    name: 'Social Media Management',
    short: 'Management',
    blurb: 'Every platform handled for you — planned, posted and replied to.',
    intro:
      'We run your day-to-day presence across every platform that matters to your business — planning the calendar, publishing on time, and staying on top of comments and DMs so nothing goes cold.',
    items: [
      'Instagram Management',
      'Facebook Management',
      'YouTube Management',
      'LinkedIn Management',
      'X (Twitter) Management',
      'Google Business Profile Management',
    ],
    seo: {
      title: 'Social Media Management Services',
      description:
        'Day-to-day Instagram, Facebook, YouTube, LinkedIn and Google Business management — calendar, publishing, community replies and monthly reporting.',
    },
  },
  {
    slug: 'content-creation',
    name: 'Content Creation',
    short: 'Content',
    blurb: 'Reels, carousels and stories your audience actually watches.',
    intro:
      'Content that earns attention rather than filling a slot. We plan the strategy, write the scripts, and produce the reels, carousels and stories that actually get watched and shared.',
    items: [
      'Reels & Shorts',
      'Carousels & Posts',
      'Story Creation',
      'Content Strategy',
      'Script Writing',
      'Captions & Hashtags',
    ],
    seo: {
      title: 'Social Media Content Creation',
      description:
        'Reels, shorts, carousels, stories and content strategy built around what your audience actually stops for. Scripting, captions and hashtags included.',
    },
  },
  {
    slug: 'video-production',
    name: 'Video Production & Shoots',
    short: 'Video',
    blurb: 'Commercial, product, drone and brand films — shot properly, not on a phone.',
    intro:
      'A full production setup for businesses that need their product and space to look the part: commercial and product shoots, brand films, event coverage, drone work and podcast setups.',
    items: [
      'Commercial Shoots',
      'Product Shoots',
      'Brand Films',
      'Promotional Videos',
      'Corporate Videos',
      'Event Coverage',
      'Drone Shoots',
      'Podcast Shoots',
      'Cinematic Videos',
      'UGC Content',
    ],
    seo: {
      title: 'Video Production & Commercial Shoots',
      description:
        'Product shoots, brand films, drone and event coverage, corporate and cinematic video production — planned, shot and cut in house.',
    },
  },
  {
    slug: 'creative-design',
    name: 'Creative Design',
    short: 'Design',
    blurb: 'Posts, posters, ad creatives and print material that look professional.',
    intro:
      'Design that holds together across everything you publish — social posts and carousels, posters and banners, infographics, ad creatives and the print collateral that goes with them.',
    items: [
      'Social Media Posts',
      'Carousels',
      'Story Designs',
      'Posters',
      'Banners',
      'Infographics',
      'Branding Materials',
      'Ad Creatives',
    ],
    seo: {
      title: 'Creative & Graphic Design Services',
      description:
        'Social media creatives, posters, banners, infographics, ad creatives and branding material — one design system across everything you publish.',
    },
  },
  {
    slug: 'performance-marketing',
    name: 'Performance Marketing',
    short: 'Ads',
    blurb: 'Meta and Google ads measured on leads and sales, not likes.',
    intro:
      'Paid campaigns judged on what they return. We build and run Meta, Google and YouTube ads with proper tracking, remarketing and conversion campaigns — and report against cost per lead, not reach.',
    items: [
      'Meta Ads (Facebook + Instagram)',
      'Google Ads',
      'YouTube Ads',
      'Lead Generation',
      'Remarketing',
      'Conversion Campaigns',
    ],
    seo: {
      title: 'Performance Marketing — Meta & Google Ads',
      description:
        'Meta Ads, Google Ads, YouTube Ads, lead generation and remarketing — built with real tracking and reported on cost per lead, not reach.',
    },
  },
  {
    slug: 'website-development',
    name: 'Website & Development',
    short: 'Web',
    blurb: 'Fast business sites, storefronts and landing pages that convert.',
    intro:
      'Websites built to load fast and convert — business sites, e-commerce, and campaign landing pages, plus redesigns, speed work and ongoing maintenance on what you already have.',
    items: [
      'Business Websites',
      'E-commerce Websites',
      'Landing Pages',
      'Website Redesign',
      'Speed Optimization',
      'Maintenance',
    ],
    seo: {
      title: 'Website Design & Development',
      description:
        'Business websites, e-commerce stores, landing pages, redesigns and speed optimization — built to load fast and convert.',
    },
  },
  {
    slug: 'branding-identity',
    name: 'Branding & Identity',
    short: 'Branding',
    blurb: 'Logo, identity and packaging — the parts people remember you by.',
    intro:
      'The foundation everything else sits on: logo and identity systems, packaging, and the print collateral — cards, brochures, decks — that has to match once you start showing up everywhere.',
    items: [
      'Logo Design',
      'Brand Identity',
      'Packaging Design',
      'Visiting Cards',
      'Brochures',
      'Presentation Design',
    ],
    seo: {
      title: 'Branding, Logo & Identity Design',
      description:
        'Logo design, complete brand identity systems, packaging, visiting cards, brochures and presentation design — the parts people remember you by.',
    },
  },
] as const;

export const getService = (slug: string) => services.find((s) => s.slug === slug);
