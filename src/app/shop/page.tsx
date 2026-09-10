import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { SHOP_PRODUCTS, formatShopPrice } from '@/lib/shop-products';

/**
 * Promo strip — all three cards matched to a lifestyle photo (women's
 * group, men's group, a couple). `tone` is dead weight now that every
 * card has an `image`, but stays as the fallback if one's ever pulled.
 * The hero above and the merch grid below both use real photos from the
 * 26/27 kit shoot already (see shop-products.ts).
 */
const PROMO_BANNERS: { eyebrow: string; title: string; href: string; tone: string; image?: string }[] = [
  {
    eyebrow: 'For The Girls',
    title: 'Style Elevated',
    href: '/shop',
    tone: 'bg-primary',
    image: '/shop/GIRLS_BANER_01.jpg',
  },
  {
    eyebrow: 'Street Ready',
    title: 'Weekend Rotation',
    href: '/shop',
    tone: 'bg-secondary',
    image: '/shop/BOYS_BANER_02.jpg',
  },
  {
    eyebrow: 'Off The Clock',
    title: 'Everyday Fit',
    href: '/shop',
    tone: 'bg-[#1a1a1a]',
    image: '/shop/BOY_GIRLN_BANER_03.jpg',
  },
];

export default function ShopPage() {
  return (
    <div>
      {/* Hero — real 26/27 kit-shoot group photo behind the gradient.
          A plain height (not aspect-ratio) so the box always fills the
          full viewport width — aspect-ratio + max-height was shrinking the
          width to keep the ratio instead, leaving a blank strip on wide
          windows. object-cover on the photo handles any resulting crop. */}
      <section className="relative flex h-[70vh] items-end overflow-hidden bg-[#111] sm:h-[85vh]">
        {/* object-top: keep heads in frame and crop legs instead — the
            default centred crop was cutting faces off on shorter/wider
            windows. */}
        <Image
          src="/shop/STOREFRONT_HERO.jpg"
          alt="Models wearing the BHOLO 26/27 jersey in six colourways"
          fill
          priority
          unoptimized
          className="object-cover object-top"
        />
        {/* Light enough that the models stay visible — only strong right at
            the very bottom, behind the copy. */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
          aria-hidden
        />
        {/* Adidas' own hero (adidas.co.za) runs one modest line of copy
            bottom-left and nothing else — no eyebrow, no paragraph. Ours
            was carrying three lines of text competing with the photo;
            trimmed to match. */}
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-8 sm:px-8 sm:pb-12">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Official BHOLO Merch
          </p>
          <h1 className="mt-2 max-w-md text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            Kick It Your Way.
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
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
                className={`group relative flex aspect-[4/5] flex-col justify-between overflow-hidden p-6 ${
                  banner.image ? '' : banner.tone
                }`}
              >
                {banner.image && (
                  <>
                    <Image
                      src={banner.image}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Same reasoning as the hero scrim — just enough to
                        keep the white text readable over a busy photo. */}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30"
                      aria-hidden
                    />
                  </>
                )}
                <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                  {banner.eyebrow}
                </p>
                <div className="relative flex items-end justify-between">
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

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP_PRODUCTS.map((product) => (
            <Link key={product.slug} href={`/shop/${product.slug}`} className="group block">
              {/* 2:3 matches the on-model shots' native crop — a square
                  box was cutting heads and feet off every listing photo. */}
              <div className="relative aspect-[2/3] overflow-hidden bg-secondary">
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
