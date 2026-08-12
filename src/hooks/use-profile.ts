'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';

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
 * on the auth user object. */
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setProfile(data as Profile | null);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`profile-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => setProfile(payload.new as Profile)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { profile, loading };
}
