-- BHOLO: drop the Fantasy and Communities features entirely.
-- Run this once against the already-live database (001-003 have already
-- been edited to no longer create these objects on fresh installs, but
-- editing history doesn't undo what's already applied).

drop trigger if exists community_member_count_trigger on public.community_members;
drop function if exists public.tg_community_member_count();

drop table if exists public.fantasy_squads;
drop table if exists public.community_members;

alter table public.posts drop column if exists community_id;
alter table public.posts drop column if exists tribe_id;

drop table if exists public.communities;
