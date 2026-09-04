'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getAds, type ServableAd } from '@/lib/ads';
import { useAdImpression } from '@/hooks/use-ad-impression';

/**
 * A paid slot inside "Join the conversation".
 *
 * This is the unit that needs the most care in the whole system. It sits in a
 * list of things the audience genuinely posted about, so an ad dressed as a
 * trend is a lie told in the app's own voice — X's Promoted Trend gets
 * criticised for exactly that.
 *
 * So it is deliberately not styled as a trend: the advertiser's name replaces
 * the "Football · Trending" eyebrow, there is no post count to imply organic
 * volume, and Promoted sits on the first line rather than tucked underneath.
 * It reads as an advert that happens to live in the list, which is what it is.
 */
export function TrendAd() {
  const [ad, setAd] = useState<ServableAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAds('trend', 1)
      .then((ads) => { if (!cancelled) setAd(ads[0] ?? null); })
      .catch((error) => console.error('Could not load trend ad:', error));
    return () => { cancelled = true; };
  }, []);

  const { ref, onClick } = useAdImpression(ad?.creativeId);

  // Nothing sold for this slot means no slot, rather than a placeholder in
  // the middle of a list people read for real information.
  if (!ad) return null;

  const body = (
    <div className="flex items-start gap-3">
      {ad.mediaUrl && (
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border">
          <Image src={ad.mediaUrl} alt="" fill unoptimized sizes="44px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="truncate">{ad.advertiserName}</span>
          <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            Promoted
          </span>
        </p>
        {ad.headline && <p className="text-base font-bold leading-snug">{ad.headline}</p>}
        {ad.body && <p className="line-clamp-2 text-sm text-muted-foreground">{ad.body}</p>}
      </div>
    </div>
  );

  return (
    <section ref={ref} data-promoted={ad.creativeId} className="-m-2 rounded-md p-2">
      {ad.destinationUrl ? (
        <a
          href={ad.destinationUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={onClick}
          className="block rounded-md hover:bg-white/5"
        >
          {body}
        </a>
      ) : (
        body
      )}
    </section>
  );
}
