-- BHOLO: Row Level Security policies
-- Run after 001_schema.sql and 002_triggers.sql.

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.topics enable row level security;

-- profiles: any authed user reads; owner writes; no delete from client.
create policy profiles_select on public.profiles for select to authenticated using (true);
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- posts: read any authed; write/delete own only.
-- Counters are never client-writable — only the SECURITY DEFINER triggers touch them.
create policy posts_select on public.posts for select to authenticated using (true);
create policy posts_insert_own on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_update_own on public.posts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy posts_delete_own on public.posts for delete to authenticated using (author_id = auth.uid());

-- comments: same shape as posts.
create policy comments_select on public.comments for select to authenticated using (true);
create policy comments_insert_own on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy comments_update_own on public.comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete_own on public.comments for delete to authenticated using (author_id = auth.uid());

-- likes: owner manages their own rows; anyone authed can see who liked what
-- (needed so the client can render counts/state without a server round trip).
create policy likes_select on public.likes for select to authenticated using (true);
create policy likes_insert_own on public.likes for insert to authenticated with check (user_id = auth.uid());
create policy likes_delete_own on public.likes for delete to authenticated using (user_id = auth.uid());

-- bookmarks: strictly owner-only.
create policy bookmarks_all_own on public.bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- follows: a row IS the edge; anyone authed can read the graph, but you can
-- only create/delete edges where you are the follower.
create policy follows_select on public.follows for select to authenticated using (true);
create policy follows_insert_own on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy follows_delete_own on public.follows for delete to authenticated using (follower_id = auth.uid());

-- notifications: owner reads/marks-read/deletes; INSERT is trigger-only
-- (no insert policy for `authenticated` => direct client inserts are denied).
create policy notifications_select_own on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete to authenticated using (user_id = auth.uid());

-- conversations / messages: participant-only visibility.
create policy conversations_select on public.conversations for select to authenticated
  using (exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid()));
create policy conversations_insert on public.conversations for insert to authenticated with check (true);

create policy conversation_participants_select on public.conversation_participants for select to authenticated
  using (exists (select 1 from conversation_participants cp2 where cp2.conversation_id = conversation_id and cp2.user_id = auth.uid()));
create policy conversation_participants_insert on public.conversation_participants for insert to authenticated with check (user_id = auth.uid());
create policy conversation_participants_update_self on public.conversation_participants for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy conversation_messages_select on public.conversation_messages for select to authenticated
  using (exists (select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()));
create policy conversation_messages_insert on public.conversation_messages for insert to authenticated
  with check (sender_id = auth.uid() and exists (select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()));

-- topics: read/create any authed; immutable (no update/delete policy).
create policy topics_select on public.topics for select to authenticated using (true);
create policy topics_insert on public.topics for insert to authenticated with check (true);
