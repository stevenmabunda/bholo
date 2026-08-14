-- BHOLO: fix "Failed to delete post" when others have interacted with it
--
-- Deleting a post cascades to comments, likes (on the post and on its
-- comments), bookmarks, and notifications - any of which can be owned
-- by a DIFFERENT user (anyone who liked/commented/bookmarked the post).
-- Their RLS delete policies only allow deleting their own rows
-- (`comments_delete_own`, `likes_delete_own`, `bookmarks_all_own`,
-- `notifications_delete_own`), so a plain `delete from posts where
-- id = ...` as the post owner fails outright the moment anyone else has
-- interacted with the post - the cascade can't get past their policies.
--
-- Fix: a SECURITY DEFINER function that checks ownership explicitly
-- (RLS isn't needed for authorization here, the function does it) and
-- performs the delete with elevated privileges, so the cascade can
-- clear other users' rows too.

create or replace function public.delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.posts where id = p_post_id and author_id = auth.uid()
  ) then
    raise exception 'Not authorized to delete this post';
  end if;

  delete from public.posts where id = p_post_id;
end;
$$;

grant execute on function public.delete_post(uuid) to authenticated;
