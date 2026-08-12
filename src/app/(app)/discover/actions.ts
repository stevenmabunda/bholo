
'use server';

import { createClient } from '@/lib/supabase/server';
import type { PostType } from '@/lib/data';
import { formatTimestamp } from '@/lib/utils';

export async function getMostViewedPosts(): Promise<PostType[]> {
  const supabase = await createClient();

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (error) throw error;

    let imagePosts = (data ?? [])
      .map(row => {
        const createdAt = row.created_at ? new Date(row.created_at) : undefined;
        return {
            id: row.id,
            authorId: row.author_id,
            authorName: row.author_name,
            authorHandle: row.author_handle,
            authorAvatar: row.author_avatar,
            content: row.content,
            comments: row.comments_count,
            reposts: row.reposts_count,
            likes: row.likes_count,
            views: row.views_count,
            media: row.media,
            poll: row.poll,
            timestamp: createdAt ? formatTimestamp(createdAt) : 'now',
        } as PostType;
      })
      .filter(p => p.media && p.media.length > 0 && p.media.some(m => m.type === 'image'));

    if (imagePosts.length === 0) return [];

    imagePosts.sort((a, b) => (b.views || 0) - (a.views || 0));
    const topPosts = imagePosts.slice(0, 25);
    if (topPosts.length === 0) return [];

    const heroCandidates = topPosts.slice(0, 5);
    if (heroCandidates.length === 0) return topPosts;

    const heroIndex = Math.floor(Math.random() * heroCandidates.length);
    const heroPost = heroCandidates[heroIndex];
    const remainingPosts = topPosts.filter(p => p.id !== heroPost.id);

    return [heroPost, ...remainingPosts];
  } catch (error) {
    console.error("Error fetching most viewed posts:", error);
    return [];
  }
}
