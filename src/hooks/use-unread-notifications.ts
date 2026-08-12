'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';

/** Live unread-notification count for the signed-in user. One subscription,
 * shared by every call site (sidebar nav badge, home page badge, etc.) —
 * replaces two near-duplicate onSnapshot listeners from the Firebase version. */
export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    let cancelled = false;

    const fetchCount = async () => {
      const { count: unread } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (!cancelled) setCount(unread ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`unread-notifications-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
