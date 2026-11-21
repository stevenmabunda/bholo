-- BHOLO: staff moderation — admins may edit and delete any post.
--
-- Run this by hand in the Supabase SQL editor (there is no migration runner;
-- see README). Until it has been run, the admin UI will not appear and
-- delete_post will keep rejecting posts the caller did not write.
--
-- The account below is promoted by email because profiles.id is the auth
-- user id and the email is what the operator knows. `role` is not writable
-- from the app (014_fix_role_escalation.sql), so this is the only way in.

-- ---------------------------------------------------------------------------
-- 1. Promote the owner account
-- ---------------------------------------------------------------------------

update public.profiles p
set role = 'admin'
from auth.users u
where u.id = p.id
  and lower(u.email) = lower('mabunda.stevenn@gmail.com');

-- ---------------------------------------------------------------------------
-- 2. Let admins edit any post (copy and media)
-- ---------------------------------------------------------------------------
-- Permissive policies are OR'ed, so this sits alongside posts_update_own
-- rather than replacing it: members keep editing their own posts, admins can
-- edit anyone's. `with check` repeats the same test so an admin cannot use
-- the policy to hand a post to somebody else.

drop policy if exists posts_update_admin on public.posts;
create policy posts_update_admin on public.posts
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Let admins delete any post
-- ---------------------------------------------------------------------------
-- The app deletes through delete_post() rather than a direct delete because
-- the cascade has to clear other people's likes/comments/bookmarks. Keep that
-- path and widen its ownership check; the direct policy is here so the rule
-- holds for any future code that deletes without the RPC.

create or replace function public.delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.posts
    where id = p_post_id
      and (author_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'Not authorized to delete this post';
  end if;

  delete from public.posts where id = p_post_id;
end;
$$;

grant execute on function public.delete_post(uuid) to authenticated;

drop policy if exists posts_delete_admin on public.posts;
create policy posts_delete_admin on public.posts
  for delete to authenticated
  using (public.is_admin());
