'use client';

import Image from 'next/image';
import { AuthModal } from '@/components/auth/auth-modal';
import { AuthTriggerButton } from '@/components/auth/auth-trigger-button';
import {
  AuthModalProvider,
  type AuthModalMode,
} from '@/contexts/auth-modal-context';

/**
 * Logged-out landing screen for the installed app.
 *
 * It reuses the website's current hero artwork and heading, but keeps only
 * the two things an app user needs here: Create account and Log in. Both
 * open the existing auth dialog over the hero; there is no marketing nav,
 * store badge, Shop link, header or footer.
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
        <header className="flex flex-col items-center gap-2 px-4 pt-8 text-center">
          <Image
            src="/bholo_logo.png"
            alt="BHOLO"
            width={120}
            height={48}
            priority
          />
          <p className="text-sm text-muted-foreground">
            Join Mzansi&apos;s football-exclusive social network.
          </p>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-6">
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
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/55"
              aria-hidden
            />

            <div className="absolute inset-x-4 top-4 sm:inset-x-6 sm:top-6">
              <h1 className="text-2xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-3xl">
                Football, <span className="text-primary">Uninterrupted.</span>
              </h1>
            </div>

            <div className="absolute inset-x-4 bottom-4 flex gap-3 sm:inset-x-6 sm:bottom-6">
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
                className="flex-1 rounded-full border-white/40 bg-transparent px-4 text-sm text-white hover:bg-white/10 sm:text-base"
              >
                Log in
              </AuthTriggerButton>
            </div>
          </div>
        </main>
      </div>

      <AuthModal />
    </AuthModalProvider>
  );
}
