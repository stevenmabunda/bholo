'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { ReplyMedia } from '@/components/create-comment';

export type CommentRow = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  media: ReplyMedia[];
  likes: number;
  reposts: number;
  comments: number;
  /** The comment this answers, or null when it answers the post itself. */
  parentCommentId: string | null;
  createdAt: string;
};

function mapRow(row: any): CommentRow {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorHandle: row.author_handle,
    authorAvatar: row.author_avatar,
    content: row.content,
    media: row.media ?? [],
    likes: row.likes_count,
    reposts: row.reposts_count,
    comments: row.replies_count,
    parentCommentId: row.parent_comment_id ?? null,
    createdAt: row.created_at,
  };
}

/** Live comments for a single post — one subscription per post, shared by
 * every place that renders a comment list (video sheet, post detail, image
 * viewer), replacing three near-identical onSnapshot implementations. */
export function useLiveComments(postId: string | null | undefined) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      // A post that actually takes off can pass a thousand replies.
      .limit(200)
      .then(({ data }) => {
        if (!cancelled) {
          setComments((data ?? []).map(mapRow));
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`comments-${postId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => setComments(prev => [mapRow(payload.new), ...prev])
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => setComments(prev => prev.filter(c => c.id !== (payload.old as any).id))
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [postId]);

  return { comments, loading };
}
