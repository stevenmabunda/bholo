'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';

/**
 * Its own header rather than reusing the landing page's — the shop is a
 * distinct, premium destination (see landing-page.tsx's ShopButton), not
 * another section of the marketing site, so it gets its own minimal chrome:
 * logo, a way back to BHOLO proper, and the cart.
 */
export function ShopHeader() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          {/* Desktop has the "Back to BHOLO" text link further along the
              header; on mobile that's hidden for space and nothing else
              took its place, so there was no way back to the main site
              short of the browser's own back button. */}
          <Link href="/" aria-label="Back to BHOLO" className="text-foreground sm:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href="/shop" aria-label="BHOLO Shop home" className="flex items-center gap-2">
            <span className="h-6 w-1.5 shrink-0 -skew-x-12 rounded-sm bg-primary" aria-hidden />
            <Image
              src="/officialogo.png"
              alt="BHOLO"
              width={893}
              height={272}
              unoptimized
              className="h-6 w-auto self-start"
            />
            <span className="ml-1 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Shop
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Back to BHOLO
          </Link>
          <Link href="/shop/cart" aria-label="Cart" className="relative">
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
