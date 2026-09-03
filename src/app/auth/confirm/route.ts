import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { destinationAfterAuth } from '@/lib/auth-destination';

/**
 * Where email confirmation and password recovery links land.
 *
 * They used to point at Supabase's own hosted /auth/v1/verify endpoint (what
 * the default {{ .ConfirmationURL }} template variable produces). That
 * endpoint verifies the token and then hands the session back as a URL *hash
 * fragment* (#access_token=...) — and a fragment is never sent to a server,
 * so nothing here could ever see it. Confirmed live by clicking a real
 * confirmation email: the token was accepted (email_confirmed_at got set),
 * the browser landed on the site, and no session existed on either side —
 * no cookie, no localStorage. Every email/password signup was silently
 * failing to actually log anyone in, and auth/callback's new-account
 * onboarding check — which needs a ?code= it was never going to get — could
 * not run for that path at all.
 *
 * The email templates now link here instead, carrying {{ .TokenHash }}, and
 * verifyOtp exchanges it for a real session server-side, written to cookies
 * by the SSR client. Same shape as the OAuth path in auth/callback, which
 * always worked precisely because it had a real code to exchange.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/home';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      // A recovery link is a returning user by definition, so this resolves
      // to `next` for them — the account-age check inside handles it rather
      // than this route needing to special-case the type.
      const destination = await destinationAfterAuth(supabase, data.user, next);
      return NextResponse.redirect(`${origin}${destination}`);
    }

    console.error('verifyOtp failed:', error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth-confirm-failed`);
}
