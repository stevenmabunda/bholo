/**
 * BHOLO merch catalog.
 *
 * Static for now — no product/inventory backend exists yet, and the
 * checkout flow this feeds has nowhere real to submit an order to until a
 * payment gateway is wired in (see /shop/checkout). Once that groundwork
 * exists, this is the natural place to swap a database/CMS query in
 * without touching any of the pages that read it.
 *
 * Pricing is still a placeholder (R599 across the board) — real product
 * photography is in from the 26/27 kit shoot (`/public/shop/BHOLO_26-27_*`):
 * a flat MASTER shot first, then three on-model shots per colorway.
 */
export type ShopSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type ShopProduct = {
  slug: string;
  name: string;
  /** ZAR, in Rand — a placeholder until real pricing is set. */
  price: number;
  colorway: string;
  description: string;
  /** Short "Fit / Details / Style" spec lines, rendered under the description. */
  details: string[];
  images: string[];
  sizes: ShopSize[];
};

export const SHOP_CURRENCY = 'ZAR';

export const SHOP_SIZES: ShopSize[] = ['S', 'M', 'L', 'XL', 'XXL'];

/** One jersey colorway's photo set: on-model shots first (what a shopper
 *  should see first is someone wearing it), flat product shot last as the
 *  detail/reference image. */
function kitImages(color: string, masterExt = 'jpg'): string[] {
  return [
    `/shop/BHOLO_26-27_${color}_MODEL_01.jpg`,
    `/shop/BHOLO_26-27_${color}_MODEL_02.jpg`,
    `/shop/BHOLO_26-27_${color}_MODEL_03.jpg`,
    `/shop/BHOLO_26-27_${color}_MASTER.${masterExt}`,
  ];
}

/** Same copy structure for every colourway, with the opening tuned to what
 *  that colour actually says — red reads as intensity, black as stealth,
 *  and so on — rather than one generic paragraph repeated six times. */
function kitDescription(hook: string): string {
  return `Built for the terrace, styled for the culture. ${hook} Featuring a classic V-neck cut and custom "Diski Lives Here" collar tape, this jersey bridges matchday passion with everyday street fashion. Lightweight, versatile, and tailored to turn heads, whether you're repping at the stadium, hanging out on the weekend, or dropping a fit on the feed.`;
}

const KIT_DETAILS = [
  'Fit: Classic V-neck, lifestyle drape',
  'Details: "Diski Lives Here" inner neck tape',
  'Style: Matchday, streetwear, weekend rotation',
];

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    slug: 'bholo-jersey-red',
    name: 'BHOLO Jersey: Red',
    price: 599,
    colorway: 'Red',
    description: kitDescription(
      "In red, there's no hiding. It's the colour of matchday nerves and full-throated celebrations, the one you reach for when you want the terrace to know exactly where you stand."
    ),
    details: KIT_DETAILS,
    images: kitImages('RED'),
    sizes: SHOP_SIZES,
  },
  {
    slug: 'bholo-jersey-blue',
    name: 'BHOLO Jersey: Blue',
    price: 599,
    colorway: 'Blue',
    description: kitDescription(
      'The blue runs cool and confident, an easy colour to build a whole week of fits around, on the terrace or off it.'
    ),
    details: KIT_DETAILS,
    images: kitImages('BLUE'),
    sizes: SHOP_SIZES,
  },
  {
    slug: 'bholo-jersey-black',
    name: 'BHOLO Jersey: Black',
    price: 599,
    colorway: 'Black',
    description: kitDescription(
      'Black keeps it understated. It\'s the colourway for when you want the badge to do the talking, not the jersey.'
    ),
    details: KIT_DETAILS,
    images: kitImages('BLACK'),
    sizes: SHOP_SIZES,
  },
  {
    slug: 'bholo-jersey-white',
    name: 'BHOLO Jersey: White',
    price: 599,
    colorway: 'White',
    description: kitDescription(
      'Clean, crisp white. It\'s the colourway that looks as sharp fresh off the rail as it does three washes in, built to be worn on repeat.'
    ),
    details: KIT_DETAILS,
    images: kitImages('WHITE'),
    sizes: SHOP_SIZES,
  },
  {
    slug: 'bholo-jersey-green',
    name: 'BHOLO Jersey: Green',
    price: 599,
    colorway: 'Green',
    description: kitDescription(
      "Green ties it back to home soil. It's the colour of the pitch itself, for the ones who never left the terrace in spirit."
    ),
    details: KIT_DETAILS,
    images: kitImages('GREEN'),
    sizes: SHOP_SIZES,
  },
  {
    slug: 'bholo-jersey-yellow',
    name: 'BHOLO Jersey: Yellow',
    price: 599,
    colorway: 'Yellow',
    description: kitDescription(
      "Yellow doesn't blend in. It's the colourway for the ones who want to be seen from the last row of the stand, in the queue, or on the feed."
    ),
    details: KIT_DETAILS,
    // File on disk is a double-extension export (`.png.jpg`) from the shoot.
    images: kitImages('YELLOW', 'png.jpg'),
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
