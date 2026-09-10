import Link from 'next/link';
import Image from 'next/image';
import { SHOP_PRODUCTS, formatShopPrice } from '@/lib/shop-products';

export default function ShopPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-16">
      <div className="mb-10 text-center sm:mb-14">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Official Merch</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">BHOLO Shop</h1>
        <p className="mt-3 text-muted-foreground">
          Jerseys made for matchday, the tavern, and repping the timeline.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {SHOP_PRODUCTS.map((product) => (
          <Link key={product.slug} href={`/shop/${product.slug}`} className="group block">
            <div className="relative aspect-square overflow-hidden bg-secondary">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                unoptimized
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide">{product.name}</h2>
              <span className="text-sm font-semibold">{formatShopPrice(product.price)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
