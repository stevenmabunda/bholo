'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AuthModal } from '@/components/auth/auth-modal';
import { AuthTriggerButton } from '@/components/auth/auth-trigger-button';
import {
  AuthModalProvider,
  type AuthModalMode,
} from '@/contexts/auth-modal-context';

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/help', label: 'Help' },
  { href: '/feedback', label: 'Feedback' },
  { href: '/delete-account', label: 'Delete account' },
];

/**
 * Logged-out landing screen for the installed app.
 *
 * It reuses the website's current hero artwork, but keeps only the two things
 * an app user needs here: Create account and Log in. Both open the existing
 * auth dialog. No marketing nav, store badge or Shop link; the legal links are
 * the only footer.
 */
export function WelcomeHero({
  initialMode = 'login',
  initialOpen = false,
}: {
  initialMode?: AuthModalMode;
  initialOpen?: boolean;
}) {
  return (
    <AuthModalProvider initialMode={initialMode} initialOpen={initialOpen}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="flex flex-col items-center px-4 pt-6 text-center">
          <Image
            src="/bholo_logo.png"
            alt="BHOLO"
            width={120}
            height={48}
            priority
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Join Mzansi&apos;s football-exclusive social network.
          </p>
          <h1 className="mt-1 text-xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-2xl">
            Football, <span className="text-primary">Uninterrupted.</span>
          </h1>
        </header>

        <main className="flex w-full flex-1 flex-col items-center px-4 pb-4 pt-4">
          <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl border border-white/10">
            <Image
              src="/homepage/hero-gameday-collage.jpg"
              alt="BHOLO fans reacting to a match on their phones"
              fill
              priority
              unoptimized
              sizes="(max-width: 768px) 100vw, 448px"
              className="object-cover"
            />
          </div>

          <div className="mt-4 flex w-full max-w-md gap-3">
            <AuthTriggerButton
              mode="signup"
              size="lg"
              className="flex-[1.4] rounded-full px-4 text-sm sm:text-base"
            >
              Create account
            </AuthTriggerButton>
            <AuthTriggerButton
              mode="login"
              size="lg"
              variant="outline"
              className="flex-1 rounded-full border-white/40 px-4 text-sm text-white hover:bg-white/10 sm:text-base"
            >
              Log in
            </AuthTriggerButton>
          </div>
        </main>

        <footer className="px-4 pb-8 pt-2">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>

      <AuthModal />
    </AuthModalProvider>
  );
}
