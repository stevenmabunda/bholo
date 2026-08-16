/**
 * The site's absolute base URL.
 *
 * Open Graph images have to be absolute — WhatsApp, Facebook and X fetch them
 * from their own servers, so a relative path resolves against nothing and the
 * preview silently falls back to a bare text link. Next needs `metadataBase`
 * set for that resolution to happen at all.
 *
 * NEXT_PUBLIC_SITE_URL wins so the production domain can be pinned. Otherwise
 * Vercel's production domain, then the per-deployment URL (so previews get
 * working cards too), then local dev.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.startsWith('http') ? explicit : `https://${explicit}`;

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;

  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment}`;

  return 'http://localhost:9002';
}

export const siteUrl = resolveSiteUrl();

/** Resolves a possibly-relative path into an absolute URL on this site. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, siteUrl).toString();
}
