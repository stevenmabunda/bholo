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
  '/opengraph-image', '/twitter-image', '/manifest.webmanifest',
];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
