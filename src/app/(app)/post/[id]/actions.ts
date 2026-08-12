'use server';

import { createClient } from '@/lib/supabase/server';
import type { PostType } from '@/lib/data';
import { formatTimestamp } from '@/lib/utils';

export async function getPost(postId: string): Promise<PostType | null> {
    if (!postId) return null;
    const supabase = await createClient();

    const { data, error } = await supabase.from('posts').select('*').eq('id', postId).single();
    if (error || !data) return null;

    const createdAt = data.created_at ? new Date(data.created_at) : undefined;
    return {
        id: data.id,
        authorId: data.author_id,
        authorName: data.author_name,
        authorHandle: data.author_handle,
        authorAvatar: data.author_avatar,
        content: data.content,
        comments: data.comments_count,
        reposts: data.reposts_count,
        likes: data.likes_count,
        views: data.views_count,
        media: data.media,
        poll: data.poll,
        timestamp: createdAt ? formatTimestamp(createdAt) : 'now',
        createdAt: createdAt ? createdAt.toISOString() : undefined,
    };
}
