-- BHOLO: counter-maintenance + notification triggers
-- Run after 001_schema.sql.
-- All SECURITY DEFINER: these run with elevated privilege so ordinary
-- users never need direct write access to counters or other users'
-- notifications rows (that access is granted here, not via RLS).

create or replace function public.tg_likes_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if new.post_id is not null then
      update posts set likes_count = likes_count + 1 where id = new.post_id;
    else
      update comments set likes_count = likes_count + 1 where id = new.comment_id;
    end if;
  elsif TG_OP = 'DELETE' then
    if old.post_id is not null then
      update posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    else
      update comments set likes_count = greatest(likes_count - 1, 0) where id = old.comment_id;
    end if;
  end if;
  return null;
end $$;

create trigger likes_count_trigger
after insert or delete on public.likes
for each row execute function public.tg_likes_count();

create or replace function public.tg_comments_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif TG_OP = 'DELETE' then
    update posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end $$;

create trigger comments_count_trigger
after insert or delete on public.comments
for each row execute function public.tg_comments_count();

create or replace function public.tg_follow_counts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    update profiles set following_count = following_count + 1 where id = new.follower_id;
    update profiles set followers_count = followers_count + 1 where id = new.followed_id;
  elsif TG_OP = 'DELETE' then
    update profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update profiles set followers_count = greatest(followers_count - 1, 0) where id = old.followed_id;
  end if;
  return null;
end $$;

create trigger follow_counts_trigger
after insert or delete on public.follows
for each row execute function public.tg_follow_counts();

-- Notifications: written only here, never by client code.
create or replace function public.tg_notify_on_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare target_author uuid; snippet text;
begin
  if new.post_id is not null then
    select author_id, left(content, 50) into target_author, snippet from posts where id = new.post_id;
    if target_author is not null and target_author <> new.user_id then
      insert into notifications (user_id, type, from_user_id, post_id, content_snippet)
      values (target_author, 'like', new.user_id, new.post_id, snippet);
    end if;
  end if;
  return new;
end $$;

create trigger notify_on_like_trigger
after insert on public.likes
for each row execute function public.tg_notify_on_like();

create or replace function public.tg_notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare target_author uuid;
begin
  select author_id into target_author from posts where id = new.post_id;
  if target_author is not null and target_author <> new.author_id then
    insert into notifications (user_id, type, from_user_id, post_id, content_snippet)
    values (target_author, 'comment', new.author_id, new.post_id, left(new.content, 50));
  end if;
  return new;
end $$;

create trigger notify_on_comment_trigger
after insert on public.comments
for each row execute function public.tg_notify_on_comment();

create or replace function public.tg_notify_on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, from_user_id)
  values (new.followed_id, 'follow', new.follower_id);
  return new;
end $$;

create trigger notify_on_follow_trigger
after insert on public.follows
for each row execute function public.tg_notify_on_follow();

-- Auto-create profile row on signup (replaces client-side setDoc).
-- Expects handle/display_name to be passed via auth.signUp({ options: { data: {...} } }).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, handle, email, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', 'Anonymous User'),
    coalesce(new.raw_user_meta_data->>'handle', 'user_' || substr(new.id::text, 1, 8)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Reposts and poll votes: any authenticated user needs to bump a counter
-- or a jsonb field on someone else's post, which posts_update_own (RLS)
-- correctly forbids. These SECURITY DEFINER RPCs are the one sanctioned
-- way to do that, called via supabase.rpc(...) instead of a direct update.

create or replace function public.increment_repost_count(p_post_id uuid, p_delta int)
returns void language plpgsql security definer set search_path = public as $$
begin
  update posts set reposts_count = greatest(reposts_count + p_delta, 0) where id = p_post_id;
end $$;

create or replace function public.vote_on_poll(p_post_id uuid, p_choice_index int)
returns void language plpgsql security definer set search_path = public as $$
declare
  new_choices jsonb := '[]'::jsonb;
  choice jsonb;
  idx int := 0;
begin
  for choice in select jsonb_array_elements(poll->'choices') from posts where id = p_post_id
  loop
    if idx = p_choice_index then
      choice := jsonb_set(choice, '{votes}', to_jsonb(coalesce((choice->>'votes')::int, 0) + 1));
    end if;
    new_choices := new_choices || jsonb_build_array(choice);
    idx := idx + 1;
  end loop;

  update posts set poll = jsonb_set(poll, '{choices}', new_choices) where id = p_post_id;
end $$;
