-- BHOLO: let logged-out visitors and link crawlers read a single post.
--
-- The middleware already treats /post/[id] as public, matching how X and
-- Instagram let anyone open a link to one post. RLS never agreed: the only
-- SELECT policy on posts was "to authenticated", so an anonymous request read
-- nothing, getPost returned null, and the page rendered "Post not found".
--
-- That is why shared links previewed as bare text. WhatsApp, Facebook and X
-- fetch the URL with their own crawler, signed in as nobody. They were served
-- the not-found page, so there was no title, no description and no image to
-- pull — no amount of Open Graph tagging could fix it from the app side.
--
-- Scheduled posts stay hidden. anon has no auth.uid(), so the author exemption
-- in the authenticated policy cannot apply here and is deliberately omitted.
--
-- Nothing else opens up: every column on posts is already rendered publicly in
-- the app, and insert/update/delete remain authenticated-and-own-row-only.

-- Safe to re-run.
drop policy if exists posts_select_anon on public.posts;
create policy posts_select_anon on public.posts for select to anon
  using (
    scheduled_for is null
    or scheduled_for <= now()
  );

grant select on public.posts to anon;
