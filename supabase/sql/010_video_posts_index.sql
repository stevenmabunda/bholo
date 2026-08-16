-- BHOLO: make the Video tab's containment filter indexable.
--
-- getVideoPosts now asks Postgres for posts whose media contains a video
-- (media @> '[{"type":"video"}]') instead of pulling a fortnight of posts and
-- sifting them in JS. The created_at index already narrows that to the recent
-- window, so this is not urgent at the current size — but without a GIN index
-- the containment test is still evaluated row by row across whatever that
-- window holds, and the window is the part that grows.
--
-- jsonb_path_ops is the smaller, faster half of the jsonb GIN family. It only
-- supports containment, which is the single operator this query uses.

create index if not exists posts_media_gin_idx
  on public.posts using gin (media jsonb_path_ops);
