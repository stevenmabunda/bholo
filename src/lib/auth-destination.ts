import type { SupabaseClient, User } from '@supabase/supabase-js';

/** How fresh an account has to be, at its first authenticated request, to
 *  count as "just signed up" rather than "logging back in". Generous enough
 *  to cover the real delay of clicking an email confirmation link; tight
 *  enough that a returning user's account — always far older by the time
 *  they're here — never matches. */
const NEW_ACCOUNT_WINDOW_MS = 5 * 60 * 1000;

/**
 * Where to send someone the moment their session is first established.
 *
 * Shared by both server-side entry points, which is the whole point: Google
 * OAuth arrives at auth/callback with a real authorization code, email
 * confirmation arrives at auth/confirm with a token hash, and both need to
 * make the same "does this person still need to pick a team" decision. It
 * was previously only in the callback route, which is exactly why email
 * signups never got asked.
 */
export async function destinationAfterAuth(
  supabase: SupabaseClient,
  user: User | null,
  fallback: string
): Promise<string> {
  if (!user) return fallback;

  const isNewAccount = Date.now() - new Date(user.created_at).getTime() < NEW_ACCOUNT_WINDOW_MS;
  if (!isNewAccount) return fallback;

  const { data: profile } = await supabase
    .from('profiles')
    .select('favourite_club')
    .eq('id', user.id)
    .single();

  return profile?.favourite_club ? fallback : '/onboarding/team';
}
