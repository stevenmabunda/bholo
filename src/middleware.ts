import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isPublicPath } from '@/lib/public-paths';
import { ONBOARDING_COOKIE, ONBOARDING_COOKIE_MAX_AGE } from '@/lib/onboarding';

const ONBOARDING_PATH = '/onboarding/team';

// Paths a logged-in-but-not-yet-onboarded user can still reach. Kept short
// on purpose — "can't move ahead without choosing a team" means the app
// itself is closed off, not just the feed. Auth/legal pages stay open
// because they're not "the app", and because a signed-in visitor reading
// the privacy policy shouldn't be forced through team selection first.
const ONBOARDING_EXEMPT_PATHS = [
  ONBOARDING_PATH,
  '/auth/callback',
  '/login',
  '/signup',
  '/forgot-password',
  '/terms',
  '/privacy',
  '/help',
  '/feedback',
];

function isOnboardingExempt(pathname: string): boolean {
  return ONBOARDING_EXEMPT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Routes reachable without an authenticated session. Anything else
// belongs to the (app) route group and redirects to /login here, at the
// edge, before that route's JS bundle is ever fetched — previously an
// unauthenticated visitor downloaded the whole authenticated app shell
// (sidebar, Radix, framer-motion, Supabase auth-js) client-side first,
// then bounced to /login after the fact.
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

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Onboarding gate. The cookie means this DB round trip only happens once
  // per browser, ever — every request after completion (or after this
  // check's own "yes, done" finding) reads the cookie and moves on, the
  // same reasoning as not re-checking auth state on every request without it.
  if (user) {
    const alreadyOnboarded = request.cookies.get(ONBOARDING_COOKIE)?.value === '1';

    if (!alreadyOnboarded) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('favourite_club')
        .eq('id', user.id)
        .single();

      const hasChosenTeam = !!profile?.favourite_club;

      if (hasChosenTeam) {
        // Self-heals anyone who chose a team before this cookie existed —
        // without this they'd hit the DB on every single request forever.
        response.cookies.set(ONBOARDING_COOKIE, '1', {
          maxAge: ONBOARDING_COOKIE_MAX_AGE,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
        });
      } else if (!isOnboardingExempt(pathname)) {
        return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
      }
    } else if (pathname === ONBOARDING_PATH) {
      // Already done — don't let them wander back in and re-pick.
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  return response;
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
