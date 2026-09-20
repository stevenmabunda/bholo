'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';

type Variant = 'success' | 'failure' | 'cancelled';
type Status = 'pending' | 'paid' | 'failed' | 'cancelled' | 'unknown';

/**
 * Shared result screen for all three iKhokha return URLs.
 *
 * The redirect alone proves nothing, so the order is re-verified through
 * /api/shop/order-status (which syncs live with iKhokha when the webhook
 * hasn't landed yet). The cart is only cleared on a verified paid order —
 * a cancelled/failed payment keeps the cart intact for another try.
 */
export function OrderResult({ variant }: { variant: Variant }) {
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const { clearCart } = useCart();
  const [status, setStatus] = useState<Status | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const clearedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ref) {
      setStatus('unknown');
      return;
    }
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/shop/order-status?ref=${encodeURIComponent(ref)}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { status: Status; amount?: string };
        if (cancelled) return;
        setStatus(data.status);
        if (data.amount) setAmount(data.amount);
        // Webhook can trail the redirect by seconds — keep asking a while
        // before settling on "still confirming".
        if (data.status === 'pending' && attempts < 10) {
          setTimeout(poll, 3000);
        }
      } catch {
        if (!cancelled) setStatus('unknown');
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  useEffect(() => {
    if (status === 'paid' && ref && clearedRef.current !== ref) {
      clearedRef.current = ref;
      clearCart();
    }
  }, [status, ref, clearCart]);

  const heading =
    variant === 'success' ? 'Order confirmed' : variant === 'failure' ? 'Payment failed' : 'Payment cancelled';

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-8">
      {status === null ? (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Confirming your payment…</h1>
          <p className="mt-2 text-muted-foreground">Checking with the payment provider.</p>
        </>
      ) : status === 'paid' ? (
        <>
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{heading}</h1>
          {amount && <p className="mt-2 text-lg font-bold">{amount} paid.</p>}
          <p className="mt-2 text-muted-foreground">
            Sharp choice. We&apos;ll email your delivery details shortly.
            {ref && <span className="block text-xs">Order ref: {ref}</span>}
          </p>
        </>
      ) : status === 'pending' ? (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Still confirming…</h1>
          <p className="mt-2 text-muted-foreground">
            The payment provider hasn&apos;t confirmed yet. If money left your account, it will
            reflect here — check back in a few minutes.
            {ref && <span className="block text-xs">Order ref: {ref}</span>}
          </p>
        </>
      ) : status === 'failed' || variant === 'failure' ? (
        <>
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{heading}</h1>
          <p className="mt-2 text-muted-foreground">
            Nothing was charged. Your cart is untouched — try again or pick a different card.
            {ref && <span className="block text-xs">Order ref: {ref}</span>}
          </p>
        </>
      ) : variant === 'cancelled' ? (
        <>
          <Info className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{heading}</h1>
          <p className="mt-2 text-muted-foreground">
            You cancelled before paying. Your cart is still waiting.
          </p>
        </>
      ) : (
        <>
          <Info className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Order not found</h1>
          <p className="mt-2 text-muted-foreground">
            That link doesn&apos;t match any order. If you just paid, give it a minute and check your email.
          </p>
        </>
      )}

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {status === 'paid' ? (
          <Link
            href="/shop"
            className="inline-flex h-11 items-center justify-center border border-foreground bg-foreground px-8 text-xs font-bold uppercase tracking-[0.15em] text-background transition-colors hover:bg-transparent hover:text-foreground"
          >
            Back to Shop
          </Link>
        ) : (
          <>
            <Link
              href="/shop/cart"
              className="inline-flex h-11 items-center justify-center border border-foreground bg-foreground px-8 text-xs font-bold uppercase tracking-[0.15em] text-background transition-colors hover:bg-transparent hover:text-foreground"
            >
              Back to Cart
            </Link>
            <Link
              href="/shop"
              className="inline-flex h-11 items-center justify-center border border-white/20 px-8 text-xs font-bold uppercase tracking-[0.15em] transition-colors hover:border-foreground"
            >
              Continue Shopping
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
