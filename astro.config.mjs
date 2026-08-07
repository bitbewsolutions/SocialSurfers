// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output is the default. Nothing on this site needs a server at runtime —
// the enquiry form posts to a third-party endpoint, so the whole thing is a CDN drop.
export default defineConfig({
  site: 'https://www.socialsurfers.in',
  trailingSlash: 'never',
  compressHTML: true,

  // /services and /contact are sections of the homepage now. These keep any link
  // already in the wild (business profile, old brochure, a WhatsApp forward) landing
  // in the right place instead of on the 404. Static build → meta-refresh stubs.
  redirects: {
    '/services': '/#services',
    '/contact': '/#contact',
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
