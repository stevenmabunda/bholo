'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { ShopProduct } from '@/lib/shop-products';
import { ProductDetail } from '@/components/shop/product-detail';

/**
 * A jersey's own page, overlaid on the shop grid instead of navigating away
 * from it — closing is a step back to exactly where you were, not a
 * re-fetch of the whole grid. Same pattern as the post photo viewer's
 * @modal slot (see (app)/@modal), just scoped to /shop instead of the app.
 *
 * Only reachable via a client-side Link from /shop (that's what Next's
 * intercepting route matches); a cold link to /shop/[slug] renders the real
 * page next door, so it's still a shareable, crawlable address.
 */
export function ProductModal({ product }: { product: ShopProduct }) {
  const router = useRouter();

  // Back if there's somewhere to go back to (the grid, almost always);
  // /shop otherwise, for the rare case this modal got opened without that
  // history — e.g. a shared link into the intercepted state directly.
  const close = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.replace('/shop');
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    // Locks the grid behind the modal in place — otherwise scrolling the
    // modal's content also scrolls the page underneath it.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [close]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm sm:items-center sm:p-6">
      {/* Click-outside-to-close — only the backdrop itself closes, not
          anything inside the panel bubbling up. */}
      <div className="absolute inset-0" onClick={close} aria-hidden />
      {/* Fixed to the viewport, not the panel, so it stays put even once
          the panel's own content scrolls underneath it. */}
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="fixed right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="relative w-full bg-background sm:max-h-[90vh] sm:max-w-5xl sm:overflow-y-auto sm:rounded-lg">
        <ProductDetail product={product} />
      </div>
    </div>
  );
}
