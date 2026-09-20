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
 * Response bodies aren't guaranteed JSON (proxies, edge errors) — parse
 * defensively so a transport failure shows its status, not a JSON
 * SyntaxError that hides what actually happened.
 */
async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Collects contact + shipping, creates a pending order + iKhokha payment
 * link server-side (POST /api/shop/checkout), then hands the shopper to
 * iKhokha to pay. Amounts are re-resolved from the catalog on the server —
 * this form sends slugs/sizes/quantities only, never prices.
 */
export default function CheckoutPage() {
  const { lines } = useCart();
  const [field, setField] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postal: '',
    province: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = lines
    .map((line) => {
      const product = getShopProduct(line.slug);
      return product ? { line, product } : null;
    })
    .filter((row): row is { line: typeof lines[number]; product: NonNullable<ReturnType<typeof getShopProduct>> } => row !== null);

  const subtotal = rows.reduce((sum, { line, product }) => sum + product.price * line.quantity, 0);

  const set = (key: keyof typeof field) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setField((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: lines.map((l) => ({ slug: l.slug, size: l.size, quantity: l.quantity })),
          contact: { name: field.name, email: field.email, phone: field.phone },
          shipping: {
            street: field.street,
            city: field.city,
            postal: field.postal,
            province: field.province,
          },
        }),
      });
      const data = (await readJson(res)) as { paylinkUrl?: string; error?: string };
      if (!res.ok || !data.paylinkUrl) {
        throw new Error(data.error ?? `Checkout failed (HTTP ${res.status}). Try again.`);
      }
      window.location.href = data.paylinkUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Try again.');
      setSubmitting(false);
    }
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

  const inputClass =
    'h-11 w-full border border-white/20 bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none';

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 sm:py-16">
      <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-4">
            <legend className="text-xs font-bold uppercase tracking-wide">Contact</legend>
            <input required type="text" placeholder="Full name" value={field.name} onChange={set('name')} className={inputClass} />
            <input required type="email" placeholder="Email" value={field.email} onChange={set('email')} className={inputClass} />
            <input required type="tel" placeholder="Phone number" value={field.phone} onChange={set('phone')} className={inputClass} />
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xs font-bold uppercase tracking-wide">Shipping address</legend>
            <input required type="text" placeholder="Street address" value={field.street} onChange={set('street')} className={inputClass} />
            <div className="grid grid-cols-2 gap-3">
              <input required type="text" placeholder="City" value={field.city} onChange={set('city')} className={inputClass} />
              <input required type="text" placeholder="Postal code" value={field.postal} onChange={set('postal')} className={inputClass} />
            </div>
            <select required value={field.province} onChange={set('province')} className={`${inputClass} text-foreground`}>
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

          {error && (
            <div className="flex items-start gap-3 border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center border border-foreground bg-foreground text-xs font-bold uppercase tracking-[0.15em] text-background transition-colors hover:bg-transparent hover:text-foreground disabled:opacity-60"
          >
            {submitting ? 'Talking to the payment provider…' : 'Continue to Payment'}
          </button>
          <p className="text-xs text-muted-foreground">
            You&apos;ll pay securely on iKhokha — card payment, then back here for confirmation.
          </p>
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
