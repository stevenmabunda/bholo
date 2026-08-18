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
  if (!user) return false;
  const { data } = await supabase.rpc('is_admin');
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
    return { error: 'Could not save that advertiser.' };
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
