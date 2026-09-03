-- BHOLO: post reports + user blocking.
--
-- "Report post" and "Block user" have existed as menu items with no onClick
-- behind them since the menus were built — a user hitting either got nothing:
-- no confirmation, no record, no effect. This is the backend for both.

-- ── reports ──────────────────────────────────────────────────────
--
-- Append-only from the client: a report is inserted and never read back by
-- its author. No admin queue UI yet — that is real follow-up work, not done
-- here — but the row lands somewhere durable and admin-readable rather than
-- vanishing, which is the part that was actually missing.
create table public.post_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  -- One open report per person per post — resubmitting isn't a stronger
  -- signal, it's the same signal twice.
  unique (reporter_id, post_id)
);
create index post_reports_post_idx on public.post_reports (post_id);

alter table public.post_reports enable row level security;

create policy post_reports_insert_own on public.post_reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- Admin-readable using the helper already defined in 013_admin_and_ads.sql —
-- no queue reads this yet, but the policy is ready for when one exists.
create policy post_reports_select_admin on public.post_reports for select to authenticated
  using (public.is_admin());

-- ── blocks ───────────────────────────────────────────────────────
--
-- Same shape as follows (001_schema.sql) — a row IS the edge — but private
-- rather than public. Who blocked whom is not something the blocked side (or
-- anyone else) gets to read; unlike a follow, revealing it both invites
-- retaliation and defeats the point.
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);
-- Covers "does X block me" (the direction posts_select/comments_select below
-- need) the same way follows_followed_idx covers "who follows X".
create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy blocks_select_own on public.blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy blocks_delete_own on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());
-- No direct insert policy: blocking goes through block_user() below, so it
-- can also tear down any existing follow in the same transaction. A bare
-- insert policy would let a block be created without that cleanup.

-- Blocking must also cost both sides any follow between them — X does this,
-- and leaving one direction of "follows a person they blocked" behind reads
-- as the feature half-working. Deleting the OTHER person's follow row needs
-- to bypass RLS (follows_delete_own only lets you delete your own), so this
-- runs as its owner rather than as two separate client calls.
create or replace function public.block_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if p_blocked_id is null or p_blocked_id = v_me then
    raise exception 'cannot block yourself';
  end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_me, p_blocked_id)
  on conflict do nothing;

  delete from public.follows
  where (follower_id = v_me and followed_id = p_blocked_id)
     or (follower_id = p_blocked_id and followed_id = v_me);
end;
$$;

revoke all on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

-- ── enforcement ──────────────────────────────────────────────────
--
-- A block that only hides a name from a "blocked list" screen isn't a block
-- — the point is not seeing them. Both directions: if either side blocked
-- the other, neither sees the other's posts/comments. Anonymous readers
-- (posts_select_anon, 009_public_post_reads.sql) have no identity to block
-- against and are untouched — a shared post link still opens for everyone,
-- same as before.
--
-- A correlated subquery per row is fine at today's size; if posts_select
-- ever shows up in a slow-query report, this is the first place to look —
-- see queryKeys.feed's own note on the interactions fetch for the same kind
-- of "revisit once it matters" flag.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated
  using (
    not exists (
      select 1 from public.blocks
      where (blocker_id = auth.uid() and blocked_id = author_id)
         or (blocker_id = author_id and blocked_id = auth.uid())
    )
  );

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated
  using (
    not exists (
      select 1 from public.blocks
      where (blocker_id = auth.uid() and blocked_id = author_id)
         or (blocker_id = author_id and blocked_id = auth.uid())
    )
  );
