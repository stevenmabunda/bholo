'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { queryKeys } from '@/lib/query-keys';
import { getBookmarkedPosts } from '@/app/(app)/bookmarks/actions';
import { getNotifications } from '@/app/(app)/notifications/actions';
import { getConversations } from '@/app/(app)/messages/actions';
import { getUserProfile, getUserPosts } from '@/app/(app)/profile/actions';

// Next.js's <Link> prefetches the route's CODE on approach, but not its
// DATA — so you'd still land on a screen that then starts fetching.
// This warms the query cache for a destination as soon as the user
// shows intent (hover on desktop, touch-start on mobile), so by the
// time the navigation lands the data is usually already there.
export function usePrefetchRouteData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCallback(
    (href: string) => {
      if (!user) return;

      const prefetch = (queryKey: readonly unknown[], queryFn: () => Promise<unknown>) => {
        queryClient.prefetchQuery({ queryKey, queryFn, staleTime: 5 * 60_000 });
      };

      if (href.startsWith('/bookmarks')) {
        prefetch(queryKeys.bookmarks(user.id), () => getBookmarkedPosts(user.id));
      } else if (href.startsWith('/notifications')) {
        prefetch(queryKeys.notifications(user.id), () => getNotifications(user.id));
      } else if (href.startsWith('/messages')) {
        prefetch(queryKeys.conversations(user.id), () => getConversations(user.id));
      } else if (href.startsWith('/profile')) {
        const id = href.split('/')[2] || user.id;
        prefetch(queryKeys.profile(id), () => getUserProfile(id));
        prefetch(queryKeys.profilePosts(id, 'posts'), () => getUserPosts(id));
      }
    },
    [queryClient, user]
  );
}
