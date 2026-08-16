
'use server';

import { createClient } from '@/lib/supabase/server';
import type { PostType } from '@/lib/data';
import { formatTimestamp } from '@/lib/utils';

export async function getMostViewedPosts(): Promise<PostType[]> {
  const supabase = await createClient();

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Postgres filters and ranks. This used to pull every post from the last
    // 24 hours and sift for images in JS — the same shape as the trending bug,
    // where PostgREST's silent 1000-row cap meant "most viewed" would have
    // been ranked from whichever 1000 rows came back first. Past 1000 posts a
    // day it would have quietly ranked the wrong set, with no error.
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .gte('created_at', twentyFourHoursAgo.toISOString())
      // JSON string, not an array — see getVideoPosts.
      .contains('media', JSON.stringify([{ type: 'image' }]))
      .order('views_count', { ascending: false })
      .limit(25);

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
      });

    if (imagePosts.length === 0) return [];

    // Already filtered, ranked and capped by the query above.
    const topPosts = imagePosts;

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
