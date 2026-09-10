/**
 * BHOLO merch catalog.
 *
 * Static for now — no product/inventory backend exists yet, and the
 * checkout flow this feeds has nowhere real to submit an order to until a
 * payment gateway is wired in (see /shop/checkout). Once that groundwork
 * exists, this is the natural place to swap a database/CMS query in
 * without touching any of the pages that read it.
 *
 * Prices and photography are both placeholders — the SVGs in
 * /public/shop are stand-ins; drop real product photos into
 * /public/shop/<slug>-1.jpg (etc.) and update `images` below once
 * they exist.
 */
export type ShopSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type ShopProduct = {
  slug: string;
  name: string;
  /** ZAR, in Rand — a placeholder until real pricing is set. */
  price: number;
  colorway: string;
  description: string;
  images: string[];
  sizes: ShopSize[];
};

export const SHOP_CURRENCY = 'ZAR';

export const SHOP_SIZES: ShopSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    slug: 'bholo-jersey-red',
    name: 'BHOLO Jersey — Red',
    price: 599,
    colorway: 'Red',
    description:
      'The BHOLO jersey in red. Classic V-neck cut, screen-printed crest, made for matchday, the tavern, or just repping the timeline.',
    images: ['/shop/jersey-red-placeholder.svg'],
    sizes: SHOP_SIZES,
  },
  {
    slug: 'bholo-jersey-blue',
    name: 'BHOLO Jersey — Blue',
    price: 599,
    colorway: 'Blue',
    description:
      'The BHOLO jersey in blue. Classic V-neck cut, screen-printed crest, made for matchday, the tavern, or just repping the timeline.',
    images: ['/shop/jersey-blue-placeholder.svg'],
    sizes: SHOP_SIZES,
  },
];

export function getShopProduct(slug: string): ShopProduct | undefined {
  return SHOP_PRODUCTS.find((p) => p.slug === slug);
}

export function formatShopPrice(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: SHOP_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}
