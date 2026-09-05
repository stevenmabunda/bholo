import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/**
 * Feeds Next's auto-generated /robots.txt. Didn't exist here before —
 * Cloudflare was auto-injecting its own default robots.txt at the edge
 * (a "Content-Signal" block, mostly about AI-training crawlers), which
 * happened to already allow Googlebot but never pointed at a sitemap
 * because there wasn't one yet. This gives the origin something real to
 * serve; Cloudflare's own block may still get appended in front of it,
 * which is fine — the rules here don't conflict with it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Nothing behind a login wall is worth a crawl budget — every one
        // of these redirects to /login for a session-less request anyway.
        disallow: ['/home', '/profile', '/messages', '/notifications', '/bookmarks', '/explore', '/search', '/onboarding', '/admin', '/creators', '/video', '/live', '/fixtures'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
