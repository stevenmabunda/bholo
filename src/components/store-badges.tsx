'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTwaMode } from '@/hooks/use-twa';

/**
 * No live store links yet — App Store and Play Store URLs go here the
 * moment BHOLO's listings exist. Placeholder hrefs until then.
 */
const STORE_LINKS = {
  appStore: '#',
  playStore: '#',
};

/**
 * Store badges belong on the marketing site only. Inside the installed app
 * they are hidden entirely — a download prompt for the app you are already
 * using is exactly what Play's reviewers objected to.
 */
export function StoreBadges({ className }: { className?: string }) {
  const isTwa = useTwaMode();

  if (isTwa) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <a href={STORE_LINKS.appStore} className="transition-opacity hover:opacity-80">
        <Image
          src="/app-store-badge.svg"
          alt="Download on the App Store"
          width={120}
          height={40}
          unoptimized
          className="h-10 w-auto"
        />
      </a>
      <a href={STORE_LINKS.playStore} className="transition-opacity hover:opacity-80">
        <Image
          src="/google-play-badge.png"
          alt="Get it on Google Play"
          width={646}
          height={250}
          unoptimized
          className="h-14 w-auto"
        />
      </a>
    </div>
  );
}
