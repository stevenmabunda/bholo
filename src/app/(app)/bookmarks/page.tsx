'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getBookmarkedPosts } from './actions';
import type { PostType } from '@/lib/data';
import { Post } from '@/components/post';
import { PostSkeleton } from '@/components/post-skeleton';

export default function BookmarksPage() {
    const { user } = useAuth();
    const [bookmarkedPosts, setBookmarkedPosts] = useState<PostType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setLoading(true);
            getBookmarkedPosts(user.id)
                .then(setBookmarkedPosts)
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [user]);

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
