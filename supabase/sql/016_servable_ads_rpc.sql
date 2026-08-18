-- BHOLO: pick the ads a given viewer should see, in one place.
--
-- 013's serving policy could never match anything. It allowed reading an
-- approved creative whose campaign is live:
--
--   using (review_status = 'approved' and exists (
--     select 1 from ad_campaigns c where c.id = ... and c.status = 'live' ...))
--
-- but ad_campaigns is admin-only, and a policy's subquery runs as the querying
-- user — so for everyone who is not staff the EXISTS returned nothing and no ad
-- was ever visible. The same applied to reading the advertiser's name for the
-- byline.
--
-- Doing the whole selection in one SECURITY DEFINER function is both the fix
-- and the better design: campaigns, advertisers and the event log stay
-- unreadable, and the only thing serving can obtain is the handful of fields
-- an ad slot actually renders.
--
-- Targeting, flight dates and the frequency cap are all applied here, so there
-- is exactly one definition of "should this person see this ad" rather than one
-- in SQL and another in TypeScript that can drift apart.

create or replace function public.servable_feed_ads(p_limit integer default 2)
returns table (
  creative_id uuid,
  advertiser_name text,
  headline text,
  body text,
  media_url text,
  cta_label text,
  destination_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_club text;
begin
  select p.favourite_club into v_club from public.profiles p where p.id = v_uid;

  return query
  select cr.id, adv.name, cr.headline, cr.body, cr.media_url, cr.cta_label, cr.destination_url
  from public.ad_creatives cr
  join public.ad_campaigns c on c.id = cr.campaign_id
  join public.advertisers adv on adv.id = c.advertiser_id
  where cr.placement = 'feed'
    and cr.review_status = 'approved'
    and c.status = 'live'
    and now() between c.starts_at and c.ends_at
    and adv.status = 'active'
    -- No targeting means everyone. Targeted creatives need a matching club,
    -- so a viewer who never told us theirs simply does not see them.
    and (
      cr.target_clubs is null
      or array_length(cr.target_clubs, 1) is null
      or (
        v_club is not null
        and lower(v_club) in (select lower(t) from unnest(cr.target_clubs) as t)
      )
    )
    -- Frequency cap, counted across the whole campaign rather than per
    -- creative — a person who has seen the campaign ten times does not care
    -- that it was three different pictures.
    and (
      c.frequency_cap_per_day is null
      or v_uid is null
      or (
        select count(*)
        from public.ad_events e
        join public.ad_creatives cr2 on cr2.id = e.creative_id
        where cr2.campaign_id = c.id
          and e.user_id = v_uid
          and e.kind = 'impression'
          and e.occurred_at >= date_trunc('day', now())
      ) < c.frequency_cap_per_day
    )
  -- Rotates when more than one campaign qualifies, so the same advertiser does
  -- not take every slot by virtue of being created first.
  order by random()
  limit greatest(p_limit, 0);
end;
$$;

grant execute on function public.servable_feed_ads(integer) to anon, authenticated;

-- The policy this replaces can go: it never matched, and serving no longer
-- reads the table directly.
drop policy if exists ad_creatives_serve on public.ad_creatives;
