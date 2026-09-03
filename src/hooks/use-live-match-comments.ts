'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export type MatchCommentRow = {
  id: string;
  fixtureId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
};

function mapRow(row: any): MatchCommentRow {
  return {
    id: row.id,
    fixtureId: row.fixture_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorHandle: row.author_handle,
    authorAvatar: row.author_avatar,
    content: row.content,
    createdAt: row.created_at,
  };
}

/** Live chat for one fixture — same shape as useLiveComments (comments,
 * post-context.tsx), one subscription per thread, oldest first since this
 * reads top-to-bottom like a chat rather than newest-first like a feed. */
export function useLiveMatchComments(fixtureId: string | null | undefined) {
  const [comments, setComments] = useState<MatchCommentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fixtureId) {
      setComments([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    supabase
      .from('match_comments')
      .select('*')
      .eq('fixture_id', fixtureId)
      .order('created_at', { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (!cancelled) {
          setComments((data ?? []).map(mapRow));
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`match-comments-${fixtureId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_comments', filter: `fixture_id=eq.${fixtureId}` },
        (payload) => setComments(prev => [...prev, mapRow(payload.new)])
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'match_comments', filter: `fixture_id=eq.${fixtureId}` },
        (payload) => setComments(prev => prev.filter(c => c.id !== (payload.old as any).id))
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [fixtureId]);

  return { comments, loading };
}

/** A direct insert, not a server action — RLS (match_comments_insert_own)
 * is what actually enforces who this can be posted as, same as addComment
 * in post-context.tsx. The realtime INSERT event above is what puts it on
 * screen; this doesn't touch local state itself. */
export async function sendMatchComment(params: {
  fixtureId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const content = params.content.trim();
  if (!content) return { success: false, error: 'Say something first.' };
  if (content.length > 500) return { success: false, error: 'Keep it under 500 characters.' };

  const { error } = await supabase.from('match_comments').insert({
    fixture_id: params.fixtureId,
    author_id: params.authorId,
    author_name: params.authorName,
    author_handle: params.authorHandle,
    author_avatar: params.authorAvatar,
    content,
  });

  if (error) {
    console.error('sendMatchComment failed:', error);
    return { success: false, error: 'Could not send that. Please try again.' };
  }
  return { success: true };
}
