/**
 * Canonical business facts. Everything on the site reads from here so the NAP
 * (name/address/phone) is byte-identical across page copy, footer, and JSON-LD.
 *
 * The studio has a physical address in Yamunanagar and that stays — it is real,
 * it earns trust, and Google needs it for the Business Profile. What it is NOT is
 * a market boundary: the work is delivered remotely, so `areaServed` is worldwide
 * and no page copy or <title> is geo-scoped.
 */

export const site = {
  name: 'Social Surfers',
  legalName: 'Social Surfers',
  tagline: "Let's Surf Your Brand to the Social Waves.",
  category: 'Complete Social Media & Digital Marketing Solutions',
  voiceLine: "We don't just manage. We Grow Brands!",
  closingLine: 'Your Brand. Our Strategy. Real Growth.',
  reachLine: 'Working with brands across India and overseas.',

  url: 'https://www.socialsurfers.in',

  phone: '+918684010403',
  phoneDisplay: '+91 8684-010403',
  email: 'socialsurfersmedia@gmail.com',

  /** Studio address — a real place, not a service-area limit. */
  address: {
    street: 'Near Trikona Park, Model Town',
    city: 'Yamunanagar',
    region: 'Haryana',
    postalCode: '135001',
    country: 'IN',
  },
  addressDisplay: 'Near Trikona Park, Model Town, Yamunanagar, Haryana 135001',

  /** Approximate — replace with the exact pin from the client's Google Business Profile. */
  geo: { lat: 30.129, lng: 77.288 },

  openingHours: 'Mo-Sa 10:00-19:00',
  timezoneNote: 'Mon–Sat, 10:00–19:00 IST',

  /**
   * schema.org areaServed. Deliberately not a list of nearby towns — the work is
   * delivered remotely, so scoping it regionally would only tell Google to stop
   * showing the business to everyone else.
   */
  areaServed: 'Worldwide',

  /**
   * TODO(assets): confirm real handles with the client — these are best guesses.
   * `icon` keys map to the path data in components/Socials.astro.
   */
  socials: [
    { name: 'Instagram', icon: 'instagram', url: 'https://instagram.com/socialsurfersmedia' },
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/socialsurfersmedia' },
    { name: 'YouTube', icon: 'youtube', url: 'https://youtube.com/@socialsurfersmedia' },
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com/company/socialsurfersmedia' },
    { name: 'X', icon: 'x', url: 'https://x.com/socialsurfers' },
    { name: 'Pinterest', icon: 'pinterest', url: 'https://pinterest.com/socialsurfersmedia' },
  ],
} as const;

/** Prefilled WhatsApp deep link — the highest-converting channel for SMB leads here. */
export function waLink(message = "Hi Social Surfers! I'd like to know more about your services.") {
  return `https://wa.me/${site.phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
}

export const telLink = `tel:${site.phone}`;
export const mailLink = `mailto:${site.email}`;
