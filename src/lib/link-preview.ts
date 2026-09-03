'use server';

import { createClient } from '@/lib/supabase/server';
import { websiteUrl } from '@/lib/socials';

export type LinkPreviewData = {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName: string;
};

const FETCH_TIMEOUT_MS = 6000;
// Open Graph tags always live in <head>, which is always near the top of the
// document — capping the read here bounds both how long a slow/huge page can
// hold the request open and how much of an attacker-controlled response this
// ever has to buffer.
const MAX_BYTES = 300_000;

/**
 * Best-effort SSRF guard: rejects the obvious internal targets by hostname
 * before ever making a request. This is not exhaustive — it does not
 * re-validate hosts a redirect chain lands on — but it stops a pasted
 * "http://localhost:5432" or "http://169.254.169.254/" from being reached
 * with this server's own network access.
 */
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) return true;
  if (host === '0.0.0.0' || host === '::1') return true;

  // IPv4 literal — check the well-known private/link-local/loopback ranges.
  const parts = host.split('.');
  if (parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  }
  return false;
}

function extractMeta(html: string, property: string): string | undefined {
  // Attribute order varies (property before/after content), so two patterns.
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return undefined;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'");
}

/**
 * Fetches a pasted URL server-side and pulls its Open Graph tags for a link
 * card — the same "image + title + domain" preview X and most publishers'
 * own share buttons produce. Auth-gated so this can't become an open
 * URL-fetching proxy for anonymous callers.
 */
export async function getLinkPreview(rawUrl: string): Promise<LinkPreviewData | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You need to be logged in.' };

  const normalised = websiteUrl(rawUrl);
  if (!normalised) return { error: 'Not a valid URL.' };

  const target = new URL(normalised);
  if (isBlockedHost(target.hostname)) return { error: 'That URL cannot be previewed.' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // A generic browser UA — some publishers serve a no-JS bot page (or
        // refuse the request outright) to unrecognised fetchers.
        'User-Agent': 'Mozilla/5.0 (compatible; BholoLinkPreview/1.0; +https://bholofootball.co.za)',
        Accept: 'text/html',
      },
    });
    if (!res.ok || !res.body) return { error: `Could not reach that page (${res.status}).` };

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return { error: "That link isn't a webpage." };

    // Read only up to MAX_BYTES rather than the whole response.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    let bytesRead = 0;
    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel().catch(() => {});

    const ogTitle = extractMeta(html, 'og:title');
    const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = ogTitle ?? (titleTagMatch?.[1] ? decodeHtmlEntities(titleTagMatch[1].trim()) : undefined);
    if (!title) return { error: 'No preview available for that link.' };

    let image = extractMeta(html, 'og:image');
    if (image && !/^https?:\/\//i.test(image)) {
      // Relative og:image ("/images/foo.jpg") resolved against the page.
      image = new URL(image, target).toString();
    }

    const description = extractMeta(html, 'og:description');
    const siteName = extractMeta(html, 'og:site_name') ?? target.hostname.replace(/^www\./, '');

    return { url: target.toString(), title, description, image, siteName };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    console.error('getLinkPreview failed:', error);
    return { error: timedOut ? 'That page took too long to load.' : 'Could not load a preview for that link.' };
  } finally {
    clearTimeout(timeout);
  }
}
