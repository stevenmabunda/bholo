-- BHOLO: actually stop users granting themselves the admin role.
--
-- 013 tried to do this with:
--
--   revoke update (role) on public.profiles from authenticated;
--
-- That does nothing. Supabase grants table-level UPDATE on public tables to
-- the authenticated role, and in Postgres a table-level privilege covers every
-- column — revoking a column-level privilege that was never separately granted
-- leaves the table-level grant intact and the column still writable.
--
-- Verified against the live database: a freshly created ordinary user ran
--
--   update profiles set role = 'admin' where id = <self>
--
-- successfully, is_admin() then returned true for them, and they could write
-- to the advertisers table. Every authenticated account was one request away
-- from the back office.
--
-- The fix is to drop the table-wide UPDATE and grant it back per column. Role
-- is simply not on the list, so no client can write it whatever RLS says.

revoke update on public.profiles from authenticated;

-- Exactly the columns the profile editor sends, and nothing else.
grant update (
  display_name,
  handle,
  photo_url,
  bio,
  location,
  country,
  favourite_club,
  banner_url,
  banner_position
) on public.profiles to authenticated;

-- Deliberately absent, beyond role itself:
--
--   followers_count, following_count — maintained by the SECURITY DEFINER
--     triggers in 002. They were client-writable until now, which meant anyone
--     could have set their own follower count to whatever they liked.
--   id, email, created_at — identity, not profile content.

-- Anon never had any business writing profiles.
revoke update on public.profiles from anon;
