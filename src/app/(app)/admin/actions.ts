'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Back-office actions.
 *
 * Every one of these re-checks admin status on the server. RLS already blocks
 * a non-admin, but a failed policy surfaces as an empty result or a confusing
 * error — checking here means the answer is "you are not an admin" rather than
 * "nothing happened".
 */

export type Advertiser = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  status: 'active' | 'paused' | 'archived';
  notes: string | null;
  createdAt: string;
  campaignCount: number;
};

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: 'You need to be signed in.' as const };

  const { data } = await supabase.rpc('is_admin');
  if (!data) return { supabase, error: 'That area is staff only.' as const };

  return { supabase, user, error: null };
}

/** Whether the signed-in user may see the back-office at all. */
export async function checkIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('[admin] no session on the server');
    return false;
  }
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    // Swallowing this turned a broken grant into a bare 404, which looks
    // identical to "you are not an admin" and is far harder to chase.
    console.error('[admin] is_admin() failed for', user.id, error);
    return false;
  }
  return data === true;
}

export async function listAdvertisers(): Promise<Advertiser[]> {
  const { supabase, error } = await requireAdmin();
  if (error) return [];

  const { data, error: queryError } = await supabase
    .from('advertisers')
    .select('*, ad_campaigns(count)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (queryError) {
    console.error('Could not list advertisers:', queryError);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    campaignCount: row.ad_campaigns?.[0]?.count ?? 0,
  }));
}

export async function createAdvertiser(input: {
  name: string;
  contactName?: string;
  contactEmail?: string;
  notes?: string;
}): Promise<{ id: string } | { error: string }> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };

  const name = input.name?.trim();
  if (!name) return { error: 'Give the advertiser a name.' };

  const { data, error: insertError } = await supabase
    .from('advertisers')
    .insert({
      name,
      contact_name: input.contactName?.trim() || null,
      contact_email: input.contactEmail?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (insertError || !data) {
    console.error('Could not create advertiser:', insertError);
    return { error: `Could not save that advertiser — ${insertError?.message ?? 'no row returned'}` };
  }

  revalidatePath('/admin/advertisers');
  return { id: data.id };
}

export async function setAdvertiserStatus(
  id: string,
  status: Advertiser['status']
): Promise<{ ok: true } | { error: string }> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };

  const { error: updateError } = await supabase
    .from('advertisers')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    console.error('Could not update advertiser:', updateError);
    return { error: 'Could not update that advertiser.' };
  }

  revalidatePath('/admin/advertisers');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export type Campaign = {
  id: string;
  advertiserId: string;
  name: string;
  objective: 'awareness' | 'traffic' | 'engagement';
  startsAt: string;
  endsAt: string;
  status: 'draft' | 'pending_review' | 'scheduled' | 'live' | 'paused' | 'ended';
  rateCents: number;
  rateModel: 'flat' | 'cpm' | 'cpc';
  frequencyCapPerDay: number | null;
  creativeCount: number;
  impressions: number;
  clicks: number;
};

export async function getAdvertiser(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return null;

  const { data } = await supabase.from('advertisers').select('*').eq('id', id).single();
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    contactName: data.contact_name,
    contactEmail: data.contact_email,
    status: data.status as Advertiser['status'],
    notes: data.notes,
  };
}

