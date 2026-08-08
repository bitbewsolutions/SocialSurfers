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
  /* Set in the brochure's handwriting, and punctuated as it is there — a comma, not
     a full stop, so the two halves read as one breath. `.fontsrc/subset.py` derives
     the script font's character set from this exact string: change it, re-run it. */
  voiceLine: "We don't just manage, We Grow Brands!",
  closingLine: 'Your Brand. Our Strategy. Real Growth.',
  reachLine: 'Working with brands across India and overseas.',

  url: 'https://www.socialsurfers.in',

  phone: '+918684010403',
  phoneDisplay: '+91 8684-010403',
  email: 'socialsurfersmedia@gmail.com',

  /**
   * Studio address — a real place, not a service-area limit.
   *
   * This is now SCHEMA ONLY. The client asked for the visible address to be the two
   * states and nothing else, so no page renders the street any more; `locations`
   * below is what the footer and contact block print. The full record stays here
   * because the Google Business Profile is matched on it — dropping it from the
   * JSON-LD would cost the local listing, which is the opposite of what he wants.
   */
  address: {
    street: 'Near Trikona Park, Model Town',
    city: 'Yamunanagar',
    region: 'Haryana',
    postalCode: '135001',
    country: 'IN',
  },
  addressDisplay: 'Near Trikona Park, Model Town, Yamunanagar, Haryana 135001',

  /**
   * What the page actually shows. Chandigarh is a second location with no street
   * address of its own; only the Haryana studio is a registered place, which is why
   * exactly one of these appears in the LocalBusiness schema.
   */
  locations: ['Haryana', 'Chandigarh'],

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
   * Confirmed by the client. Instagram is the only channel he runs, so it is the
   * only one listed — a row of icons where five lead to 404s costs more trust than
   * the row buys. components/Socials.astro still carries the path data for the other
   * five; adding one back is a line here plus nothing else.
   */
  socials: [
    {
      name: 'Instagram',
      icon: 'instagram',
      handle: '@socialsurfersofficial',
      url: 'https://www.instagram.com/socialsurfersofficial',
    },
  ],
} as const;

/** Prefilled WhatsApp deep link — the highest-converting channel for SMB leads here. */
export function waLink(message = "Hi Social Surfers! I'd like to know more about your services.") {
  return `https://wa.me/${site.phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
}

export const telLink = `tel:${site.phone}`;
export const mailLink = `mailto:${site.email}`;
