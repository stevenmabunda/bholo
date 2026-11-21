-- BHOLO: Web Push subscriptions, per-user match notification preferences,
-- and the last-seen state of each fixture so the cron can detect kick-off,
-- goals and the final whistle.
--
-- Run this by hand in the Supabase SQL editor (there is no migration runner;
-- see README). The cron route uses the service-role key, so its own reads and
-- writes bypass RLS; the tables below stay closed to everyone else.

-- ---------------------------------------------------------------------------
-- 1. Devices
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Push services may rotate an endpoint, but one endpoint belongs to one
  -- browser install, so a unique constraint makes re-subscribing idempotent.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own_select on public.push_subscriptions;
create policy push_subscriptions_own_select on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists push_subscriptions_own_insert on public.push_subscriptions;
create policy push_subscriptions_own_insert on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists push_subscriptions_own_update on public.push_subscriptions;
create policy push_subscriptions_own_update on public.push_subscriptions
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_subscriptions_own_delete on public.push_subscriptions;
create policy push_subscriptions_own_delete on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Which events a person wants
-- ---------------------------------------------------------------------------
create table if not exists public.push_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  goals boolean not null default true,
  kickoff boolean not null default true,
  fulltime boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.push_preferences enable row level security;

drop policy if exists push_preferences_own on public.push_preferences;
create policy push_preferences_own on public.push_preferences
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.push_preferences to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Fixture state, written only by the cron
-- ---------------------------------------------------------------------------
-- event_id is TheSportsDB's idEvent. status is our three-way view: NS, LIVE
-- or FT. Scores are stored separately so a goal is a simple "higher than
-- last time" comparison rather than parsing the displayed score string.
create table if not exists public.match_notification_state (
  event_id text primary key,
  status text not null check (status in ('NS', 'LIVE', 'FT')),
  home_score integer,
  away_score integer,
  kickoff_notified boolean not null default false,
  fulltime_notified boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.match_notification_state enable row level security;

-- No policies on purpose. The service role bypasses RLS; no browser should
-- ever read or write this bookkeeping table.
revoke all on public.match_notification_state from anon, authenticated;
