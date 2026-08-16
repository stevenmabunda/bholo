-- BHOLO: count trending topics in Postgres instead of in the app.
--
-- getRecentTopics selected every topic row in the 72-hour window and tallied
-- them in JavaScript. PostgREST caps a response at 1000 rows, and the query
-- passed no limit, no ordering and no pagination — so once the window held
-- more than 1000 rows the action silently received only the first 1000, which
-- without an ORDER BY is effectively the oldest.
--
-- The counts froze at that moment. New posts kept writing topic rows and none
-- of them were ever counted: the window had 1068 rows, the action saw 1000,
-- and the newest row it could see was hours old.
--
-- Aggregating here removes the cap entirely — one small result row per topic
-- instead of one row per mention — and the work lands on the created_at index
-- rather than in Node.
--
-- security invoker so the existing topics_select policy still applies.

create or replace function public.trending_topics(
  since timestamptz,
  min_count integer default 2,
  max_topics integer default 5
)
returns table (topic text, post_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select t.topic, count(*) as post_count
  from public.topics t
  where t.created_at >= since
  group by t.topic
  having count(*) >= min_count
  order by count(*) desc, t.topic asc
  limit max_topics;
$$;

grant execute on function public.trending_topics(timestamptz, integer, integer) to authenticated;

-- Supports the group-by within the window; the existing created_at index
-- alone still has to sort every matching row by topic.
create index if not exists topics_created_at_topic_idx
  on public.topics (created_at desc, topic);
