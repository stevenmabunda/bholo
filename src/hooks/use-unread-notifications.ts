'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { queryKeys } from '@/lib/query-keys';

/** Live unread-notification count for the signed-in user.
 *
 * Genuinely shared now: the cache key dedupes the count query across the
 * sidebar badge and the home header badge, and the single subscription that
 * refreshes it lives in PostProvider. Previously each call site ran its own
 * count and opened its own channel. */
export function useUnreadNotificationCount() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: queryKeys.unreadNotificationCount(user?.id ?? 'anonymous'),
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('read', false);
      return count ?? 0;
    },
    enabled: !!user,
  });

  return user ? data ?? 0 : 0;
}
