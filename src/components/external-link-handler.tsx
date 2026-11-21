'use client';

import { useEffect } from 'react';

/**
 * Keeps off-site links out of the app's own history.
 *
 * Inside the Android TWA, an in-scope <a> tap is handled by the app; anything
 * on another origin normally opens in a Custom Tab. This makes the same thing
 * happen in an ordinary browser tab or an installed desktop PWA: instead of
 * replacing BHOLO with, say, YouTube, the destination opens in a new tab and
 * the back button still belongs to BHOLO.
 *
 * Only plain left clicks are intercepted. Middle-click, cmd/ctrl-click and
 * anything a component already handled are left alone.
 */
export function ExternalLinkHandler() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a');
      const href = anchor?.getAttribute('href');
      if (!anchor || !href) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
      // A bare fragment is navigation within the current document.
      if (href.startsWith('#')) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin === window.location.origin) return;

      event.preventDefault();
      window.open(url.href, '_blank', 'noopener,noreferrer');
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
