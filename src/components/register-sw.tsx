'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js as soon as this mounts. Previously this waited for the
 * window `load` event on top of React's own mount timing, which is two
 * deferrals stacked on each other — harmless for a real visitor, but it
 * meant installability scanners (PWABuilder's report card among them) that
 * check shortly after navigation sometimes finished their check before
 * registration had even fired, and reported no service worker despite one
 * being present. Registering immediately on mount removes that race; /sw.js
 * is 2KB and registration doesn't block rendering either way.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed:', err);
    });
  }, []);

  return null;
}
