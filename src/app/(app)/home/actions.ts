
'use server';

import {
  generateTrendingHashtags,
  type GenerateTrendingHashtagsInput,
  type GenerateTrendingHashtagsOutput,
} from '@/ai/flows/generate-trending-hashtags';
import { getFixturesByDateFromApi, getLiveMatches as getLiveMatchesFromApi } from '@/services/thesportsdb-service';
import type { MatchType, PostType } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { formatTimestamp } from '@/lib/utils';

export async function getTrendingHashtags(
  input: GenerateTrendingHashtagsInput
): Promise<GenerateTrendingHashtagsOutput> {
  return await generateTrendingHashtags(input);
}

export async function getTodaysFixtures(): Promise<MatchType[]> {
  try {
    const matches = await getFixturesByDateFromApi();
    return matches;
  } catch (error) {
    console.error("Error in getTodaysFixtures server action:", error);
    return [];
  }
}

export async function getLiveMatches(): Promise<MatchType[]> {
  try {
    const matches = await getLiveMatchesFromApi();
    return matches;
  } catch (error) {
    console.error("Error in getLiveMatches server action:", error);
    return [];
  }
}

function mapRow(row: any): PostType {
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
    location: row.location,
    timestamp: createdAt ? formatTimestamp(createdAt) : 'now',
    createdAt: createdAt ? createdAt.toISOString() : undefined,
  } as PostType;
}

export async function getFollowingPosts(userId: string): Promise<PostType[]> {
  const supabase = await createClient();

  try {
    const { data: following } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', userId);

    const authorIds = (following ?? []).map(f => f.followed_id);
    if (!authorIds.includes(userId)) authorIds.push(userId);

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .in('author_id', authorIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data ?? []).map(mapRow);
  } catch (error) {
    console.error("Error fetching following posts:", error);
    return [];
  }
}

export async function getRecentPosts(options: { limit?: number; lastPostId?: string } = {}): Promise<PostType[]> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(options.limit || 20);

    if (options.lastPostId) {
      const { data: lastPost } = await supabase.from('posts').select('created_at').eq('id', options.lastPostId).single();
      if (lastPost) {
        query = query.lt('created_at', lastPost.created_at);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(mapRow);
  } catch (error) {
    console.error("Error fetching recent posts:", error);
    return [];
  }
}

export async function getVideoPosts(options: { limit?: number; lastPostId?: string } = {}): Promise<PostType[]> {
  const supabase = await createClient();

  try {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Postgres does the filtering. This used to select every post from the
    // last fortnight and sift for videos in JS, so the whole window crossed
    // the wire to return a handful of rows — and with no limit, that cost
    // grew with the feed rather than staying flat.
    let query = supabase
      .from('posts')
      .select('*')
      .gte('created_at', twoWeeksAgo.toISOString())
      // Must be a JSON *string*. Handed an array, postgrest-js builds a
      // Postgres array literal instead, the filter becomes
      // `media=cs.{[object Object]}`, and it silently matches nothing.
      .contains('media', JSON.stringify([{ type: 'video' }]))
      .order('created_at', { ascending: false })
      .limit(options.limit || 20);

    if (options.lastPostId) {
      const { data: lastPost } = await supabase.from('posts').select('created_at').eq('id', options.lastPostId).single();
      if (lastPost) {
        query = query.lt('created_at', lastPost.created_at);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(mapRow);
  } catch (error) {
    console.error("Error fetching video posts:", error);
    return [];
  }
}
