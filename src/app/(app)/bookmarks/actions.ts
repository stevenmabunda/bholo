'use server';

import { createClient } from '@/lib/supabase/server';
import type { PostType } from '@/lib/data';
import { formatTimestamp } from '@/lib/utils';

export async function getBookmarkedPosts(userId: string): Promise<PostType[]> {
  if (!userId) return [];
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('created_at, posts(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data ?? [])
      .filter((row: any) => row.posts)
      .map((row: any) => {
        const post = row.posts;
        const createdAt = post.created_at ? new Date(post.created_at) : undefined;
        return {
          id: post.id,
          authorId: post.author_id,
          authorName: post.author_name,
          authorHandle: post.author_handle,
          authorAvatar: post.author_avatar,
          content: post.content,
          comments: post.comments_count,
          reposts: post.reposts_count,
          likes: post.likes_count,
          media: post.media,
          poll: post.poll,
          timestamp: createdAt ? formatTimestamp(createdAt) : 'now',
        } as PostType;
      });
  } catch (error) {
    console.error("Error fetching bookmarked posts:", error);
    return [];
  }
}
