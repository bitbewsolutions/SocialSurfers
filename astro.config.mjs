// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output is the default. Nothing on this site needs a server at runtime —
// the enquiry form posts to a third-party endpoint, so the whole thing is a CDN drop.
export default defineConfig({
  /* THE canonical host. It must match whatever Netlify has set as the primary domain,
     because the other form 301s to the primary — so a mismatch means every page
     carries a canonical pointing at a URL that redirects back to the page itself, and
     every sitemap entry is a redirect. Google resolves that eventually; Search Console
     reports the whole sitemap as "Page with redirect" in the meantime.

     Apex rather than www: it is what Netlify defaulted to, it is shorter, and it is
     what the client says out loud and prints. The one technical point for www is that
     it can CNAME to Netlify's edge while an apex needs an A record to a fixed IP (DNS
     forbids CNAME at a zone apex) — with Netlify's stable load-balancer address and
     DNS staying at GoDaddy, that is not worth the mismatch.

     Change this and you must also change `url` in src/data/site.ts and the Sitemap
     line in public/robots.txt. All three, or none. */
  site: 'https://socialsurfers.in',
  trailingSlash: 'never',
  compressHTML: true,

  // /services and /contact are sections of the homepage now. These keep any link
  // already in the wild (business profile, old brochure, a WhatsApp forward) landing
  // in the right place instead of on the 404. Static build → meta-refresh stubs.
  redirects: {
    '/services': '/#services',
    '/contact': '/#contact',
    /* The service list was rebuilt from the client's capability document and two
       slugs changed shape: video production folded into the wider photography and
       production line, and performance marketing became the broader digital
       marketing category it was always a part of. Both URLs were live in the
       preview builds he has been sent links to. */
    '/services/video-production': '/services/photography-production',
    '/services/performance-marketing': '/services/digital-marketing',
  },

  integrations: [
    sitemap({
      // the two redirect stubs are not content and must not be indexed
      filter: (page) => !/\/(services|contact)$/.test(page.replace(/\/$/, '')),
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  build: {
    // one stylesheet beats a waterfall of tiny ones on 4G
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssMinify: 'lightningcss',
    },
  },
});