export async function listCampaigns(advertiserId: string): Promise<Campaign[]> {
  const { supabase, error } = await requireAdmin();
  if (error) return [];

  const { data, error: queryError } = await supabase
    .from('ad_campaigns')
    .select('*, ad_creatives(id)')
    .eq('advertiser_id', advertiserId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (queryError) {
    console.error('Could not list campaigns:', queryError);
    return [];
  }

  // Delivery totals per campaign, counted from the event log rather than a
  // stored number, so they can always be recomputed.
  const campaignIds = (data ?? []).map((c: any) => c.id);
  const totals = new Map<string, { impressions: number; clicks: number }>();

  if (campaignIds.length) {
    const { data: events } = await supabase
      .from('ad_events')
      .select('kind, ad_creatives!inner(campaign_id)')
      .in('ad_creatives.campaign_id', campaignIds)
      .limit(50000);

    for (const row of (events ?? []) as any[]) {
      const key = row.ad_creatives?.campaign_id;
      if (!key) continue;
      const entry = totals.get(key) ?? { impressions: 0, clicks: 0 };
      if (row.kind === 'impression') entry.impressions++;
      else if (row.kind === 'click') entry.clicks++;
      totals.set(key, entry);
    }
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    advertiserId: row.advertiser_id,
    name: row.name,
    objective: row.objective,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    rateCents: row.rate_cents,
    rateModel: row.rate_model,
    frequencyCapPerDay: row.frequency_cap_per_day,
    creativeCount: row.ad_creatives?.length ?? 0,
    impressions: totals.get(row.id)?.impressions ?? 0,
    clicks: totals.get(row.id)?.clicks ?? 0,
  }));
}

export async function createCampaign(input: {
  advertiserId: string;
  name: string;
  objective: Campaign['objective'];
  startsAt: string;
  endsAt: string;
  rateRands: number;
  rateModel: Campaign['rateModel'];
  frequencyCapPerDay: number | null;
}): Promise<{ id: string } | { error: string }> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };

  const name = input.name?.trim();
  if (!name) return { error: 'Give the campaign a name.' };
  if (!input.startsAt || !input.endsAt) return { error: 'Set a start and end date.' };
  if (new Date(input.endsAt) <= new Date(input.startsAt)) {
    return { error: 'The end date has to be after the start date.' };
  }

  const { data, error: insertError } = await supabase
    .from('ad_campaigns')
    .insert({
      advertiser_id: input.advertiserId,
      name,
      objective: input.objective,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      // Rands in the form, cents in the database — never store money as a float.
      rate_cents: Math.round((input.rateRands || 0) * 100),
      rate_model: input.rateModel,
      frequency_cap_per_day: input.frequencyCapPerDay,
    })
    .select('id')
    .single();

  if (insertError || !data) {
    console.error('Could not create campaign:', insertError);
    return { error: `Could not save that campaign — ${insertError?.message ?? 'no row returned'}` };
  }

  revalidatePath(`/admin/advertisers/${input.advertiserId}`);
  return { id: data.id };
}

export async function setCampaignStatus(
  id: string,
  status: Campaign['status']
): Promise<{ ok: true } | { error: string }> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };

  if (status === 'live') {
    // Going live with nothing approved would serve an empty slot.
    const { data: approved } = await supabase
      .from('ad_creatives')
      .select('id')
      .eq('campaign_id', id)
      .eq('review_status', 'approved')
      .limit(1);

    if (!approved?.length) {
      return { error: 'Approve at least one creative before this goes live.' };
    }
  }

  const { error: updateError } = await supabase
    .from('ad_campaigns')
    .update({ status })
    .eq('id', id);

  if (updateError) {
    console.error('Could not update campaign:', updateError);
    return { error: 'Could not update that campaign.' };
  }

  revalidatePath('/admin');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Creatives
// ---------------------------------------------------------------------------

export type Creative = {
  id: string;
  campaignId: string;
  placement: 'feed' | 'sidebar' | 'trend' | 'video';
  mediaUrl: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  headline: string | null;
  body: string | null;
  ctaLabel: string | null;
  destinationUrl: string | null;
  targetClubs: string[] | null;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  reviewedAt: string | null;
  impressions: number;
  clicks: number;
};

export async function getCampaign(id: string) {
  const { supabase, error } = await requireAdmin();
  if (error) return null;

  const { data } = await supabase
    .from('ad_campaigns')
    .select('*, advertisers(id, name)')
    .eq('id', id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    objective: data.objective as Campaign['objective'],
    startsAt: data.starts_at as string,
    endsAt: data.ends_at as string,
    status: data.status as Campaign['status'],
    rateCents: data.rate_cents as number,
    rateModel: data.rate_model as Campaign['rateModel'],
    frequencyCapPerDay: data.frequency_cap_per_day as number | null,
    advertiserId: (data as any).advertisers?.id as string,
    advertiserName: (data as any).advertisers?.name as string,
  };
}

