'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type AuthModalMode = 'login' | 'signup';

type AuthModalContextType = {
  isOpen: boolean;
  mode: AuthModalMode;
  openLogin: () => void;
  openSignup: () => void;
  close: () => void;
};

const AuthModalContext = createContext<AuthModalContextType | null>(null);

/**
 * Lets the landing page open the login/signup form as an overlay instead of
 * navigating to /login or /signup — those pages have their own full hero
 * section, which made "click Join" trade one landing page for another
 * instead of just letting someone sign up. This wraps the landing page's
 * server-rendered content (not the buttons — see AuthTriggerButton) so the
 * heading/copy/images stay plain server output for crawlers, and only the
 * handful of interactive buttons and the dialog itself are client-side.
 *
 * /login and /signup keep working exactly as before for anyone who lands on
 * them directly — a bookmark, a shared link, or middleware sending a
 * logged-out visitor away from a protected route. This only changes what
 * the landing page's own buttons do.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>('login');

  const value = useMemo<AuthModalContextType>(
    () => ({
      isOpen,
      mode,
      openLogin: () => {
        setMode('login');
        setIsOpen(true);
      },
      openSignup: () => {
        setMode('signup');
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
    }),
    [isOpen, mode]
  );

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal(): AuthModalContextType {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return ctx;
}
