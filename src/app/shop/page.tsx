import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { SHOP_PRODUCTS, formatShopPrice } from '@/lib/shop-products';

/**
 * Skeleton for now, per request — real photography goes into the hero and
 * each promo banner's `image` (currently unused, all three render as flat
 * colour blocks) the moment it exists. Layout, copy and links are already
 * final; only the visuals are placeholders.
 */
const PROMO_BANNERS: { eyebrow: string; title: string; href: string; tone: string }[] = [
  { eyebrow: 'New Drop', title: 'Matchday Kit', href: '/shop', tone: 'bg-primary' },
  { eyebrow: 'Only Here', title: 'Timeline Exclusive', href: '/shop', tone: 'bg-secondary' },
  { eyebrow: 'Rep The Badge', title: 'Club Colours', href: '/shop', tone: 'bg-[#1a1a1a]' },
];

export default function ShopPage() {
  return (
    <div>
      {/* Hero — full-bleed placeholder until real photography exists. */}
      <section className="relative flex min-h-[70vh] items-end overflow-hidden bg-[#111] sm:min-h-[80vh]">
        <div
          className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20"
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 sm:px-8 sm:pb-20">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Official BHOLO Merch
          </p>
          <h1 className="mt-3 max-w-2xl text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-7xl">
            Wear the
            <br />
            Badge.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Jerseys made for matchday, the tavern, and repping the timeline.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="#range"
              className="inline-flex h-12 items-center gap-2 bg-foreground px-7 text-xs font-bold uppercase tracking-[0.15em] text-background transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Shop Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#range"
              className="inline-flex h-12 items-center gap-2 border border-white/30 px-7 text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:border-foreground"
            >
              Explore More
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Promo strip — three flat colour cards standing in for campaign
          photography, same "bold overlay text, arrow in the corner" shape
          adidas.co.za uses for its adiClub Days cards. */}
      <section className="border-b border-white/10 bg-black py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PROMO_BANNERS.map((banner) => (
              <Link
                key={banner.title}
                href={banner.href}
                className={`group relative flex aspect-[4/5] flex-col justify-between overflow-hidden p-6 ${banner.tone}`}
              >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                  {banner.eyebrow}
                </p>
                <div className="flex items-end justify-between">
                  <h2 className="max-w-[10rem] text-2xl font-black uppercase leading-tight tracking-tight text-white">
                    {banner.title}
                  </h2>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition-transform group-hover:translate-x-1">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Merch grid — the actual, buyable range. */}
      <section id="range" className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
        <div className="mb-10 text-center sm:mb-14">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Shop The Range</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">BHOLO Jerseys</h2>
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
                <h3 className="text-sm font-bold uppercase tracking-wide">{product.name}</h3>
                <span className="text-sm font-semibold">{formatShopPrice(product.price)}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
