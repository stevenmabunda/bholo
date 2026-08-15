'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { getBookmarkedPosts } from './actions';
import { Post } from '@/components/post';
import { PostSkeleton } from '@/components/post-skeleton';
import { queryKeys } from '@/lib/query-keys';

export function BookmarksView() {
    const { user } = useAuth();

    // On first load this resolves synchronously from the cache the
    // server dehydrated into the page, so there's no fetch and no
    // skeleton. On later visits it renders from the client cache and
    // revalidates in the background.
    const { data: bookmarkedPosts = [], isLoading } = useQuery({
        queryKey: queryKeys.bookmarks(user?.id ?? 'anon'),
        queryFn: () => getBookmarkedPosts(user!.id),
        enabled: !!user,
    });

    const loading = !!user && isLoading;

  return (
      <div className="flex h-full min-h-screen flex-col">
          <header className="sticky top-0 z-10 border-b bg-background/80 p-4 backdrop-blur-sm">
              <h1 className="text-xl font-bold">Bookmarks</h1>
          </header>
          <main className="flex-1">
              {loading ? (
                  <div className="divide-y divide-border">
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                  </div>
              ) : bookmarkedPosts.length > 0 ? (
                  <div className="divide-y divide-border">
                      {bookmarkedPosts.map((post) => (
                          <Post key={post.id} {...post} />
                      ))}
                  </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                    <h2 className="text-xl font-bold">No bookmarks yet</h2>
                    <p>When you bookmark posts, they'll appear here.</p>
                </div>
              )}
          </main>
      </div>
  );
}
