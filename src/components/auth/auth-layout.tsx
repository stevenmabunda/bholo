'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AuthLayout({ children }: { children: ReactNode }) {
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
            <p className={cn("mt-2 text-xl text-foreground")}>Welcome to the football banter app.</p>
        </div>
        <div className="w-full max-w-sm">
            {children}
        </div>
      </div>
    </div>
  );
}
