'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { getAds, type ServableAd } from '@/lib/ads';
import { renderAspect } from '@/lib/ad-specs';
import { useAdImpression } from '@/hooks/use-ad-impression';

/**
 * The sidebar unit. Desktop only, because the column it lives in is.
 *
 * Renders nothing at all when there is no sidebar creative to show — an empty
 * bordered box labelled "Sponsored" is worse than no box, and this column is
 * already dense.
 */
export function SidebarAd() {
  const [ad, setAd] = useState<ServableAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAds('sidebar', 1)
      .then((ads) => { if (!cancelled) setAd(ads[0] ?? null); })
      .catch((error) => console.error('Could not load sidebar ad:', error));
    return () => { cancelled = true; };
  }, []);

  const { ref, onClick } = useAdImpression(ad?.creativeId);

  if (!ad) return null;

  return (
    <section ref={ref} data-promoted={ad.creativeId} className="rounded-2xl border border-border p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-bold">{ad.advertiserName}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Promoted
        </span>
      </div>

      {ad.mediaUrl && (
        <div
          className="relative mb-2 w-full overflow-hidden rounded-xl border"
          style={{ aspectRatio: String(renderAspect(ad.mediaWidth, ad.mediaHeight)) }}
        >
          <Image
            src={ad.mediaUrl}
            alt={ad.headline || ad.advertiserName}
            fill
            unoptimized
            sizes="320px"
            className="object-cover"
          />
        </div>
      )}

      {ad.headline && <p className="text-sm font-semibold leading-snug">{ad.headline}</p>}
      {ad.body && <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{ad.body}</p>}

      {ad.destinationUrl && (
        <a
          href={ad.destinationUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={onClick}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {ad.ctaLabel || 'Learn more'}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </section>
  );
}
