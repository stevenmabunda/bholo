'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { PostType } from '@/lib/data';

/**
 * Update a post's copy/media on behalf of its author or an admin.
 *
 * This deliberately goes through the service-role client after checking the
 * caller here. RLS alone made an unauthorised UPDATE a silent no-op: PostgREST
 * matched zero rows, returned no error, and the client optimistic update made
 * the edit look saved until the next reload. The policy that allows admins to
 * update other people's posts also requires a hand-run migration; this keeps
 * moderation working whether or not that policy has been applied.
 *
 * Only content and media can change. `author_id` is never taken from the
 * caller, so this cannot be used to reassign a post.
 */
export async function updatePostAsModerator(input: {
  postId: string;
  text: string;
  media?: PostType['media'];
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('You need to be signed in to edit a post.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('Could not verify your account.');
  }

  // Production has the service-role key. Local/preview may not, in which
  // case fall back to the caller's own session and surface an RLS no-op as a
  // real error instead of a fake success.
  let db: typeof supabase | ReturnType<typeof createServiceRoleClient> = supabase;
  try {
    db = createServiceRoleClient();
  } catch {
    // Keep the caller's session; RLS still applies.
  }

  const { data: post, error: postError } = await db
    .from('posts')
    .select('author_id')
    .eq('id', input.postId)
    .maybeSingle();

  if (postError) {
    throw postError;
  }
  if (!post) {
    throw new Error('That post no longer exists.');
  }

  const isAdmin = profile.role === 'admin';
  if (!isAdmin && post.author_id !== user.id) {
    throw new Error('You can only edit your own posts.');
  }

  const patch: { content: string; media?: PostType['media'] } = {
    content: input.text,
  };
  if (input.media !== undefined) {
    patch.media = input.media;
  }

  const { data: updated, error: updateError } = await db
    .from('posts')
    .update(patch)
    .eq('id', input.postId)
    .select('id');

  if (updateError) {
    throw updateError;
  }
  if (!updated || updated.length === 0) {
    throw new Error('The post was not updated — it may have been deleted.');
  }
}
