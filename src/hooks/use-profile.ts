'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';

export type Profile = {
  id: string;
  display_name: string;
  handle: string;
  email: string | null;
  photo_url: string | null;
  banner_url: string | null;
  bio: string | null;
  location: string | null;
  country: string | null;
  favourite_club: string | null;
  followers_count: number;
  following_count: number;
};

/** The signed-in user's own profile row — the source of truth for their
 * display name/handle/avatar now that this data lives in Postgres, not
 * on the auth user object.
 *
 * Backed by the query cache because this is called from the sidebar, the
 * home header, the composer and every comment box at once. As a bare
 * useEffect it issued one identical request per call site — a dozen on a
 * single feed render — and opened a realtime channel for each. The one
 * subscription that keeps this fresh now lives in PostProvider. */
export function useProfile() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.myProfile(user?.id ?? 'anonymous'),
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      return (data as Profile | null) ?? null;
    },
    enabled: !!user,
  });

  return { profile: user ? data ?? null : null, loading: !!user && isLoading };
}
