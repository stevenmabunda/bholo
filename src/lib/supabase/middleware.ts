import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if needed — required for server actions/components
  // to see an authenticated user via cookies. The caller also uses this
  // result to redirect unauthenticated requests before any protected
  // route's JS bundle is fetched.
  const { data: { user } } = await supabase.auth.getUser();

  // Handed back so the caller can run its own cookie-bound query (the
  // onboarding-gate check in middleware.ts) without standing up a second
  // client against the same request.
  return { response: supabaseResponse, user, supabase };
}
