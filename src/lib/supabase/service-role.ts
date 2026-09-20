import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for server routes that must bypass RLS —
 * order writes for the shop checkout/webhook, where there is no signed-in
 * user (guest checkout) and the anon key is locked out by policy.
 *
 * SERVER ONLY. Never import from a client component; the service-role key
 * skips every RLS policy in the database.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase service role is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
