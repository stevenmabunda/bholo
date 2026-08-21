-- Anyone could add themselves to anyone else's conversation.
--
--   with check (user_id = auth.uid())
--
-- reads as "you may only add yourself", which sounds restrictive. It is not:
-- it says nothing about *which* conversation. Knowing a conversation id was
-- enough to join a private chat between two other people and read it from then
-- on. Verified with three users — the third inserted themselves into a
-- conversation they had nothing to do with.
--
-- Until now the recursion in 003 broke every read, so the hole could not be
-- used for anything. Fixing that made it live, which is why this lands with it.
--
-- No client ever needs to write this table: start_conversation is SECURITY
-- DEFINER and does it as the function's owner. So the policy goes, and nothing
-- replaces it — with RLS enabled and no insert policy, direct inserts are
-- refused.

drop policy if exists conversation_participants_insert on public.conversation_participants;

-- last_read_at is still the participant's own to update, and that policy is
-- correctly scoped to their own row.
