'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Which ad, if any, this person should see right now.
 *
 * The decision lives in the servable_feed_ads function rather than here.
 * Targeting, flight dates and the frequency cap are all conditions on the same
 * query, so there is one definition of who sees what instead of one in SQL and
 * another in TypeScript quietly drifting apart. It also keeps campaigns,
 * advertisers and the event log unreadable: serving can obtain nothing beyond
 * the fields an ad slot renders.
 */

export type ServableAd = {
  creativeId: string;
  advertiserName: string;
  headline: string | null;
  body: string | null;
  mediaUrl: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  ctaLabel: string | null;
  destinationUrl: string | null;
};

export async function getFeedAds(limit = 2): Promise<ServableAd[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('servable_feed_ads', { p_limit: limit });

  if (error) {
    // An ad slot failing should never take the feed with it.
    console.error('Could not load ads:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    creativeId: row.creative_id,
    advertiserName: row.advertiser_name ?? 'Sponsored',
    headline: row.headline,
    body: row.body,
    mediaUrl: row.media_url,
    mediaWidth: row.media_width,
    mediaHeight: row.media_height,
    ctaLabel: row.cta_label,
    destinationUrl: row.destination_url,
  }));
}
