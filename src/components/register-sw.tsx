'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js after the page has finished loading. Deferred to the
 * `load` event (not run eagerly on mount) so it never competes with the
 * feed/auth/fixture requests that actually matter for first paint — a PWA
 * installability check only needs a service worker to exist, not to be
 * registered instantly.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
