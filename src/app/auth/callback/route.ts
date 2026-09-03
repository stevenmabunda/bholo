import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { destinationAfterAuth } from '@/lib/auth-destination';

/**
 * Where OAuth (Google) lands — a genuine authorization-code exchange.
 *
 * Email confirmation and password recovery do NOT come through here; they
 * carry a token hash rather than a code, and are handled by auth/confirm.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination = await destinationAfterAuth(supabase, data.user, next);
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
