
'use client';

import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
        interval = setInterval(() => {
            setProgress(prev => {
                // If auth is loaded, jump to 100 and finish.
                if (authLoaded) {
                    if (prev < 100) return 100;
                    clearInterval(interval);
                    setTimeout(() => setLoading(false), 300); // Small delay for the 100% to show
                    return 100;
                }

                // Animate up to 90% and wait
                if (prev >= 90) {
                    return 90;
                }
                // Animate quickly at the start, then slow down
                const increment = prev < 50 ? 15 : 5;
                return Math.min(prev + increment, 90);
            });
        }, 100);
    }

    return () => clearInterval(interval);

  }, [loading, authLoaded]);


  const value = { user: session?.user ?? null, session, loading };

  if (loading) {
    const displayProgress = Math.min(progress, 100);
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-48">
                   <Image src="/bholo_logo.png" alt="BHOLO Logo" width={200} height={80} priority />
                </div>
                <p className="text-muted-foreground font-semibold">Banter them up in a few... {displayProgress}%</p>
                <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-150" style={{ width: `${displayProgress}%` }} />
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
