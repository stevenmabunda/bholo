import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getShopProduct, SHOP_PRODUCTS } from '@/lib/shop-products';
import { siteUrl } from '@/lib/site';
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

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `${siteUrl}/shop/${product.slug}` },
  };
}

export default async function ShopProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getShopProduct(slug);
  if (!product) notFound();

  return <ProductDetail product={product} />;
}
