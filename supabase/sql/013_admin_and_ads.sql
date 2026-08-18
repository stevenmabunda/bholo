-- BHOLO: admin role, and the schema the managed ad back-office sits on.
--
-- Everything in this app has so far been peer-equivalent: every RLS policy is
-- `to authenticated using (true)`, because one user is much like another. Ads
-- are the first thing that is not — there is now a distinction between staff
-- and members, and between a person and a company that buys inventory.

-- ---------------------------------------------------------------------------
-- 1. Roles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text not null default 'member';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('member', 'admin'));
  end if;
end $$;

-- profiles_update_self lets a user update their own row, which would now let
-- anyone grant themselves the admin role. RLS cannot express "any column but
-- this one", so the privilege is removed at the column level instead. Role
-- changes are made by a service-role connection — the SQL editor — only.
revoke update (role) on public.profiles from authenticated;

-- SECURITY DEFINER so policies can call it without re-entering the RLS that is
-- currently being evaluated.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Who is buying
-- ---------------------------------------------------------------------------

-- A company, not a user. It outlives whichever person happens to be the
-- contact, which is why this is not a flag on profiles.
create table if not exists public.advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. The campaign hierarchy
-- ---------------------------------------------------------------------------

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.advertisers(id) on delete cascade,
  name text not null,
  objective text not null default 'awareness'
    check (objective in ('awareness', 'traffic', 'engagement')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- pending_review exists from the start even though only staff set it today,
  -- so self-serve is an addition rather than a migration.
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'scheduled', 'live', 'paused', 'ended')),
  rate_cents integer not null default 0,
  rate_model text not null default 'flat' check (rate_model in ('flat', 'cpm', 'cpc')),
  created_at timestamptz not null default now(),
  constraint ad_campaigns_dates check (ends_at > starts_at)
);

create index if not exists ad_campaigns_advertiser_idx
  on public.ad_campaigns (advertiser_id, created_at desc);

-- Tiers 2 and 3 merged while there is one creative per placement. Splitting
-- them later is additive.
create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  placement text not null default 'feed'
    check (placement in ('feed', 'sidebar', 'trend', 'video')),
  media_url text,
  headline text,
  body text,
  cta_label text,
  destination_url text,
  target_clubs text[],
  target_regions text[],
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ad_creatives_campaign_idx
  on public.ad_creatives (campaign_id);

-- ---------------------------------------------------------------------------
-- 4. Delivery, recorded as events
-- ---------------------------------------------------------------------------

-- Events rather than counters. A counter can report a total and nothing else:
-- not which day worked, not which placement earned its slot, and it cannot be
-- recomputed if the counting is later found to be wrong. Advertisers dispute
-- numbers; this is what lets you answer them.
create table if not exists public.ad_events (
  id bigserial primary key,
  creative_id uuid not null references public.ad_creatives(id) on delete cascade,
  kind text not null check (kind in ('impression', 'click')),
  user_id uuid references public.profiles(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create index if not exists ad_events_creative_time_idx
  on public.ad_events (creative_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------

alter table public.advertisers   enable row level security;
alter table public.ad_campaigns  enable row level security;
alter table public.ad_creatives  enable row level security;
alter table public.ad_events     enable row level security;

-- Staff only, for everything. Self-serve later adds membership-scoped policies
-- alongside these rather than replacing them.
drop policy if exists advertisers_admin on public.advertisers;
create policy advertisers_admin on public.advertisers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists ad_campaigns_admin on public.ad_campaigns;
create policy ad_campaigns_admin on public.ad_campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists ad_creatives_admin on public.ad_creatives;
create policy ad_creatives_admin on public.ad_creatives
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Serving needs to read a creative that is approved and whose campaign is
-- live. Nothing else about it is readable, and only these columns matter to a
-- viewer. Anon included, since a logged-out visitor sees the feed too.
drop policy if exists ad_creatives_serve on public.ad_creatives;
create policy ad_creatives_serve on public.ad_creatives
  for select to authenticated, anon
  using (
    review_status = 'approved'
    and exists (
      select 1 from public.ad_campaigns c
      where c.id = ad_creatives.campaign_id
        and c.status = 'live'
        and now() between c.starts_at and c.ends_at
    )
  );

-- Anyone may record that they saw or clicked an ad; only staff may read the
-- log. Note this is trusted client input — good enough for reporting on
-- direct-sold inventory, not good enough to bill a stranger on. Moving this
-- behind a validating RPC is the natural hardening step.
drop policy if exists ad_events_insert on public.ad_events;
create policy ad_events_insert on public.ad_events
  for insert to authenticated, anon with check (true);

drop policy if exists ad_events_read on public.ad_events;
create policy ad_events_read on public.ad_events
  for select to authenticated using (public.is_admin());

grant select, insert on public.ad_events to anon, authenticated;
grant usage, select on sequence public.ad_events_id_seq to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Make yourself an admin
-- ---------------------------------------------------------------------------
-- Run this with your own handle. Nothing in the app can do it: the column is
-- not updatable by authenticated users, by design.
--
--   update public.profiles set role = 'admin' where handle = 'footballslayer';
