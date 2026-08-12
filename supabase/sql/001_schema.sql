-- BHOLO: core schema
-- Run this first, in order, in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create type media_type as enum ('image', 'video', 'gif', 'sticker');
create type notification_type as enum ('like', 'comment', 'follow', 'mention');

-- ── profiles (1:1 with auth.users) ──────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous User',
  handle text not null unique,
  email text,
  photo_url text,
  banner_url text default 'https://placehold.co/1200x400.png',
  banner_position integer not null default 50,
  bio text default 'Passionate football fan. Discussing all things football. ⚽',
  location text,
  country text,
  favourite_club text,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index profiles_handle_idx on public.profiles (lower(handle));

-- ── posts ────────────────────────────────────────────────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default '',
  author_handle text not null default '',
  author_avatar text,
  content text not null default '',
  media jsonb not null default '[]'::jsonb,
  poll jsonb,
  location text,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  reposts_count integer not null default 0,
  views_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);

-- ── comments ─────────────────────────────────────────────────────
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default '',
  author_handle text not null default '',
  author_avatar text,
  content text not null default '',
  media jsonb not null default '[]'::jsonb,
  likes_count integer not null default 0,
  reposts_count integer not null default 0,
  replies_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at asc);

-- ── likes (posts + comments unified, one row per like) ─────────────
create table public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  constraint likes_unique_post unique (user_id, post_id),
  constraint likes_unique_comment unique (user_id, comment_id)
);
create index likes_post_idx on public.likes (post_id) where post_id is not null;
create index likes_comment_idx on public.likes (comment_id) where comment_id is not null;

-- ── bookmarks ────────────────────────────────────────────────────
create table public.bookmarks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ── follows ──────────────────────────────────────────────────────
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint follows_no_self check (follower_id <> followed_id)
);
create index follows_followed_idx on public.follows (followed_id);

-- ── notifications (written only by triggers, see 002_triggers.sql) ─
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  from_user_id uuid references public.profiles(id) on delete set null,
  post_id uuid references public.posts(id) on delete cascade,
  content_snippet text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on public.notifications (user_id, read, created_at desc);

-- ── conversations / messages (1:1 DMs) ──────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_participants_user_idx on public.conversation_participants (user_id);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
create index conversation_messages_idx on public.conversation_messages (conversation_id, created_at asc);

-- ── topics (raw keyword feed for the Genkit trending-topics flow) ──
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index topics_created_at_idx on public.topics (created_at desc);
