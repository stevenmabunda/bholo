/**
 * The social accounts a profile can point at.
 *
 * Handles are stored, never URLs. The link is built here, so there is no
 * user-supplied scheme or domain reaching an href — which is the whole reason
 * these are separate fields rather than one "paste your link" box.
 */
export const SOCIAL_NETWORKS = ['x', 'instagram', 'tiktok', 'facebook'] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type Socials = Partial<Record<SocialNetwork | 'website', string>>;

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  x: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

const BASE: Record<SocialNetwork, string> = {
  x: 'https://x.com/',
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  facebook: 'https://facebook.com/',
};

/**
 * Reduces whatever someone typed to a bare handle.
 *
 * People paste the whole URL however often you ask them not to, so accept it
 * and take the last path segment. Query strings go with it, which is how the
 * tracking junk TikTok appends gets dropped.
 */
export function normaliseHandle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  let value = trimmed;
  if (/^https?:\/\//i.test(value) || value.includes('/')) {
    value = value.split(/[?#]/)[0].replace(/\/+$/, '').split('/').pop() ?? '';
  }
  return value.replace(/^@+/, '');
}

/** A handle is plausible, or it is not stored. */
export function isValidHandle(handle: string): boolean {
  return /^[A-Za-z0-9._-]{1,50}$/.test(handle);
}

export function socialUrl(network: SocialNetwork, handle: string): string {
  return BASE[network] + encodeURIComponent(handle);
}

/**
 * A website is the one free-form field, so it is the one that needs guarding.
 * Anything that is not plain http(s) is refused — `javascript:` and `data:`
 * URLs in an href are how a link becomes an attack.
 */
export function websiteUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Strips anything unrecognised or malformed before it reaches the database. */
export function cleanSocials(input: Socials): Socials {
  const out: Socials = {};
  for (const network of SOCIAL_NETWORKS) {
    const handle = normaliseHandle(input[network] ?? '');
    if (handle && isValidHandle(handle)) out[network] = handle;
  }
  const site = websiteUrl(input.website ?? '');
  if (site) out.website = site;
  return out;
}
