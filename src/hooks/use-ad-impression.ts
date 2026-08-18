'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

/**
 * Counting an ad the way an advertiser expects it to be counted.
 *
 * One definition for every placement. A second unit with its own slightly
 * different idea of what a view is would eventually produce two numbers for
 * the same campaign, and no way to say which was right.
 */

/** IAB-style viewability: half of it on screen, for a whole second. */
const VISIBLE_RATIO = 0.5;
const VISIBLE_MS = 1000;

/**
 * Creatives already counted while this page has been open.
 *
 * A creative can be on screen more than once — a feed slot recurs every tenth
 * post, and the sidebar may carry the same campaign — and the feed remounts
 * rows when new posts are prepended. Counting once per page session errs
 * towards undercounting, which is the right direction to be wrong in when
 * somebody is paying against the figure. Repeats across sessions are what the
 * campaign's frequency cap is for.
 */
const countedThisSession = new Set<string>();

export function useAdImpression(creativeId: string | undefined) {
  const { user } = useAuth();
  const ref = useRef<HTMLElement>(null);
  const [counted, setCounted] = useState(false);

  const logEvent = useCallback(
    async (kind: 'impression' | 'click') => {
      if (!creativeId) return;
      const { error } = await supabase
        .from('ad_events')
        .insert({ creative_id: creativeId, kind, user_id: user?.id ?? null });
      if (error) console.error(`Could not record ad ${kind}:`, error);
    },
    [creativeId, user?.id]
  );

  useEffect(() => {
    if (!creativeId || counted || countedThisSession.has(creativeId)) return;
    const node = ref.current;
    if (!node) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
          // Only once it has stayed there. Scrolling straight past is not a view.
          timer = setTimeout(() => {
            // And the tab still has to be the one they are looking at.
            if (document.visibilityState !== 'visible') return;
            // Claimed before the write, so two copies becoming visible together
            // cannot both get through.
            if (countedThisSession.has(creativeId)) return;
            countedThisSession.add(creativeId);
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
  }, [creativeId, counted, logEvent]);

  /** Logged before leaving, but not awaited — a slow write should never stand
   *  between someone and the page they asked for. */
  const onClick = useCallback(() => {
    void logEvent('click');
  }, [logEvent]);

  return { ref, onClick };
}
