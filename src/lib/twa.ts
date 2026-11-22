/**
 * Installed-app (TWA) detection.
 *
 * The Android app launches `/home?source=twa`. Middleware turns that into a
 * cookie before any page decides where to send the visitor, because a server
 * component/middleware redirect happens before `display-mode` or the Android
 * referrer are available in the browser.
 *
 * The cookie is also what lets later navigations (including `/` and a login
 * email link that lands on the site) keep the in-app experience: it is read
 * server-side on every request.
 */

export const TWA_COOKIE = 'bholo_twa';
export const TWA_COOKIE_VALUE = '1';
export const TWA_QUERY_PARAM = 'source';
export const TWA_QUERY_VALUE = 'twa';
export const TWA_REFERRER_PREFIX = 'android-app://za.co.bholofootball.www.twa';

/** One year, Lax, Secure in production. Readable by the client on purpose. */
export const TWA_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 365,
};

export function isTwaQuery(value: string | null | undefined): boolean {
  return value === TWA_QUERY_VALUE;
}

export function isTwaCookieValue(value: string | null | undefined): boolean {
  return value === TWA_COOKIE_VALUE;
}

/** Builds the cookie value the client fallbacks should write. */
export function buildTwaCookieString(): string {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  return [
    `${TWA_COOKIE}=${TWA_COOKIE_VALUE}`,
    'Path=/',
    `Max-Age=${60 * 60 * 24 * 365}`,
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

/** Reads the flag from a `document.cookie` string without touching the DOM. */
export function hasTwaCookie(cookieString: string): boolean {
  return cookieString
    .split(';')
    .some((part) => part.trim() === `${TWA_COOKIE}=${TWA_COOKIE_VALUE}`);
}
