'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AuthLayout({
  children,
  chromeless = false,
}: {
  children: ReactNode;
  /** The installed app's welcome screen: form only, no marketing collage. */
  chromeless?: boolean;
}) {
  if (chromeless) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm">
          {/* The installed app's welcome/sign-up screens keep the
              branded hero, but nothing from the marketing page around it. */}
          <div className="relative h-64 w-full sm:h-72">
            <Image
              src="/mobile-hero2.png"
              alt="BHOLO fans reacting to a match"
              fill
              sizes="(max-width: 640px) 100vw, 384px"
              className="object-contain"
              priority
            />
          </div>

          <div className="mb-5 flex flex-col items-center text-center">
            <Image
              src="/bholo_logo.png"
              alt="BHOLO"
              width={120}
              height={48}
              priority
            />
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              South Africa&apos;s football-exclusive social network.
            </p>
          </div>

          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1fr_auto_1fr]">
      <div className="relative hidden lg:flex items-center justify-center p-8">
         <Image
            src="/welcome2.jpg"
            alt="BHOLO welcome banner"
            fill
            // Only rendered from the lg breakpoint up, so it never needs a
            // mobile candidate.
            sizes="50vw"
            className="absolute inset-0 object-contain"
            priority
          />
      </div>

      {/* Centered Divider for Desktop */}
      <div className="hidden lg:flex justify-center items-center">
          <div className="h-1/2 w-px bg-white"></div>
      </div>

      <div className="flex flex-col items-center justify-center p-4">
        <div className={cn("lg:hidden w-full flex flex-col items-center text-center mb-1")}>
            <div className="relative w-full max-w-sm h-72">
              <Image src="/mobile-hero2.png" alt="BHOLO mobile hero" layout="fill" objectFit="contain" priority />
            </div>
            <Image src="/bholo_logo.png" alt="BHOLO Logo" width={120} height={48} priority />
            <p className={cn("mt-2 text-xl text-foreground")}>South Africa&apos;s football-exclusive social network.</p>
        </div>
        <div className="w-full max-w-sm">
            {children}
        </div>
      </div>
    </div>
  );
}
