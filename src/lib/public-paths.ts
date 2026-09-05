/**
 * Routes reachable without an account.
 *
 * Shared by the middleware and the app layout because both decide the same
 * thing and had drifted: the middleware let a logged-out visitor through to
 * /post/[id], and the layout then redirected them to /login anyway. A shared
 * link previewed correctly — crawlers only ever see the server render — and
 * then dumped whoever clicked it on a sign-in screen, which is the opposite of
 * what making those posts publicly readable was for.
 */
export const PUBLIC_PATHS = [
  // The marketing homepage. A logged-out visitor (and every search crawler —
  // Googlebot never has a session cookie) needs real content to land on
  // here; without this, "/" redirected straight to /login, which had ~40
  // characters of visible text and nothing for Google to index the site
  // under. page.tsx still sends a signed-in visitor on to /home itself —
  // this only stops the logged-out case from being redirected before it
  // ever renders. Exact match only: '/'.startsWith('//') is never true for
  // a real pathname, so this can't accidentally make everything public.
  '/',
  // Both auth landing routes must be reachable logged-out — that is the
  // entire population that clicks a confirmation or password-reset link.
  // /auth/confirm is what establishes the session in the first place, so
  // gating it behind having a session bounces every new signup to /login
  // before its handler ever runs.
  '/login', '/signup', '/forgot-password', '/auth/callback', '/auth/confirm',
  '/terms', '/privacy', '/help', '/feedback', '/delete-account',
  // A single shared post, the way X and Instagram let you read one without an
  // account. Individual actions on it still prompt for sign-in.
  '/post',
  // Next-generated root files that crawlers and browsers fetch directly.
  // sitemap.xml and robots.txt matter most here: Googlebot never carries a
  // session cookie, so without these both 307'd to /login just like every
  // other page did before "/" itself was made public.
  '/opengraph-image', '/twitter-image', '/manifest.webmanifest',
  '/sitemap.xml', '/robots.txt',
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
