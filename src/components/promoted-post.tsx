'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { ServableAd } from '@/lib/ads';
import { renderAspect, MAX_AD_SCREEN_SHARE } from '@/lib/ad-specs';
import { MAX_IMAGE_HEIGHT_PX } from '@/lib/media-aspect';
import { useAdImpression } from '@/hooks/use-ad-impression';

/**
 * A paid slot in the feed.
 *
 * Counted the way advertisers expect it to be counted: an impression is 50% of
 * the unit visible for one continuous second, not "the server sent it". Those
 * are very different numbers, and billing on the second one is billing for ads
 * nobody saw.
 */


export function PromotedPost({ ad }: { ad: ServableAd }) {
  const { ref, onClick } = useAdImpression(ad.creativeId);

  return (
    <article
      ref={ref}
      className="border-b p-3 md:p-4"
      data-promoted={ad.creativeId}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-bold">{ad.advertiserName}</span>
        {/* Unmissable by design. Under-labelling a paid slot is the fastest
            way to lose a feed's credibility, and banter audiences are
            unforgiving about it. */}
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Promoted
        </span>
      </div>

      {ad.headline && <p className="font-semibold leading-snug">{ad.headline}</p>}
      {ad.body && <p className="mt-1 text-sm text-muted-foreground">{ad.body}</p>}

      {ad.mediaUrl && (
        // The slot takes its shape from the artwork rather than forcing one.
        // A hardcoded 16:9 box cropped a third off the first square creative
        // that ran through it. Reserving the right height also stops the feed
        // jumping under the reader while the image loads.
        // Bounded the same way a photo is, and for the same reason: a 4:5
        // creative in a desktop column ran to 665px and took most of the
        // screen, which is precisely the takeover the 4:5 limit exists to
        // prevent. Capping the width holds the height under the cap while the
        // border still ends where the artwork ends. Phones are unchanged —
        // there the column is narrow enough that 4:5 already behaves.
        <div
          className="relative mt-3 mx-auto w-full max-w-[var(--cap-width-phone)] overflow-hidden rounded-2xl border md:max-w-[var(--cap-width)]"
          style={{
            aspectRatio: String(renderAspect(ad.mediaWidth, ad.mediaHeight)),
            '--cap-width': `${Math.round(MAX_IMAGE_HEIGHT_PX * renderAspect(ad.mediaWidth, ad.mediaHeight))}px`,
            // A phone gets a share of the screen rather than a pixel count,
            // because phones are not one size. Half the viewport leaves the ad
            // clearly the largest thing in view without owning it, and the
            // post under it stays visible — which is what stops a paid slot
            // reading as a takeover.
            '--cap-width-phone': `calc(${MAX_AD_SCREEN_SHARE} * 100vh * ${renderAspect(ad.mediaWidth, ad.mediaHeight)})`,
          } as React.CSSProperties}
        >
          <Image
            src={ad.mediaUrl}
            alt={ad.headline || ad.advertiserName}
            fill
            unoptimized
            sizes="(max-width: 767px) 100vw, 600px"
            className="object-cover"
          />
        </div>
      )}

      {ad.destinationUrl && (
        <a
          href={ad.destinationUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={onClick}
          className="mt-3 inline-block"
        >
          <Button size="sm" variant="outline" className="rounded-full">
            {ad.ctaLabel || 'Learn more'}
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </a>
      )}
    </article>
  );
}
