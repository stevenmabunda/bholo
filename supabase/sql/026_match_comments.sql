-- BHOLO: live match threads.
--
-- One chat-style thread per fixture, keyed by TheSportsDB's own event id
-- rather than a row in our own database — fixtures aren't stored here at
-- all (see src/services/thesportsdb-service.ts), they're fetched live on
-- every request, so there is nothing local to foreign-key against. A
-- fixture_id that never matches a real event just shows an empty thread;
-- nothing else depends on it being valid.
--
-- Deliberately not the posts/comments machinery: no likes, reposts, or
-- nested replies. This is meant to read like a live chat during a match —
-- author, text, timestamp — not a full post thread.
--
-- Depends on public.blocks from 025_reports_and_blocks.sql — run that one
-- first.
create table public.match_comments (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default '',
  author_handle text not null default '',
  author_avatar text,
  content text not null,
  created_at timestamptz not null default now(),
  constraint match_comments_content_length check (char_length(content) between 1 and 500)
);
create index match_comments_fixture_idx on public.match_comments (fixture_id, created_at asc);

alter table public.match_comments enable row level security;

-- Same block enforcement as posts_select/comments_select (025) — a blocked
-- or blocking author's messages don't show, in either direction.
create policy match_comments_select on public.match_comments for select to authenticated
  using (
    not exists (
      select 1 from public.blocks
      where (blocker_id = auth.uid() and blocked_id = author_id)
         or (blocker_id = author_id and blocked_id = auth.uid())
    )
  );
create policy match_comments_insert_own on public.match_comments for insert to authenticated
  with check (author_id = auth.uid());
create policy match_comments_delete_own on public.match_comments for delete to authenticated
  using (author_id = auth.uid());

alter publication supabase_realtime add table public.match_comments;
