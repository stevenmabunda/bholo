-- Replying to a comment, rather than to the post.
--
-- Every reply landed as a fresh top-level comment, so answering someone put
-- your response at the bottom of the thread with nothing connecting it to what
-- you were answering. In a busy thread that reads as a room of people talking
-- past each other.
--
-- One level of nesting, deliberately. A reply to a reply attaches to the same
-- parent rather than indenting further — which is what X does, and it avoids a
-- thread that marches off the right edge of a phone.

alter table public.comments
  add column if not exists parent_comment_id uuid references public.comments(id) on delete cascade;

-- Reading one parent's replies is the query this exists for.
create index if not exists comments_parent_idx
  on public.comments (parent_comment_id, created_at asc)
  where parent_comment_id is not null;

-- replies_count has been on the table since the start and nothing ever wrote to
-- it. It counts direct replies to a comment.
create or replace function public.tg_comment_replies_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' and new.parent_comment_id is not null then
    update comments set replies_count = replies_count + 1 where id = new.parent_comment_id;
  elsif TG_OP = 'DELETE' and old.parent_comment_id is not null then
    update comments set replies_count = greatest(replies_count - 1, 0) where id = old.parent_comment_id;
  end if;
  return null;
end $$;

drop trigger if exists comment_replies_count_trigger on public.comments;
create trigger comment_replies_count_trigger
after insert or delete on public.comments
for each row execute function public.tg_comment_replies_count();

-- A reply is still a comment on the post, so posts.comments_count already
-- counts it via the existing trigger, and the post page's count keeps meaning
-- "everything said here". Nothing to change there.
--
-- Depth is enforced in the application rather than here: a reply whose parent
-- already has a parent is stored against the grandparent, so this column never
-- holds a chain longer than one link.
