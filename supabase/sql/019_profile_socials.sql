-- Social handles on a profile.
--
-- One jsonb column rather than a text column per network, so adding YouTube or
-- Threads later is a UI change instead of a migration. The keys are fixed by
-- the constraint below; the app writes handles, never URLs, and builds the
-- links itself — so there is no user-supplied scheme or domain to sanitise at
-- render time.

alter table public.profiles
  add column if not exists socials jsonb not null default '{}'::jsonb;

-- Keys are limited to what the UI offers, so a stray key cannot arrive and end
-- up rendered as an unknown link.
--
-- Written by subtraction rather than by iterating the keys: a CHECK constraint
-- cannot contain a subquery, and jsonb_each is one. Removing every allowed key
-- must leave an empty object, which says the same thing in an expression the
-- constraint will accept.
--
-- Per-value type and length are not checked here for the same reason. The app
-- normalises and validates each handle before it is written; this is the guard
-- against keys we would not know how to render, plus a cap on total size.
alter table public.profiles
  drop constraint if exists profiles_socials_shape;

alter table public.profiles
  add constraint profiles_socials_shape check (
    jsonb_typeof(socials) = 'object'
    and (socials - 'x' - 'instagram' - 'tiktok' - 'facebook' - 'website') = '{}'::jsonb
    and length(socials::text) <= 1000
  );

-- The escalation fix in 014 revoked table-level UPDATE and re-granted column by
-- column. Without this line the column exists but nobody can write to it, and
-- saving a profile fails with a permission error rather than anything readable.
grant update (socials) on public.profiles to authenticated;
