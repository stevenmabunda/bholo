-- BHOLO: remember how big a creative actually is.
--
-- The feed slot rendered every image in a hardcoded 16:9 box with object-cover.
-- The first real creative was 1080x1080, so a third of a square advert was
-- cropped away — the layout was deciding the shape instead of the asset.
--
-- Storing the intrinsic size lets the slot take its shape from the file, and
-- lets the back office tell someone their artwork is out of spec at upload
-- rather than after it has run for a week.

alter table public.ad_creatives
  add column if not exists media_width integer,
  add column if not exists media_height integer;

-- Serving needs the dimensions too, so the slot can reserve the right space
-- before the image loads and not shift the feed underneath a reader.
create or replace function public.servable_feed_ads(p_limit integer default 2)
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
  where cr.placement = 'feed'
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

grant execute on function public.servable_feed_ads(integer) to anon, authenticated;

-- Backfill the one creative that predates this. 1080x1080, measured from the
-- file itself.
update public.ad_creatives
set media_width = 1080, media_height = 1080
where media_url is not null and media_width is null;
