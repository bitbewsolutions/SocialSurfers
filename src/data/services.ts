/**
 * The service lines. Each is also a landing page at /services/<slug>.
 *
 * Expanded from 7 to 16 from the client's own capability document (services.txt at
 * the repo root, pasted from his docx). The categories and the `items` beneath them
 * are HIS list, not a rewrite of it — that document is what he sells, and inventing
 * a tidier taxonomy on top of it would only mean the site and his sales calls
 * describe different businesses.
 *
 * `short` is unused by any component and was dropped; `blurb` is the homepage card
 * line and `intro` opens the service page.
 *
 * SEO titles are intent-scoped, not geo-scoped: the agency delivers remotely and
 * takes work from anywhere, so "… in Yamunanagar" would have capped every page at a
 * town-sized audience. The studio's location still lives in the LocalBusiness schema.
 */

export interface Service {
  slug: string;
  name: string;
  /** Homepage card — one line, no marketing fluff. */
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
    blurb: 'Every platform handled for you — planned, posted and replied to.',
    intro:
      'We run your day-to-day presence across every platform that matters to your business — planning the calendar, publishing on time, and staying on top of comments and DMs so nothing goes cold.',
    items: [
      'Social Media Management',
      'Social Media Strategy',
      'Instagram Management',
      'Facebook Management',
      'LinkedIn Management',
      'YouTube Management',
      'Pinterest Management',
      'X / Twitter Management',
      'Social Media Calendar',
      'Community Management',
      'Social Media Optimization',
      'Profile Optimization',
      'Engagement Management',
      'Hashtag Strategy',
      'Trend Research',
      'Competitor Analysis',
      'Social Listening',
      'Monthly Analytics & Reporting',
    ],
    seo: {
      title: 'Social Media Management Services',
      description:
        'Day-to-day Instagram, Facebook, LinkedIn, YouTube and X management — calendar, publishing, community replies, social listening and monthly reporting.',
    },
  },
  {
    slug: 'content-creation',
    name: 'Content Creation',
    blurb: 'Reels, carousels and stories your audience actually watches.',
    intro:
      'Content that earns attention rather than filling a slot. We plan the strategy, write the scripts, and produce the reels, carousels and stories that actually get watched and shared.',
    items: [
      'Content Strategy',
      'Content Planning',
      'Creative Direction',
      'Copywriting',
      'Caption Writing',
      'Script Writing',
      'Short-Form Content',
      'Reels Creation',
      'Video Editing',
      'Motion Graphics',
      'Product Videos',
      'Brand Videos',
      'Promotional Videos',
      'Explainer Videos',
      'UGC Content',
      'Meme Marketing',
      'Story Content',
      'Carousel Design',
    ],
    seo: {
      title: 'Social Media Content Creation',
      description:
        'Reels, short-form video, carousels, UGC and motion graphics — strategy, scripting, editing and design handled end to end.',
    },
  },
  {
    slug: 'photography-production',
    name: 'Photography & Production',
    blurb: 'Product, brand and food shoots — shot properly, not on a phone.',
    intro:
      'Studio and on-location production for the images and footage your brand runs on. Product, food, fashion, corporate and lifestyle — lit and shot so the work holds up on a feed, a storefront and a billboard alike.',
    items: [
      'Product Photography',
      'Product Videography',
      'Brand Photoshoots',
      'Model Photoshoots',
      'Fashion Shoots',
      'Food Photography',
      'Food Videography',
      'Corporate Photography',
      'Corporate Videography',
      'Lifestyle Photography',
      'E-Commerce Photography',
      'Studio Production',
      'On-Location Shoots',
      'Reel Production',
      'Video Production',
    ],
    seo: {
      title: 'Product Photography & Video Production',
      description:
        'Product, food, fashion, corporate and lifestyle photography and video — studio and on-location production for brands and e-commerce.',
    },
  },
  {
    slug: 'branding-identity',
    name: 'Branding & Identity',
    blurb: 'Logo, identity and packaging — the parts people remember you by.',
    intro:
      'The work that decides what your business looks and sounds like before anyone reads a word. Strategy and positioning first, then the identity system that carries it across everything you print and publish.',
    items: [
      'Brand Strategy',
      'Brand Positioning',
      'Brand Naming',
      'Logo Design',
      'Brand Identity',
      'Visual Identity',
      'Brand Guidelines',
      'Typography',
      'Color Systems',
      'Packaging Design',
      'Business Cards',
      'Brochures',
      'Company Profiles',
      'Marketing Collateral',
      'Brand Refresh / Rebranding',
    ],
    seo: {
      title: 'Branding & Brand Identity Design',
      description:
        'Brand strategy, positioning, naming, logo and full visual identity systems — with guidelines, packaging and collateral built to match.',
    },
  },
  {
    slug: 'website-development',
    name: 'Website Development',
    blurb: 'Fast business sites, storefronts and landing pages that convert.',
    intro:
      'Websites built to be quick, findable and easy to update. Design through to deployment, with the maintenance and security work that keeps a site healthy after launch rather than only at it.',
    items: [
      'Website Design',
      'UI/UX Design',
      'Landing Pages',
      'Business Websites',
      'Corporate Websites',
      'E-Commerce Websites',
      'Portfolio Websites',
      'Custom Web Development',
      'Responsive Web Design',
      'Frontend Development',
      'Backend Development',
      'CMS Development',
      'API Integration',
      'Payment Gateway Integration',
      'Website Maintenance',
      'Website Security',
      'Website Optimization',
    ],
    seo: {
      title: 'Website Design & Development',
      description:
        'Business websites, landing pages and custom web development — responsive, fast, CMS-backed, with maintenance and security included.',
    },
  },
  {
    slug: 'ecommerce',
    name: 'E-Commerce',
    blurb: 'Shopify and WooCommerce stores built to sell, not just to exist.',
    intro:
      'Storefronts set up properly end to end — build, product listings, payments, shipping and inventory — then tuned on the numbers that decide whether a visit becomes an order.',
    items: [
      'Shopify Development',
      'WooCommerce Development',
      'Product Listing',
      'Store Design',
      'Store Optimization',
      'Product Page Optimization',
      'Conversion Optimization',
      'Payment Integration',
      'Shipping Integration',
      'Inventory Integration',
      'E-Commerce SEO',
      'Marketplace Management',
    ],
    seo: {
      title: 'E-Commerce Development — Shopify & WooCommerce',
      description:
        'Shopify and WooCommerce stores: build, product listings, payment and shipping integration, marketplace management and conversion optimisation.',
    },
  },
  {
    slug: 'ui-ux-design',
    name: 'UI/UX & Design',
    blurb: 'Interfaces designed around what people are actually trying to do.',
    intro:
      'Research, wireframes and prototypes before pixels, so what gets built is worth building. For websites, apps and dashboards — including the design system that keeps it consistent as it grows.',
    items: [
      'UI Design',
      'UX Design',
      'Website UI/UX',
      'Mobile App UI',
      'Wireframing',
      'Prototyping',
      'Design Systems',
      'User Research',
      'User Journey Mapping',
      'Interaction Design',
      'Landing Page Design',
      'Dashboard Design',
    ],
    seo: {
      title: 'UI/UX Design Services',
      description:
        'User research, journey mapping, wireframes, prototypes and design systems for websites, mobile apps and dashboards.',
    },
  },
  {
    slug: 'digital-marketing',
    name: 'Digital Marketing',
    blurb: 'Meta and Google ads measured on leads and sales, not likes.',
    intro:
      'Paid campaigns run against a number that matters to the business. Strategy, creative, funnels and tracking — with the reporting to show what each rupee returned rather than how many people saw it.',
    items: [
      'Digital Marketing Strategy',
      'Performance Marketing',
      'Meta Ads',
      'Instagram Ads',
      'Facebook Ads',
      'Google Ads',
      'YouTube Ads',
      'Display Advertising',
      'Remarketing',
      'Lead Generation',
      'Conversion Optimization',
      'Marketing Funnels',
      'Campaign Management',
      'Analytics & Tracking',
    ],
    seo: {
      title: 'Digital & Performance Marketing',
      description:
        'Meta, Instagram, Facebook, Google and YouTube ads — strategy, funnels, remarketing, campaign management and conversion tracking.',
    },
  },
  {
    slug: 'seo',
    name: 'SEO',
    blurb: 'Getting found for what your customers actually search for.',
    intro:
      'Technical, on-page and off-page work aimed at the searches that bring buyers rather than traffic. Including local SEO and Google Business Profile, which is where most enquiries for a regional business begin.',
    items: [
      'SEO Strategy',
      'Technical SEO',
      'On-Page SEO',
      'Off-Page SEO',
      'Local SEO',
      'E-Commerce SEO',
      'Keyword Research',
      'Competitor SEO',
      'Content SEO',
      'Link Building',
      'Google Business Profile Optimization',
      'SEO Audits',
      'SEO Reporting',
    ],
    seo: {
      title: 'SEO Services — Technical, Local & E-Commerce',
      description:
        'Technical, on-page, off-page and local SEO — keyword research, audits, link building, Google Business Profile optimisation and reporting.',
    },
  },
  {
    slug: 'influencer-marketing',
    name: 'Influencer & Creator Marketing',
    blurb: 'The right creators for your brand, and proof it worked.',
    intro:
      'Finding creators whose audience is actually yours, handling the outreach and the campaign, and tracking what came back — so a collaboration is a channel rather than a favour.',
    items: [
      'Influencer Marketing',
      'Creator Collaborations',
      'Influencer Research',
      'Influencer Outreach',
      'Campaign Management',
      'UGC Campaigns',
      'Brand Collaborations',
      'Creator Strategy',
      'Influencer Performance Tracking',
    ],
    seo: {
      title: 'Influencer & Creator Marketing',
      description:
        'Creator research, outreach, collaborations and UGC campaigns — managed end to end with performance tracking on every partnership.',
    },
  },
  {
    slug: 'lead-generation',
    name: 'Lead Generation',
    blurb: 'Enquiries into your inbox, and a system that follows them up.',
    intro:
      'Campaigns, landing pages and forms built to produce enquiries, wired into your CRM and WhatsApp so leads get answered while they are still warm instead of piling up.',
    items: [
      'Lead Generation Strategy',
      'Landing Pages',
      'Lead Ads',
      'WhatsApp Lead Generation',
      'Form-Based Lead Generation',
      'Funnel Development',
      'CRM Integration',
      'Lead Nurturing',
      'Conversion Optimization',
    ],
    seo: {
      title: 'Lead Generation Services',
      description:
        'Lead ads, landing pages, WhatsApp and form-based lead generation — funnels, CRM integration and nurturing built in.',
    },
  },
  {
    slug: 'marketing-automation',
    name: 'Marketing Automation',
    blurb: 'Email, WhatsApp and CRM flows that run without you.',
    intro:
      'The follow-up that usually gets forgotten, set up once and left running. Email, WhatsApp and SMS journeys triggered by what a customer actually does, connected to your CRM.',
    items: [
      'Email Marketing',
      'WhatsApp Marketing',
      'SMS Marketing',
      'Marketing Automation',
      'CRM Automation',
      'Lead Automation',
      'Customer Journey Automation',
      'Retargeting Automation',
    ],
    seo: {
      title: 'Marketing Automation — Email, WhatsApp & CRM',
      description:
        'Email, WhatsApp and SMS marketing with CRM and lead automation — customer journeys and retargeting that run on their own.',
    },
  },
  {
    slug: 'app-development',
    name: 'App Development',
    blurb: 'Android, iOS and web apps, built and maintained properly.',
    intro:
      'Mobile and web applications from scoping through to release — native, cross-platform or web — including the APIs, dashboards and integrations they need behind them.',
    items: [
      'Mobile App Development',
      'Android Development',
      'iOS Development',
      'Cross-Platform Apps',
      'Web Apps',
      'SaaS Development',
      'Custom Software',
      'Dashboard Development',
      'API Development',
      'Third-Party Integrations',
    ],
    seo: {
      title: 'Mobile & Web App Development',
      description:
        'Android, iOS, cross-platform and web app development — SaaS, custom software, dashboards, APIs and third-party integrations.',
    },
  },
  {
    slug: 'ai-solutions',
    name: 'AI & Automation',
    blurb: 'Chatbots and automations that take the repetitive work off your desk.',
    intro:
      'Practical AI, not novelty: support chatbots that answer the questions you get fifty times a week, and automations that remove the manual steps between an enquiry and a sale.',
    items: [
      'AI Content Solutions',
      'AI Chatbots',
      'AI Customer Support',
      'AI Automation',
      'AI Marketing',
      'AI-Powered Workflows',
      'Business Process Automation',
      'AI Integrations',
      'Custom AI Solutions',
    ],
    seo: {
      title: 'AI Solutions & Business Automation',
      description:
        'AI chatbots, customer support, content and marketing automation — AI-powered workflows and business process automation built around your operations.',
    },
  },
  {
    slug: 'creative-design',
    name: 'Creative Design',
    blurb: 'Posters, ad creatives and print material that look professional.',
    intro:
      'The everyday design work a brand gets through: ad creatives, social posts, banners, brochures, decks and print. Consistent with your identity, and turned around quickly.',
    items: [
      'Graphic Design',
      'Social Media Creatives',
      'Ad Creatives',
      'Banner Design',
      'Poster Design',
      'Brochure Design',
      'Catalogue Design',
      'Presentation Design',
      'Infographics',
      'Thumbnail Design',
      'Packaging Design',
      'Print Design',
    ],
    seo: {
      title: 'Graphic & Creative Design Services',
      description:
        'Ad creatives, social media designs, banners, posters, brochures, catalogues, presentations, infographics and print design.',
    },
  },
  {
    slug: 'reputation-growth',
    name: 'Reputation & Growth',
    blurb: 'What people find when they look you up — managed, not left to chance.',
    intro:
      'Reviews, ratings and the general impression a search leaves. We manage what is there, build the habits that earn better, and audit the whole digital presence so you know where you actually stand.',
    items: [
      'Online Reputation Management',
      'Google Reviews Management',
      'Brand Reputation',
      'Customer Engagement',
      'Community Building',
      'Growth Strategy',
      'Competitor Intelligence',
      'Brand Audits',
      'Digital Presence Audit',
    ],
    seo: {
      title: 'Online Reputation Management & Growth',
      description:
        'Reputation and Google reviews management, community building, competitor intelligence, brand audits and digital presence audits.',
    },
  },
] as const;
