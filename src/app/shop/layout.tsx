import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { siteUrl } from '@/lib/site';
import { CartProvider } from '@/contexts/cart-context';
import { ShopHeader } from '@/components/shop/shop-header';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Official BHOLO merch — jerseys made for matchday, the tavern, and repping the timeline.',
  alternates: { canonical: `${siteUrl}/shop` },
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <ShopHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:px-8">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} BHOLO. Made for South African football fans.
            </p>
            <Link href="/" className="text-xs font-semibold text-primary hover:underline">
              &larr; Back to BHOLO
            </Link>
          </div>
        </footer>
      </div>
    </CartProvider>
  );
}
