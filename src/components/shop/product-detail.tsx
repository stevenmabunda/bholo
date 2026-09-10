'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { formatShopPrice, type ShopProduct, type ShopSize } from '@/lib/shop-products';
import { cn } from '@/lib/utils';

// How far a touch has to travel horizontally before it counts as a swipe
// rather than a tap or a vertical scroll.
const SWIPE_THRESHOLD_PX = 40;

export function ProductDetail({ product }: { product: ShopProduct }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [size, setSize] = useState<ShopSize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const showImage = (index: number) => {
    setActiveImage(Math.max(0, Math.min(product.images.length - 1, index)));
  };

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
      <div>
        {/* 2:3 matches the on-model shots' native crop (1024x1536) — no
            crop for those. object-contain (not cover) so the square MASTER
            shot's sleeves aren't cropped off the sides either; it just
            letterboxes into the same box instead. */}
        <div
          className="relative aspect-[2/3] overflow-hidden bg-secondary"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const delta = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
            // Swipe left (negative delta) -> next photo, same direction a
            // carousel or a phone photo gallery already moves in.
            showImage(activeImage + (delta < 0 ? 1 : -1));
          }}
        >
          <Image
            src={product.images[activeImage]}
            alt={product.name}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
        {/* Mobile has no thumbnail row (see below) — swipe is the only way
            to move between photos there, so it needs its own indicator. */}
        {product.images.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
            {product.images.map((image, index) => (
              <span
                key={image}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  index === activeImage ? 'bg-foreground' : 'bg-white/20'
                )}
                aria-hidden
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:py-6">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">{product.colorway}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{product.name}</h1>
        <p className="mt-3 text-xl font-semibold">{formatShopPrice(product.price)}</p>
        <p className="mt-6 max-w-md text-muted-foreground">{product.description}</p>
        <ul className="mt-4 max-w-md space-y-1 text-sm text-muted-foreground">
          {product.details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

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

        {/* Thumbnails live here, not under the (tall, 2:3) main image — that
            pushed them below the fold on shorter windows. Desktop only —
            on mobile you swipe the main image instead (dots above show
            where you are), there's no room for a second row of taps. */}
        {product.images.length > 1 && (
          <div className="mt-8 hidden grid-cols-4 gap-3 sm:grid sm:max-w-xs">
            {product.images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={`Show photo ${index + 1} of ${product.name}`}
                className={cn(
                  'relative aspect-square overflow-hidden bg-secondary transition-opacity',
                  index === activeImage ? 'ring-2 ring-foreground' : 'opacity-70 hover:opacity-100'
                )}
              >
                {/* Same reasoning as the main image — contain, not cover,
                    so faces and feet aren't cropped off the square swatch. */}
                <Image src={image} alt="" fill unoptimized className="object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
