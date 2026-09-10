import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getShopProduct, SHOP_PRODUCTS, type ShopProduct } from '@/lib/shop-products';
import { absoluteUrl, siteUrl } from '@/lib/site';
import { ProductDetail } from '@/components/shop/product-detail';

// Next 15: params is a Promise and must be awaited.
type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SHOP_PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getShopProduct(slug);
  if (!product) return {};

  const image = absoluteUrl(product.images[0]);

  return {
    title: product.name,
    description: product.description,
    keywords: [
      `BHOLO ${product.colorway.toLowerCase()} jersey`,
      'BHOLO jersey',
      'South African football jersey',
      `${product.colorway} football shirt`,
      'BHOLO merch',
    ],
    alternates: { canonical: `${siteUrl}/shop/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description,
      url: `${siteUrl}/shop/${product.slug}`,
      images: [{ url: image, width: 1024, height: 1536 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [image],
    },
  };
}

/** schema.org Product + Offer — lets Google show price/availability/image
 *  directly in search results instead of a plain blue link. */
function productJsonLd(product: ShopProduct) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map((src) => absoluteUrl(src)),
    brand: { '@type': 'Brand', name: 'BHOLO' },
    color: product.colorway,
    category: 'Football Jersey',
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/shop/${product.slug}`,
      priceCurrency: 'ZAR',
      price: product.price,
      // The offer is real (add-to-cart, sizing) — only the payment step
      // isn't wired yet, which isn't a schema.org availability state.
      availability: 'https://schema.org/InStock',
    },
  };
}

export default async function ShopProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getShopProduct(slug);
  if (!product) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)) }}
      />
      <ProductDetail product={product} />
    </>
  );
}
