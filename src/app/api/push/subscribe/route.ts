import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Stores this browser's Web Push subscription against the signed-in account.
 *
 * The subscription is per browser install, not per account: signing out and
 * back in as somebody else on the same phone reuses the same endpoint. The
 * row is therefore claimed by the current session on every subscribe, which
 * also keeps the endpoint unique instead of accumulating dead rows.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as
    | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    | null;

  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
  }

  // The unique endpoint means the same browser re-subscribing updates the
  // keys in place rather than adding a second row.
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
      },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('[push] could not save subscription', error);
    return NextResponse.json({ error: 'Could not save subscription.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const endpoint = new URL(request.url).searchParams.get('endpoint');
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[push] could not remove subscription', error);
    return NextResponse.json({ error: 'Could not remove subscription.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
