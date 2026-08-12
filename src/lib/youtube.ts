export function extractYoutubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');

  if (host === 'youtu.be') {
    return parsed.pathname.slice(1).split('/')[0] || null;
  }

  if (host === 'youtube.com' || host === 'music.youtube.com') {
    if (parsed.pathname === '/watch') {
      return parsed.searchParams.get('v');
    }
    const match = parsed.pathname.match(/^\/(?:live|embed|shorts)\/([^/?]+)/);
    if (match) return match[1];
  }

  return null;
}

/** Scans free text for the first YouTube link and returns its video ID, if any. */
export function findFirstYoutubeVideoId(text: string): string | null {
  const urlRegex = /(?:https?:\/\/|www\.)[^\s]+/g;
  const matches = text.match(urlRegex);
  if (!matches) return null;

  for (const raw of matches) {
    const href = raw.startsWith('www.') ? `http://${raw}` : raw;
    const id = extractYoutubeVideoId(href);
    if (id) return id;
  }
  return null;
}
