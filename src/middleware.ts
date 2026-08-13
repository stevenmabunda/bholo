import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes reachable without an authenticated session. Anything else
// belongs to the (app) route group and redirects to /login here, at the
// edge, before that route's JS bundle is ever fetched — previously an
// unauthenticated visitor downloaded the whole authenticated app shell
// (sidebar, Radix, framer-motion, Supabase auth-js) client-side first,
// then bounced to /login after the fact.
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/auth/callback', '/terms', '/privacy', '/help', '/feedback'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

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
