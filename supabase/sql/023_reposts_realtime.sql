-- Reposts, live like likes.
--
-- 022 created the table and set its replica identity, but a table only emits
-- realtime events if it is in the publication — and without this the client
-- listener for reposts would sit there receiving nothing. Reposting on a phone
-- would leave a laptop showing the old state until the cache went stale.
--
-- The replica identity was already set in 022, which is what stops this
-- repeating the bug from 012: a table in this publication with no replica
-- identity refuses every delete, so un-reposting would fail.

alter publication supabase_realtime add table public.reposts;
