-- BHOLO: frequency capping on campaigns.
--
-- How many times one person should see a campaign in a day. A feed people
-- refresh all afternoon will otherwise show the same ad until they resent it,
-- and burn the advertiser's impressions on an audience that stopped looking.
--
-- Null means uncapped, which is the right default for direct-sold inventory
-- where the advertiser bought a period rather than a volume.

alter table public.ad_campaigns
  add column if not exists frequency_cap_per_day integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ad_campaigns_freq_check') then
    alter table public.ad_campaigns
      add constraint ad_campaigns_freq_check
      check (frequency_cap_per_day is null or frequency_cap_per_day > 0);
  end if;
end $$;
