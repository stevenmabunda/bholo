import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isPublicPath } from '@/lib/public-paths';

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
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
