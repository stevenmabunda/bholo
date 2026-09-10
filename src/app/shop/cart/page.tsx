'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, X } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { getShopProduct, formatShopPrice } from '@/lib/shop-products';

export default function CartPage() {
  const { lines, updateQuantity, removeFromCart } = useCart();

  const rows = lines
    .map((line) => {
      const product = getShopProduct(line.slug);
      return product ? { line, product } : null;
    })
    .filter((row): row is { line: typeof lines[number]; product: NonNullable<ReturnType<typeof getShopProduct>> } => row !== null);

  const subtotal = rows.reduce((sum, { line, product }) => sum + product.price * line.quantity, 0);

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Go pick out some merch.</p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center justify-center border border-foreground bg-foreground px-8 text-xs font-bold uppercase tracking-[0.15em] text-background transition-colors hover:bg-transparent hover:text-foreground"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Your Cart</h1>

      <div className="mt-8 divide-y divide-border">
        {rows.map(({ line, product }) => (
          <div key={`${line.slug}-${line.size}`} className="flex items-center gap-4 py-6">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-secondary">
              <Image src={product.images[0]} alt={product.name} fill unoptimized className="object-cover" />
            </div>

            <div className="flex-1">
              <p className="text-sm font-bold uppercase tracking-wide">{product.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">Size {line.size}</p>
              <p className="mt-1 text-sm font-semibold">{formatShopPrice(product.price)}</p>
            </div>

            <div className="flex items-center gap-3 border border-white/20">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => updateQuantity(line.slug, line.size, line.quantity - 1)}
                className="flex h-9 w-9 items-center justify-center hover:bg-white/5"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-4 text-center text-sm font-semibold">{line.quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => updateQuantity(line.slug, line.size, line.quantity + 1)}
                className="flex h-9 w-9 items-center justify-center hover:bg-white/5"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              aria-label={`Remove ${product.name}`}
              onClick={() => removeFromCart(line.slug, line.size)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
        <span className="text-sm font-bold uppercase tracking-wide">Subtotal</span>
        <span className="text-xl font-extrabold">{formatShopPrice(subtotal)}</span>
      </div>

      <Link
        href="/shop/checkout"
        className="mt-6 flex h-12 w-full items-center justify-center border border-foreground bg-foreground text-xs font-bold uppercase tracking-[0.15em] text-background transition-colors hover:bg-transparent hover:text-foreground"
      >
        Checkout
      </Link>
    </div>
  );
}
