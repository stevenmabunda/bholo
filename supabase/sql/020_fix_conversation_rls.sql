-- Direct messages have never worked.
--
-- The policy that decides who may read conversation_participants asked
-- conversation_participants who the participants are:
--
--   using (exists (select 1 from conversation_participants cp2 where ...))
--
-- Evaluating it requires reading the table, which evaluates the policy, which
-- reads the table. Postgres stops that with 42P17, "infinite recursion detected
-- in policy for relation", and every message operation failed on it — including
-- the conversations and conversation_messages policies, which ask the same
-- table the same question.
--
-- The fix is to answer the membership question somewhere RLS is not re-applied.
-- A SECURITY DEFINER function runs as its owner and skips the policy, so the
-- question terminates.

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- ── policies, rebuilt on the helper ──────────────────────────────

drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select to authenticated
  using (public.is_conversation_participant(id));

drop policy if exists conversation_participants_select on public.conversation_participants;
create policy conversation_participants_select on public.conversation_participants for select to authenticated
  -- Your own rows without asking anyone, and everyone else's in a conversation
  -- you belong to.
  using (user_id = auth.uid() or public.is_conversation_participant(conversation_id));

drop policy if exists conversation_messages_select on public.conversation_messages;
create policy conversation_messages_select on public.conversation_messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists conversation_messages_insert on public.conversation_messages;
create policy conversation_messages_insert on public.conversation_messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));

-- ── starting a conversation ──────────────────────────────
--
-- The second bug, which the recursion was hiding. Opening a chat means writing
-- two participant rows: yours and theirs. The insert policy allows only
-- `user_id = auth.uid()`, so the other person's row was always refused — and
-- loosening that policy is not the answer, because "may add rows for other
-- users" is exactly the permission you do not want handed out.
--
-- So the whole operation moves into one function that runs as its owner: find
-- the existing 1:1 or create it, both rows together, nothing partial left
-- behind if it fails.

create or replace function public.start_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if p_other_user_id is null or p_other_user_id = v_me then
    raise exception 'a conversation needs two different people';
  end if;
  if not exists (select 1 from public.profiles where id = p_other_user_id) then
    raise exception 'no such user';
  end if;

  -- An existing 1:1 between exactly these two, rather than a second one.
  select cp.conversation_id into v_id
  from public.conversation_participants cp
  join public.conversation_participants other
    on other.conversation_id = cp.conversation_id
  where cp.user_id = v_me
    and other.user_id = p_other_user_id
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.conversations default values returning id into v_id;
  insert into public.conversation_participants (conversation_id, user_id)
  values (v_id, v_me), (v_id, p_other_user_id);

  return v_id;
end;
$$;

revoke all on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;
