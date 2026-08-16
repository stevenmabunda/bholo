-- BHOLO: scheduled posts
--
-- A post with scheduled_for set in the future is not yet published.
--
-- Visibility is enforced in RLS rather than by filtering in each query.
-- Feed, profile, search and bookmark queries all read public.posts from
-- different places; adding "and scheduled_for is null" to every one of
-- them would be easy to miss somewhere and leak an unpublished post.
-- Doing it in the SELECT policy means no application query has to change
-- and there is no way to read someone else's scheduled post at all, even
-- by calling the API directly.
--
-- The author is deliberately exempt so they can see, edit and delete
-- their own pending posts.

alter table public.posts add column if not exists scheduled_for timestamptz;

-- Only scans pending rows; the vast majority of posts have a null here.
create index if not exists posts_scheduled_for_idx
  on public.posts (scheduled_for)
  where scheduled_for is not null;

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated
  using (
    scheduled_for is null
    or scheduled_for <= now()
    or author_id = auth.uid()
  );

-- Publishing. created_at is also bumped to the publish time, otherwise a
-- post scheduled days in advance would surface at its *creation* point in
-- the feed — i.e. buried under everything posted since — instead of at
-- the top when it actually goes live.
create or replace function public.publish_due_posts()
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts
  set created_at = now(),
      scheduled_for = null
  where scheduled_for is not null
    and scheduled_for <= now();
$$;

create extension if not exists pg_cron;

-- Re-scheduling is safe to re-run: unschedule first if it already exists.
select cron.unschedule('publish-due-posts')
where exists (select 1 from cron.job where jobname = 'publish-due-posts');

select cron.schedule(
  'publish-due-posts',
  '* * * * *',
  $$select public.publish_due_posts()$$
);
