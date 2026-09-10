'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Info } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { getShopProduct, formatShopPrice } from '@/lib/shop-products';

const PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
  'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
];

/**
 * No payment gateway is wired in yet (see shop-products.ts) — this collects
 * everything a real checkout would need (contact + shipping details) and
 * stops one step short of actually charging anyone, rather than faking a
 * successful order. The honest state to show is "here's what's missing",
 * not a confirmation screen for a purchase that never happened.
 *
 * Wiring a gateway later means replacing handleSubmit's body with a real
 * call (e.g. creating a Payfast/Paystack/Yoco payment session with these
 * same field values) — the form and its validation don't need to change.
 */
export default function CheckoutPage() {
  const { lines } = useCart();
  const [submitted, setSubmitted] = useState(false);

  const rows = lines
    .map((line) => {
      const product = getShopProduct(line.slug);
      return product ? { line, product } : null;
    })
    .filter((row): row is { line: typeof lines[number]; product: NonNullable<ReturnType<typeof getShopProduct>> } => row !== null);

  const subtotal = rows.reduce((sum, { line, product }) => sum + product.price * line.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Add something before checking out.</p>
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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-4">
            <legend className="text-xs font-bold uppercase tracking-wide">Contact</legend>
            <input
              required
              type="text"
              placeholder="Full name"
              className="h-11 w-full border border-white/20 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
            <input
              required
              type="email"
              placeholder="Email"
              className="h-11 w-full border border-white/20 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
            <input
              required
              type="tel"
              placeholder="Phone number"
              className="h-11 w-full border border-white/20 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xs font-bold uppercase tracking-wide">Shipping address</legend>
            <input
              required
              type="text"
              placeholder="Street address"
              className="h-11 w-full border border-white/20 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="text"
                placeholder="City"
                className="h-11 w-full border border-white/20 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
              <input
                required
                type="text"
                placeholder="Postal code"
                className="h-11 w-full border border-white/20 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
            </div>
            <select
              required
              defaultValue=""
              className="h-11 w-full border border-white/20 bg-transparent px-3 text-sm text-foreground focus:border-foreground focus:outline-none"
            >
              <option value="" disabled className="bg-background">
                Province
              </option>
              {PROVINCES.map((p) => (
                <option key={p} value={p} className="bg-background">
                  {p}
                </option>
              ))}
            </select>
          </fieldset>

          {submitted ? (
            <div className="flex items-start gap-3 border border-primary/40 bg-primary/10 p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                Payment isn&apos;t connected yet — your details are ready, but there&apos;s
                nowhere to actually send this order to. Checkout will go live here the
                moment a payment gateway is wired in. Nothing has been charged.
              </p>
            </div>
          ) : (
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center border border-foreground bg-foreground text-xs font-bold uppercase tracking-[0.15em] text-background transition-colors hover:bg-transparent hover:text-foreground"
            >
              Continue to Payment
            </button>
          )}
        </form>

        <div className="border border-white/10 p-6">
          <p className="text-xs font-bold uppercase tracking-wide">Order Summary</p>
          <div className="mt-4 space-y-4">
            {rows.map(({ line, product }) => (
              <div key={`${line.slug}-${line.size}`} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-secondary">
                  <Image src={product.images[0]} alt={product.name} fill unoptimized className="object-cover" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-muted-foreground">
                    Size {line.size} &times; {line.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatShopPrice(product.price * line.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatShopPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span>Calculated at payment</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-white/10 pt-4">
            <span className="text-sm font-bold uppercase tracking-wide">Total</span>
            <span className="text-lg font-extrabold">{formatShopPrice(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
