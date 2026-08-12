-- BHOLO: enable Realtime replication for the tables the app subscribes to.
-- Run last.

alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.bookmarks;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.conversation_messages;
