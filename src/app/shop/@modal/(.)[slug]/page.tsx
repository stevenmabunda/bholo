import { notFound } from 'next/navigation';
import { getShopProduct } from '@/lib/shop-products';
import { ProductModal } from '@/components/shop/product-modal';

type Props = { params: Promise<{ slug: string }> };

/**
 * The same product page, overlaid on the shop grid.
 *
 * Next only intercepts client-side navigations, which is exactly the split
 * we want: tapping a jersey from /shop lands here with the grid still
 * mounted behind it, so closing is a step back rather than a re-fetch. A
 * cold link has nothing to intercept and renders shop/[slug]/page.tsx next
 * door instead — same product, same metadata, just the full page.
 */
export default async function ProductPageModal({ params }: Props) {
  const { slug } = await params;
  const product = getShopProduct(slug);
  if (!product) notFound();

  return <ProductModal product={product} />;
}
