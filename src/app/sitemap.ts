import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/**
 * Feeds Next's auto-generated /sitemap.xml route. Existed nowhere before
 * this — the URL 307'd straight to /login, same as every other route, so
 * Google had no map of what pages on the site were worth crawling at all.
 *
 * Only the genuinely public, logged-out-reachable pages belong here (see
 * public-paths.ts) — there's no point listing /home or /profile/[id], since
 * a crawler hitting them without a session just gets redirected to /login.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/feedback`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/delete-account`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
