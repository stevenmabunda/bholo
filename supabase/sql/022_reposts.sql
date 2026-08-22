-- Reposts, as rows rather than a number.
--
-- Reposting a comment did nothing at all: the button changed colour and the
-- click ended there. Posts were only half better — increment_repost_count bumps
-- a counter with no record of who did it, so the same person could reload and
-- add to it again, and nothing could ever show them they had already reposted.
--
-- This mirrors `likes`, which already got this right: one row per person per
-- thing, the primary key making a second one impossible, and a trigger keeping
-- the counter in step. Posts and comments share the table the same way likes do.

create table if not exists public.reposts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Exactly one target, never both and never neither.
  constraint reposts_one_target check (num_nonnulls(post_id, comment_id) = 1)
);

-- One repost per person per thing. Two partial indexes rather than a primary
-- key, because the unused column is null and nulls do not collide.
create unique index if not exists reposts_post_unique
  on public.reposts (user_id, post_id) where post_id is not null;
create unique index if not exists reposts_comment_unique
  on public.reposts (user_id, comment_id) where comment_id is not null;

create index if not exists reposts_user_idx on public.reposts (user_id);

-- Counters stay in step here, so no client ever writes them.
create or replace function public.tg_reposts_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if new.post_id is not null then
      update posts set reposts_count = reposts_count + 1 where id = new.post_id;
    else
      update comments set reposts_count = reposts_count + 1 where id = new.comment_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if old.post_id is not null then
      update posts set reposts_count = greatest(reposts_count - 1, 0) where id = old.post_id;
    else
      update comments set reposts_count = greatest(reposts_count - 1, 0) where id = old.comment_id;
    end if;
  end if;
  return null;
end $$;

drop trigger if exists reposts_count_trigger on public.reposts;
create trigger reposts_count_trigger
after insert or delete on public.reposts
for each row execute function public.tg_reposts_count();

alter table public.reposts enable row level security;

-- Same shape as likes: your own rows are yours, everyone can see who reposted.
create policy reposts_select on public.reposts for select to authenticated using (true);
create policy reposts_insert_own on public.reposts for insert to authenticated with check (user_id = auth.uid());
create policy reposts_delete_own on public.reposts for delete to authenticated using (user_id = auth.uid());

-- A table in a realtime publication with no replica identity refuses every
-- delete — the same thing that made posts undeletable in 012. Set it now rather
-- than discover it the first time someone un-reposts.
alter table public.reposts replica identity full;
