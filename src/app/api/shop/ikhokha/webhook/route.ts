import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  ikhokhaConfig,
  IKHOKHA_WEBHOOK_PATH,
  verifyWebhookSignature,
  type WebhookPayload,
} from '@/lib/ikhokha';

/**
 * iKhokha payment outcome webhook — called once per paylink after the
 * shopper pays (or fails to). Verifies ik-sign before trusting anything,
 * then flips the matching order to paid/failed.
 *
 * Always answers 200 for well-formed, verified calls — including unknown
 * order ids — so iKhokha doesn't retry a notification we can't act on.
 * Only signature failures get a non-2xx (403).
 */
export async function POST(request: Request) {
  const signature = request.headers.get('ik-sign');
  const appId = request.headers.get('ik-appid');

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Unreadable body.' }, { status: 400 });
  }

  let config;
  try {
    config = ikhokhaConfig();
  } catch {
    console.error('[shop/webhook] called before iKhokha was configured');
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  if (!appId || appId.trim() !== config.appId.trim()) {
    return NextResponse.json({ error: 'Unknown app id.' }, { status: 403 });
  }

  if (!verifyWebhookSignature({ callbackPath: IKHOKHA_WEBHOOK_PATH, rawBody, signature, secret: config.appSecret })) {
    console.warn('[shop/webhook] signature mismatch');
    return NextResponse.json({ error: 'Bad signature.' }, { status: 403 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const { paylinkID, status, externalTransactionID, responseCode } = payload;
  if (!externalTransactionID || !status) {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
  }

  // responseCode !== '00' means iKhokha itself says the rest of the payload
  // isn't safe to act on — acknowledge it and touch nothing.
  if (responseCode !== '00') {
    console.warn('[shop/webhook] non-00 responseCode', { externalTransactionID, responseCode });
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceRoleClient();
  const nextStatus =
    status === 'SUCCESS' ? 'paid' : status === 'FAILURE' ? 'failed' : null;
  if (!nextStatus) {
    console.warn('[shop/webhook] unknown status value', { status, externalTransactionID });
    return NextResponse.json({ ok: true });
  }

  const { data: order, error } = await supabase
    .from('shop_orders')
    .update({
      status: nextStatus,
      paylink_id: paylinkID ?? undefined,
      paid_at: nextStatus === 'paid' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', externalTransactionID)
    .select('id')
    .single();

  if (error || !order) {
    // Unknown order id (or malformed uuid): log it, still 200 — retrying
    // won't conjure the row into existence.
    console.warn('[shop/webhook] no matching order', { externalTransactionID, error });
  }

  return NextResponse.json({ ok: true });
}
