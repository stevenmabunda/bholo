import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { formatShopPrice } from '@/lib/shop-products';
import {
  getPaylinkStatusByReference,
  ikhokhaConfig,
} from '@/lib/ikhokha';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

/**
 * Public order-status lookup for the /shop/order/* result pages.
 *
 * The redirect back from iKhokha proves nothing on its own (anyone can
 * visit /shop/order/success?ref=<id>), and the webhook can lag behind the
 * redirect — so a still-pending order is re-checked live against iKhokha
 * here and synced before answering. Returns display-safe fields only.
 */
export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get('ref');
  if (!ref) {
    return NextResponse.json({ error: 'Missing order reference.' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from('shop_orders')
    .select('id, status, amount_cents, currency, created_at, paid_at')
    .eq('id', ref)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  let status = order.status as OrderStatus;

  // Webhook hasn't landed (or never will — ad-blockers, network blips):
  // ask iKhokha directly and persist whatever it says.
  if (status === 'pending') {
    try {
      const config = ikhokhaConfig();
      const live = await getPaylinkStatusByReference(order.id, config);
      const synced = live.status === 'PAID' || live.status === 'SUCCESS' ? 'paid' : null;
      if (synced) {
        status = synced;
        await supabase
          .from('shop_orders')
          .update({
            status: synced,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      }
    } catch (e) {
      // iKhokha unreachable or link unknown there — stay pending, the page
      // shows "still confirming" with a retry rather than a false failure.
      console.warn('[shop/order-status] live sync failed', e);
    }
  }

  return NextResponse.json({
    status,
    amount: formatShopPrice((order.amount_cents as number) / 100),
    paidAt: order.paid_at as string | null,
  });
}
