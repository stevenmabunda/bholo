import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** How fresh an account has to be, right here at its first authenticated
 *  request, to count as "just signed up" rather than "logging back in".
 *  Generous enough to cover the real delay of clicking an email
 *  confirmation link; tight enough that a genuine returning user's account
 *  — always many minutes to years old by the time they're here — never
 *  matches it. */
const NEW_ACCOUNT_WINDOW_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Team selection is a signup step, not a standing gate re-checked on
      // every future login — a version of this that redirected any user
      // with an empty favourite_club, on every request, forever, is what
      // used to live in middleware.ts. It blanked the whole app on a
      // returning user's ordinary login (the redirect fired from a client
      // layout that had already rendered null in the meantime, and if the
      // navigation didn't land clean, nothing ever replaced that null).
      // Checked here instead: this route only ever runs once, at the exact
      // moment a session is first established for this browser, so "is
      // the account itself new" is the one signal it actually needs.
      const user = data.user;
      const isNewAccount =
        !!user && Date.now() - new Date(user.created_at).getTime() < NEW_ACCOUNT_WINDOW_MS;

      if (isNewAccount) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('favourite_club')
          .eq('id', user.id)
          .single();

        if (!profile?.favourite_club) {
          return NextResponse.redirect(`${origin}/onboarding/team`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
