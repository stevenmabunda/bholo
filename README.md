# BHOLO

South African football banter. Next.js App Router, Supabase for data, auth,
storage and realtime. Deployed on Vercel at `bholo.vercel.app`.

```bash
npm run dev   # http://localhost:9002
```

## Database changes

There is no migration runner. Files in `supabase/sql/` are numbered and run by
hand in the Supabase SQL editor, in order. A file is not applied until someone
pastes it in, so shipping code that depends on a new column before its migration
runs will break the feature for everyone.

Two things that have bitten before and are worth remembering:

- **Column-level grants.** `014` revoked table-level UPDATE on `profiles` and
  re-granted column by column. A new column on that table is unwritable until it
  is added to that grant.
- **Replica identity.** A table in the `supabase_realtime` publication with no
  replica identity refuses every DELETE — see `012`, and `022` which sets it up
  front for that reason.

## Outstanding

Known and deliberate. Nothing here is breaking today; each says what it would
take.

### Worth doing

- **Interactions are read as whole history.** On sign-in the app fetches five
  sets — bookmarks, post likes, post reposts, comment likes, comment reposts —
  capped at the most recent thousand each. Past that ceiling a person's oldest
  likes stop showing as liked; the row is still there, the icon just does not
  know. The fix is looking up state for what is on screen rather than the whole
  history. Nobody is near this yet.
- **ESLint does not run.** `ignoreDuringBuilds: true` in `next.config.ts`. It has
  never been run against this codebase, so turning it on now fails the build on a
  backlog of pre-existing findings rather than on anything newly wrong. Worth its
  own pass.
- **Scroll position is not kept on notifications or explore.** Every other feed
  restores where you were — `useScrollRestoration` is one line to add, but
  neither page renders posts through the same path yet.
- **`010_video_posts_index.sql` may never have been run.** A GIN index for the
  video tab's jsonb query. Unverified; the tab works without it, just slower as
  the table grows.

### Waiting on something

- **Email signup is a dead end.** Confirmation is on and Supabase's built-in
  sender is development-only, so signing up with email hands back no session and
  waits on a mail that never arrives. Google works and needs no email. Password
  reset is broken for the same reason. Both start working the moment custom SMTP
  is configured, which is waiting on the custom domain — or immediately if email
  confirmation is switched off in the dashboard.

### Decided, not missing

Recorded so nobody "fixes" them later.

- **Logged-out readers cannot see replies.** A shared post shows its content and
  an empty conversation. Intended.
- **Replies nest one level only.** Answering a reply attaches it to that reply's
  parent, so a thread cannot indent twice and march off the side of a phone. What
  X does.
- **Comments have no views or share control.** X shows both. We do not track
  per-comment view counts, and a comment has no address of its own to share.
- **The photo viewer opens comments by tap, not swipe.** A drag with snap points
  fights the swipeable image carousel underneath it and is worth doing properly
  rather than first.
- **Feed photos are bounded differently on the two screens.** A phone fills the
  column and clamps to 4:5. Desktop caps the height at 500px and keeps the
  photo's own shape, so a tall one comes out narrower than the column, centred.
  See `src/lib/media-aspect.ts`.
