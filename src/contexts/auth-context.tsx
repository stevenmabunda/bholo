'use client';

import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

// Deciding "is this a brand-new account that still needs to pick a team"
// deliberately does NOT live here. It briefly did, on the assumption that a
// hash-fragment session would surface through onAuthStateChange — it never
// does; that listener stayed silent because the client never picks the
// fragment up at all. Both real entry points now settle it server-side
// before the browser ever renders: auth/callback for OAuth, auth/confirm
// for email links. See destinationAfterAuth in lib/auth-destination.ts.

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setResolved(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setResolved(true);
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
