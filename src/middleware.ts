import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isPublicPath } from '@/lib/public-paths';
import {
  TWA_COOKIE,
  TWA_COOKIE_OPTIONS,
  TWA_COOKIE_VALUE,
  TWA_QUERY_PARAM,
  isTwaCookieValue,
  isTwaQuery,
} from '@/lib/twa';

// Routes reachable without an authenticated session. Anything else
// belongs to the (app) route group and redirects to / here, at the
// edge, before that route's JS bundle is ever fetched — previously an
// unauthenticated visitor downloaded the whole authenticated app shell
// (sidebar, Radix, framer-motion, Supabase auth-js) client-side first,
// then bounced to /login after the fact. /login itself no longer exists
// as a page — login is a modal on the landing page now — so this sends
// people to / instead, where "Log in" is one click away.
//
// /post/[id] is deliberately public too, matching how X/Instagram let
// you view a single shared post without an account — post.tsx already
// gates individual actions (like, reply) behind a login prompt rather
// than the whole page, and its generateMetadata() produces per-post
// title/description/image for link unfurling. Redirecting it to /login
// would mean every shared post link previews as the generic login page
// on WhatsApp/X/Discord instead of the actual post, since crawlers
// don't have a session cookie to get past a hard redirect.
//
// /opengraph-image, /twitter-image and /manifest.webmanifest are
// Next.js-generated root-level routes (not pages) that crawlers and
// browsers fetch directly - same reasoning applies.
//
// Team selection (onboarding/team) is deliberately NOT gated here. It used
// to be: any authenticated request with an empty favourite_club, on every
// route, forever, got redirected. That's a standing per-request check that
// has to agree with a client-side backstop about exactly when to render
// nothing — and on a returning user's ordinary login it blanked the whole
// app (the backstop returned null the instant it decided a redirect was
// needed, and if that redirect didn't land clean, nothing ever replaced
// the null). Team selection is now a one-time signup step, decided once in
// auth/callback/route.ts at the moment a session is first established —
// see NEW_ACCOUNT_WINDOW_MS there. A user who never finishes it just never
// gets asked again, which is the right trade-off for something this low-stakes.
//
// Installed Android app (TWA): the app launches with ?source=twa. That is the
// only signal available early enough to keep the request off the marketing
// homepage, so the first request writes a cookie and every later request reads
// it. Logged-out users in the app go to /welcome, never /. Browser visitors
// and crawlers see exactly what they saw before.

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const twaFromQuery = isTwaQuery(request.nextUrl.searchParams.get(TWA_QUERY_PARAM));
  const isTwa =
    twaFromQuery || isTwaCookieValue(request.cookies.get(TWA_COOKIE)?.value);

  const attachTwaCookie = (res: NextResponse) => {
    if (twaFromQuery) {
      res.cookies.set(TWA_COOKIE, TWA_COOKIE_VALUE, TWA_COOKIE_OPTIONS);
    }
    return res;
  };

  // Preserve Supabase's refreshed auth cookies when we redirect — otherwise a
  // token refresh that happened during this request would be lost.
  const redirectTo = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    for (const cookie of response.cookies.getAll()) {
      res.cookies.set(cookie);
    }
    return attachTwaCookie(res);
  };

  // /login is gone — anyone still hitting it (an old bookmark, a stale
  // link) lands on the real homepage instead of a 404. In the app that is
  // the welcome/login screen when logged out, and the feed when logged in.
  if (pathname === '/login') {
    return redirectTo(user ? '/home' : isTwa ? '/welcome' : '/');
  }

  if (user && pathname === '/welcome') {
    return redirectTo('/home');
  }

  // In the installed app, a logged-out launch must never render the marketing
  // page. Protected routes go to the same welcome screen rather than to /.
  if (!user && isTwa && (pathname === '/' || !isPublicPath(pathname))) {
    return redirectTo('/welcome');
  }

  if (!user && !isPublicPath(pathname)) {
    return redirectTo('/');
  }

  if (user && isTwa && pathname === '/') {
    return redirectTo('/home');
  }

  if (user && pathname === '/signup') {
    return redirectTo('/home');
  }

  return attachTwaCookie(response);
}

export const config = {
  matcher: [
    // sw.js and offline.html must never redirect — a redirected response is
    // an invalid service worker script, and a logged-out visitor with no
    // network is exactly who the offline fallback exists for.
    // .well-known/assetlinks.json must never redirect either — Android's
    // Digital Asset Links verifier fetches it directly and unauthenticated
    // to confirm the TWA package and this domain are the same app; a login
    // redirect there means Android never trusts the app, so it always shows
    // browser chrome instead of launching as a standalone TWA.
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|offline\\.html|\\.well-known/assetlinks\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
