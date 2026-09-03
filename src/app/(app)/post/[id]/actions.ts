'use server';

import { createClient } from '@/lib/supabase/server';
import type { PostType } from '@/lib/data';
import { formatTimestamp } from '@/lib/utils';
import { answerPostQuestion } from '@/ai/flows/answer-post-question';

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

// The report menu item existed with no onClick behind it since it was
// built — this is the first thing that actually records one anywhere.
// No admin queue reads post_reports yet (025_reports_and_blocks.sql); that
// is real follow-up work, not silently skipped.
export async function reportPost(
  postId: string,
  reporterId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('post_reports')
      .insert({ post_id: postId, reporter_id: reporterId, reason: reason ?? null });

    if (error) {
      // unique(reporter_id, post_id) — reporting it again isn't a stronger
      // signal, and the user already got their "thanks, received" toast.
      if (error.code === '23505') return { success: true };
      throw error;
    }
    return { success: true };
  } catch (error) {
    console.error('reportPost failed:', error);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

// "Ask BHOLO AI" — answers a user's question with the post as context.
export async function askAboutPost(input: {
  postContent: string;
  postAuthor: string;
  question: string;
}): Promise<{ answer: string } | { error: string }> {
  if (!input.question?.trim()) {
    return { error: 'Please enter a question.' };
  }

  // Only signed-in users, so this can't be used as an open AI endpoint.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You need to be logged in to ask.' };

  try {
    const { answer } = await answerPostQuestion({
      postContent: input.postContent.slice(0, 2000),
      postAuthor: input.postAuthor,
      question: input.question.slice(0, 500),
    });
    return { answer };
  } catch (error) {
    console.error('askAboutPost failed:', error);
    return { error: "BHOLO AI couldn't answer that right now. Please try again." };
  }
}
