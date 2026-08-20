'use client';

import { useEffect, useRef } from 'react';
import { restoreScrollPosition } from '@/lib/scroll-position';

/**
 * Restores this page's scroll position once its list has something to scroll.
 *
 * `ready` should be false while the list is still loading — restoring against
 * an empty page just clamps to the top and burns the saved position. Runs once
 * per visit; after that the person is scrolling for themselves.
 */
export function useScrollRestoration(ready: boolean): void {
  const restored = useRef(false);

  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    // After paint, so the list has its real height to scroll within.
    requestAnimationFrame(() => restoreScrollPosition());
  }, [ready]);
}
