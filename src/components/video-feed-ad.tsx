'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import type { ServableAd } from '@/lib/ads';
import { isVideoMedia } from '@/lib/ad-specs';
import { useAdImpression } from '@/hooks/use-ad-impression';
import { Button } from '@/components/ui/button';

/**
 * A full-screen slide in the immersive feed.
 *
 * The one placement where an ad occupies the whole screen, so it has to
 * announce itself harder than the others: the label sits top-left, over the
 * media, before anyone has scrolled past it — not tucked beside a caption.
 *
 * Video plays muted and looping like the clips around it. Sound is never
 * taken without asking; an ad that starts talking is the fastest way to make
 * someone close the app.
 */
export function VideoFeedAd({ ad, isActive }: { ad: ServableAd; isActive: boolean }) {
  const { ref, onClick } = useAdImpression(ad.creativeId);
  const showsVideo = isVideoMedia(ad.mediaUrl);

  return (
    <div ref={ref as React.Ref<HTMLDivElement>} data-promoted={ad.creativeId} className="relative h-full w-full bg-black">
      {ad.mediaUrl && (
        showsVideo ? (
          <video
            key={ad.mediaUrl}
            src={ad.mediaUrl}
            className="h-full w-full object-contain"
            // Only the slide in view plays; the rest stay parked so a scroll
            // through the feed is not ten videos decoding at once.
            autoPlay={isActive}
            muted
            loop
            playsInline
            preload={isActive ? 'auto' : 'none'}
          />
        ) : (
          <Image src={ad.mediaUrl} alt={ad.headline || ad.advertiserName} fill unoptimized sizes="100vw" className="object-contain" />
        )
      )}

      <div className="absolute left-3 top-4 z-10 flex items-center gap-2">
        <span className="rounded bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
          {ad.advertiserName}
        </span>
        <span className="rounded bg-black/60 px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/80 backdrop-blur-sm">
          Promoted
        </span>
      </div>

      <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-3 right-3 z-10 text-white">
        {ad.headline && <p className="font-bold leading-snug">{ad.headline}</p>}
        {ad.body && <p className="mt-1 line-clamp-2 text-sm text-white/80">{ad.body}</p>}

        {ad.destinationUrl && (
          <a
            href={ad.destinationUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={onClick}
            className="mt-3 inline-block"
          >
            <Button size="sm" variant="secondary" className="rounded-full">
              {ad.ctaLabel || 'Learn more'}
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
