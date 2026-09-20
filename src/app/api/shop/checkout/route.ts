import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getShopProduct, SHOP_SIZES, type ShopSize } from '@/lib/shop-products';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { absoluteUrl, siteUrl } from '@/lib/site';
import {
  createPaylink,
  ikhokhaConfig,
  IKHOKHA_WEBHOOK_PATH,
} from '@/lib/ikhokha';

const lineSchema = z.object({
  slug: z.string().min(1),
  size: z.enum(SHOP_SIZES as [ShopSize, ...ShopSize[]]),
  quantity: z.number().int().min(1).max(99),
});

const bodySchema = z.object({
  lines: z.array(lineSchema).min(1).max(50),
  contact: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().min(1).max(30),
  }),
  shipping: z.object({
    street: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(120),
    postal: z.string().trim().min(1).max(20),
    province: z.string().trim().min(1).max(60),
  }),
});

/**
 * Creates a pending order and an iKhokha payment link for it.
 *
 * Prices are resolved server-side from the static catalog — the client
 * sends slugs/sizes/quantities only, never amounts, so a tampered request
 * can't discount its own charge. The shopper is redirected to the returned
 * paylinkUrl; the order flips to paid/failed when iKhokha calls the webhook.
 */
export async function POST(request: Request) {
  try {
    return await handleCheckout(request);
  } catch (e) {
    // Nothing in here may ever leak an empty-body 500: the checkout page
    // parses every response as JSON, and an unparsable response masks the
    // real failure behind "Unexpected end of JSON input".
    console.error('[shop/checkout] unhandled error', e);
    return NextResponse.json(
      { error: 'Checkout failed unexpectedly. Nothing was charged — try again.' },
      { status: 500 }
    );
  }
}

async function handleCheckout(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid checkout details.' }, { status: 400 });
  }

  // Resolve every line against the catalog; unknown slugs fail the whole
  // checkout rather than silently dropping items from the charge.
  const receiptLines: { slug: string; size: ShopSize; quantity: number; unitPrice: number }[] = [];
  for (const line of parsed.lines) {
    const product = getShopProduct(line.slug);
    if (!product) {
      return NextResponse.json(
        { error: `Unknown product: ${line.slug}.` },
        { status: 400 }
      );
    }
    receiptLines.push({
      slug: line.slug,
      size: line.size,
      quantity: line.quantity,
      unitPrice: product.price,
    });
  }

  const subtotal = receiptLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  // iKhokha takes the smallest currency unit — cents for ZAR.
  const amountCents = Math.round(subtotal * 100);
  if (amountCents <= 0) {
    return NextResponse.json({ error: 'Cart total is invalid.' }, { status: 400 });
  }

  let config;
  try {
    config = ikhokhaConfig();
  } catch (e) {
    console.error('[shop/checkout] payment provider not configured', e);
    return NextResponse.json(
      { error: 'Payments are not connected yet. Try again later.' },
      { status: 503 }
    );
  }

  const supabase = createServiceRoleClient();

  const { data: order, error: insertError } = await supabase
    .from('shop_orders')
    .insert({
      lines: receiptLines,
      amount_cents: amountCents,
      currency: 'ZAR',
      contact: parsed.contact,
      shipping: parsed.shipping,
    })
    .select('id')
    .single();

  if (insertError || !order) {
    console.error('[shop/checkout] order insert failed', insertError);
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 });
  }

  // One order id per paylink attempt: iKhokha requires a unique
  // externalTransactionID, so a retry is a fresh order, not a reused one.
  // Abandoned pending rows are harmless (see order-status sync).
  try {
    const paylink = await createPaylink(
      {
        entityID: config.appId,
        amount: amountCents,
        currency: 'ZAR',
        requesterUrl: siteUrl,
        mode: config.mode,
        description: 'BHOLO merch order',
        paymentReference: order.id,
        externalTransactionID: order.id,
        urls: {
          callbackUrl: absoluteUrl(IKHOKHA_WEBHOOK_PATH),
          successPageUrl: absoluteUrl(`/shop/order/success?ref=${order.id}`),
          failurePageUrl: absoluteUrl(`/shop/order/failure?ref=${order.id}`),
          cancelUrl: absoluteUrl(`/shop/order/cancelled?ref=${order.id}`),
        },
      },
      config
    );

    await supabase
      .from('shop_orders')
      .update({ paylink_id: paylink.paylinkID, ik_response: paylink })
      .eq('id', order.id);

    return NextResponse.json({ paylinkUrl: paylink.paylinkUrl, orderId: order.id });
  } catch (e) {
    console.error('[shop/checkout] paylink creation failed', e);
    await supabase.from('shop_orders').update({ status: 'failed' }).eq('id', order.id);
    return NextResponse.json(
      { error: 'Could not reach the payment provider. No charge was made — try again.' },
      { status: 502 }
    );
  }
}
