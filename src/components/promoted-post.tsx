'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { ServableAd } from '@/lib/ads';

/**
 * A paid slot in the feed.
 *
 * Counted the way advertisers expect it to be counted: an impression is 50% of
 * the unit visible for one continuous second, not "the server sent it". Those
 * are very different numbers, and billing on the second one is billing for ads
 * nobody saw.
 */

/** IAB-style viewability: half of it on screen, for a whole second. */
const VISIBLE_RATIO = 0.5;
const VISIBLE_MS = 1000;

export function PromotedPost({ ad }: { ad: ServableAd }) {
  const { user } = useAuth();
  const ref = useRef<HTMLElement>(null);
  const [counted, setCounted] = useState(false);

  useEffect(() => {
    if (counted) return;
    const node = ref.current;
    if (!node) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
          // Only once it has stayed there. Scrolling straight past is not a view.
          timer = setTimeout(() => {
            setCounted(true);
            void logEvent('impression');
            observer.disconnect();
          }, VISIBLE_MS);
        } else if (timer) {
          clearTimeout(timer);
          timer = undefined;
        }
      },
      { threshold: [VISIBLE_RATIO] }
    );

    observer.observe(node);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counted, ad.creativeId, user?.id]);

  const logEvent = async (kind: 'impression' | 'click') => {
    const { error } = await supabase
      .from('ad_events')
      .insert({ creative_id: ad.creativeId, kind, user_id: user?.id ?? null });
    if (error) console.error(`Could not record ad ${kind}:`, error);
  };

  const handleClick = () => {
    // Logged before leaving, but not awaited — a slow write should never stand
    // between someone and the page they asked for.
    void logEvent('click');
  };

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
        <div className="relative mt-3 aspect-[16/9] w-full overflow-hidden rounded-2xl border">
          <Image
            src={ad.mediaUrl}
            alt={ad.headline || ad.advertiserName}
            fill
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
          onClick={handleClick}
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
