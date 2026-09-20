-- BHOLO shop orders (iKhokha hosted checkout).
--
-- Guest checkout has no signed-in user, so nothing here is readable or
-- writable by anon/authenticated roles at all: RLS is enabled with NO
-- policies, and the server routes act through the service-role key, which
-- bypasses RLS. The shopper's only window into an order is the
-- /api/shop/order-status route, which re-verifies against iKhokha and
-- returns the status (never secrets, never other orders).
--
-- Reconciliation key: id doubles as iKhokha's externalTransactionID, so a
-- webhook or status lookup maps back to exactly one row with no join.
create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    constraint shop_orders_status check (status in ('pending', 'paid', 'failed', 'cancelled')),
  -- Snapshot of the cart at checkout: [{ slug, size, quantity, unitPrice }]
  -- Prices are re-resolved server-side from the catalog at checkout time;
  -- this snapshot is the receipt, not the source of the charge.
  lines jsonb not null default '[]'::jsonb,
  amount_cents integer not null constraint shop_orders_amount_positive check (amount_cents > 0),
  currency text not null default 'ZAR',
  contact jsonb not null default '{}'::jsonb,
  shipping jsonb not null default '{}'::jsonb,
  -- iKhokha identifiers, filled in after the paylink is created.
  paylink_id text,
  ik_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shop_orders_paylink_idx on public.shop_orders (paylink_id);
create index shop_orders_status_idx on public.shop_orders (status);

alter table public.shop_orders enable row level security;
-- Intentionally no policies: service-role only. If an admin order view is
-- ever built, add a select policy gated on public.is_admin() (013) then.
