'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { formatShopPrice, type ShopProduct, type ShopSize } from '@/lib/shop-products';
import { cn } from '@/lib/utils';

export function ProductDetail({ product }: { product: ShopProduct }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [size, setSize] = useState<ShopSize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    if (!size) {
      setError('Pick a size first.');
      return;
    }
    setError(null);
    addToCart(product.slug, size, 1);
    setAdded(true);
    // Reverts on its own — this button is also how you get to the cart, so
    // "Added" can't be the only state it's ever in again.
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-16">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <Image src={product.images[0]} alt={product.name} fill unoptimized className="object-cover" />
      </div>

      <div className="flex flex-col lg:py-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">{product.colorway}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{product.name}</h1>
        <p className="mt-3 text-xl font-semibold">{formatShopPrice(product.price)}</p>
        <p className="mt-6 max-w-md text-muted-foreground">{product.description}</p>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide">Size</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSize(s);
                  setError(null);
                }}
                className={cn(
                  'h-11 min-w-11 border px-3 text-sm font-semibold transition-colors',
                  size === s
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-white/20 text-foreground hover:border-foreground'
                )}
              >
                {s}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex h-12 items-center justify-center gap-2 border border-foreground bg-foreground px-8 text-xs font-bold uppercase tracking-[0.15em] text-background transition-colors hover:bg-transparent hover:text-foreground"
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                Added
              </>
            ) : (
              'Add to Cart'
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!size) {
                setError('Pick a size first.');
                return;
              }
              addToCart(product.slug, size, 1);
              router.push('/shop/checkout');
            }}
            className="inline-flex h-12 items-center justify-center border border-white/20 px-8 text-xs font-bold uppercase tracking-[0.15em] text-foreground transition-colors hover:border-foreground"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