export async function listCreatives(campaignId: string): Promise<Creative[]> {
  const { supabase, error } = await requireAdmin();
  if (error) return [];

  const { data } = await supabase
    .from('ad_creatives')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  const ids = (data ?? []).map((c: any) => c.id);
  const totals = new Map<string, { impressions: number; clicks: number }>();

  if (ids.length) {
    const { data: events } = await supabase
      .from('ad_events')
      .select('creative_id, kind')
      .in('creative_id', ids)
      .limit(50000);

    for (const e of (events ?? []) as any[]) {
      const entry = totals.get(e.creative_id) ?? { impressions: 0, clicks: 0 };
      if (e.kind === 'impression') entry.impressions++;
      else if (e.kind === 'click') entry.clicks++;
      totals.set(e.creative_id, entry);
    }
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    campaignId: row.campaign_id,
    placement: row.placement,
    mediaUrl: row.media_url,
    mediaWidth: row.media_width,
    mediaHeight: row.media_height,
    headline: row.headline,
    body: row.body,
    ctaLabel: row.cta_label,
    destinationUrl: row.destination_url,
    targetClubs: row.target_clubs,
    reviewStatus: row.review_status,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    impressions: totals.get(row.id)?.impressions ?? 0,
    clicks: totals.get(row.id)?.clicks ?? 0,
  }));
}

export async function createCreative(input: {
  campaignId: string;
  placement: Creative['placement'];
  mediaUrl?: string;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  headline?: string;
  body?: string;
  ctaLabel?: string;
  destinationUrl?: string;
  targetClubs?: string[];
}): Promise<{ id: string } | { error: string }> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };

  if (!input.headline?.trim() && !input.mediaUrl?.trim()) {
    return { error: 'A creative needs a headline or an image.' };
  }
  if (input.destinationUrl && !/^https?:\/\//i.test(input.destinationUrl.trim())) {
    return { error: 'The destination has to start with http:// or https://' };
  }

  const { data, error: insertError } = await supabase
    .from('ad_creatives')
    .insert({
      campaign_id: input.campaignId,
      placement: input.placement,
      media_url: input.mediaUrl?.trim() || null,
      media_width: input.mediaWidth ?? null,
      media_height: input.mediaHeight ?? null,
      headline: input.headline?.trim() || null,
      body: input.body?.trim() || null,
      cta_label: input.ctaLabel?.trim() || null,
      destination_url: input.destinationUrl?.trim() || null,
      target_clubs: input.targetClubs?.length ? input.targetClubs : null,
    })
    .select('id')
    .single();

  if (insertError || !data) {
    // Naming the database's own complaint rather than swallowing it: a missing
    // column from an unapplied migration read as "cannot add that creative",
    // which is indistinguishable from a validation problem.
    console.error('Could not create creative:', insertError);
    return { error: `Could not save that creative — ${insertError?.message ?? 'no row returned'}` };
  }

  revalidatePath(`/admin/campaigns/${input.campaignId}`);
  return { id: data.id };
}

/** Approve or reject, recording who decided and when. */
export async function reviewCreative(
  id: string,
  decision: 'approved' | 'rejected',
  note?: string
): Promise<{ ok: true } | { error: string }> {
  const { supabase, user, error } = await requireAdmin();
  if (error) return { error };

  if (decision === 'rejected' && !note?.trim()) {
    return { error: 'Say why it was rejected — the advertiser needs to know what to change.' };
  }

  const { error: updateError } = await supabase
    .from('ad_creatives')
    .update({
      review_status: decision,
      review_note: note?.trim() || null,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('Could not review creative:', updateError);
    return { error: 'Could not record that decision.' };
  }

  revalidatePath('/admin');
  return { ok: true };
}

export async function deleteCreative(id: string): Promise<{ ok: true } | { error: string }> {
  const { supabase, error } = await requireAdmin();
  if (error) return { error };

  const { error: deleteError } = await supabase.from('ad_creatives').delete().eq('id', id);
  if (deleteError) return { error: 'Could not delete that creative.' };

  revalidatePath('/admin');
  return { ok: true };
}
