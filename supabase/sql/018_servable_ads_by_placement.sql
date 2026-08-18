-- BHOLO: serve any placement, not just the feed.
--
-- servable_feed_ads was hardcoded to placement = 'feed'. The back office let
-- someone create and approve a sidebar, trend or video creative, and it then
-- rendered nowhere at all — inventory that could be sold and could never be
-- delivered.
--
-- Same function, with the placement passed in. Every other condition —
-- approval, campaign live, in flight, advertiser active, club targeting and
-- the daily frequency cap — is unchanged and still evaluated in one place, so
-- a second placement cannot drift away from the rules the first one follows.

create or replace function public.servable_ads(
  p_placement text default 'feed',
  p_limit integer default 2
)
returns table (
  creative_id uuid,
  advertiser_name text,
  headline text,
  body text,
  media_url text,
  media_width integer,
  media_height integer,
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
  select cr.id, adv.name, cr.headline, cr.body, cr.media_url,
         cr.media_width, cr.media_height, cr.cta_label, cr.destination_url
  from public.ad_creatives cr
  join public.ad_campaigns c on c.id = cr.campaign_id
  join public.advertisers adv on adv.id = c.advertiser_id
  where cr.placement = p_placement
    and cr.review_status = 'approved'
    and c.status = 'live'
    and now() between c.starts_at and c.ends_at
    and adv.status = 'active'
    and (
      cr.target_clubs is null
      or array_length(cr.target_clubs, 1) is null
      or (
        v_club is not null
        and lower(v_club) in (select lower(t) from unnest(cr.target_clubs) as t)
      )
    )
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
  order by random()
  limit greatest(p_limit, 0);
end;
$$;

grant execute on function public.servable_ads(text, integer) to anon, authenticated;

-- The feed-only version is superseded; nothing calls it after this deploys.
drop function if exists public.servable_feed_ads(integer);
