'use client';

import { useEffect, useRef } from 'react';

/**
 * Opens something with a swipe that starts at the very left edge of the screen.
 *
 * Deliberately narrow about what counts, because the feed is full of gestures
 * that must not be hijacked: vertical scrolling, the image carousels inside
 * posts, and the vertical pager in the immersive video feed. So the touch has
 * to begin within a few pixels of the edge, travel far enough right, and be
 * more horizontal than vertical — anything else is released back to the page.
 */
export function useEdgeSwipe({
  enabled,
  onTrigger,
}: {
  enabled: boolean;
  onTrigger: () => void;
}) {
  // Kept in a ref so re-renders don't tear down the listeners mid-gesture.
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    if (!enabled) return;

    /** How close to the edge a swipe must start. */
    const EDGE_ZONE = 24;
    /** How far right it must travel to count. */
    const TRIGGER_DISTANCE = 60;
    /** Vertical drift that reclassifies the gesture as a scroll. */
    const VERTICAL_SLOP = 30;

    let tracking = false;
    let startX = 0;
    let startY = 0;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      tracking = touch.clientX <= EDGE_ZONE;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking) return;
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Reads as a scroll, not a drawer pull — let the page have it.
      if (Math.abs(deltaY) > VERTICAL_SLOP && Math.abs(deltaY) > Math.abs(deltaX)) {
        tracking = false;
        return;
      }

      if (deltaX > TRIGGER_DISTANCE) {
        tracking = false;
        onTriggerRef.current();
      }
    };

    const stop = () => {
      tracking = false;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', stop, { passive: true });
    window.addEventListener('touchcancel', stop, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stop);
      window.removeEventListener('touchcancel', stop);
    };
  }, [enabled]);
}
