import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { absoluteUrl, siteUrl } from '@/lib/site';
import { CartProvider } from '@/contexts/cart-context';
import { ShopHeader } from '@/components/shop/shop-header';

const SHOP_DESCRIPTION =
  'Official BHOLO merch: the 26/27 jersey in 6 colourways (Black, Blue, Green, Red, White, Yellow). Made for matchday, the tavern, and repping the timeline. Free-standing South African football streetwear.';

// Individual product pages (generateMetadata in [slug]/page.tsx) override
// title/description/openGraph/twitter per colourway; keywords and the rest
// of this only ever surface on /shop itself, since Next doesn't merge a
// child's metadata into a parent's — it replaces whatever the child sets.
export const metadata: Metadata = {
  title: 'Shop',
  description: SHOP_DESCRIPTION,
  keywords: [
    'BHOLO jersey',
    'South African football jersey',
    'BHOLO merch',
    'football streetwear South Africa',
    'Mzansi football merch',
    'BHOLO shop',
    'diski jersey',
    'South African football fan gear',
  ],
  alternates: { canonical: `${siteUrl}/shop` },
  openGraph: {
    title: 'Shop | BHOLO',
    description: SHOP_DESCRIPTION,
    url: `${siteUrl}/shop`,
    images: [{ url: absoluteUrl('/shop/STOREFRONT_HERO.jpg'), width: 1672, height: 941 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shop | BHOLO',
    description: SHOP_DESCRIPTION,
    images: [absoluteUrl('/shop/STOREFRONT_HERO.jpg')],
  },
};

export default function ShopLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
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
      {/* Filled by @modal/(.)[slug]/page.tsx when a jersey's opened from
          the grid via client-side navigation; empty (default.tsx) on a
          cold load, which renders shop/[slug]/page.tsx instead. */}
      {modal}
    </CartProvider>
  );
}
