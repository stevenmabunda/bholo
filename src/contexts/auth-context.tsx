'use client';

import { createContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

/** Matches auth/callback/route.ts's NEW_ACCOUNT_WINDOW_MS — kept as a
 *  separate constant rather than shared, since the two checks run in
 *  genuinely different runtimes (this one client-side) and have no other
 *  reason to import from each other. */
const NEW_ACCOUNT_WINDOW_MS = 5 * 60 * 1000;

/**
 * Email/password signups never actually reach auth/callback/route.ts's
 * server-side new-account check. Confirmed live: the client here never
 * writes a PKCE code_verifier to localStorage on signUp(), so Supabase's
 * confirmation email delivers the session as a URL hash fragment
 * (#access_token=...), not a ?code= query param — fragments never reach
 * the server at all. The only place that session is ever actually visible
 * is right here, once the browser's Supabase client parses the hash on
 * load and this fires with a fresh session — so this is the one true
 * place "did this account just sign up, and do they still need to pick a
 * team" can be decided for that path. Google OAuth's new-signup redirect
 * still happens server-side (it's a genuine code exchange there), and
 * running this same check again once that lands is a harmless no-op —
 * already on /onboarding/team, replace() to the same path does nothing
 * visible.
 */
async function redirectNewAccountToOnboarding(
  user: User,
  router: ReturnType<typeof useRouter>
) {
  const isNewAccount = Date.now() - new Date(user.created_at).getTime() < NEW_ACCOUNT_WINDOW_MS;
  if (!isNewAccount) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('favourite_club')
    .eq('id', user.id)
    .single();

  if (!profile?.favourite_club) {
    router.replace('/onboarding/team');
  }
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: User | null;
}) {
  const [session, setSession] = useState<Session | null>(null);
  // The server already resolved the session from cookies (see the root
  // layout). When it hands us a user, we know who this is on the very
  // first render — no loading gate, and every child (PostProvider, the
  // query cache) mounts and starts fetching immediately instead of
  // waiting on a client-side round trip we didn't need.
  const [user, setUser] = useState<User | null>(initialUser);
  const [resolved, setResolved] = useState(!!initialUser);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setResolved(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setResolved(true);

      // SIGNED_IN also fires on an ordinary returning login — that's
      // exactly why redirectNewAccountToOnboarding re-checks account age
      // itself rather than trusting this event name alone.
      if (event === 'SIGNED_IN' && newSession?.user) {
        void redirectNewAccountToOnboarding(newSession.user, router);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loading = !resolved;
  const value = { user, session, loading };

  // Only gate rendering when we genuinely don't know who the user is
  // yet (i.e. the server had no session to hand us). Previously this
  // ran an artificial progress animation — ~1s to crawl to 90%, then a
  // further 300ms timeout — which blocked the whole app tree on every
  // load regardless of how fast auth actually resolved.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-48">
            <Image src="/bholo_logo.png" alt="BHOLO Logo" width={200} height={80} priority />
          </div>
          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-primary animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  );
}
