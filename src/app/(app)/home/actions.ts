
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
import { getTeamByName } from '@/lib/psl-teams';

/** How far back "recent" reaches when deciding whether a viewer's team has
 *  enough going on to lead their feed with it. A club that last got a
 *  mention three weeks ago isn't "recent" even if it's the only match. */
const TEAM_FEED_WINDOW_DAYS = 7;

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

/**
 * How many slots the "Following your team" block reserves at the top of the
 * first page, whenever the viewer's club has anything recent to show.
 *
 * Fixed, not proportional to `limit`: capping it here is what keeps the
 * block reading as a highlight reel rather than however much of the page a
 * busy week happens to fill. Uncapped, a club having a huge week could push
 * every other post off the first page again — the exact shape of the bug
 * this replaced, just re-triggered by volume instead of by the check
 * existing at all.
 */
const TEAM_HIGHLIGHT_SLOTS = 5;

/**
 * Team-first: up to TEAM_HIGHLIGHT_SLOTS posts about the viewer's favourite
 * club lead the first page, per the onboarding team picker, labelled
 * "Following your team" so the prioritisation is a visible feature rather
 * than an invisible reorder — ahead of the plain chronological feed, which
 * always fills the rest of that page too. It used to return the team feed
 * outright (no cap, no label) when one existed, so a club with a single
 * mention in the last week made every other post on the platform invisible
 * to that viewer's first page, silently and for as long as the mentions
 * kept coming. Only applies to the very first page: "run a quick check when
 * they log in" is a login-time decision, not a mode that has to be
 * maintained through infinite scroll, so a `before` cursor (pagination)
 * always continues in the plain feed regardless of how the first page
 * was decided.
 */
export async function getRecentPosts(options: { limit?: number; before?: string } = {}): Promise<PostType[]> {
  const supabase = await createClient();
  const limit = options.limit || 20;

  try {
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // The caller already holds the last post it rendered, timestamp included,
    // so the cursor comes in directly. Taking an id instead meant looking that
    // timestamp back up first — a serial round trip before every page.
    if (options.before) {
      query = query.lt('created_at', options.before);
    }

    const { data, error } = await query;
    if (error) throw error;
    const generic = (data ?? []).map(mapRow);

    if (options.before) return generic;

    const teamPosts = await getTeamFeedIfAny(supabase, TEAM_HIGHLIGHT_SLOTS);
    if (!teamPosts || teamPosts.length === 0) return generic;

    const highlighted = teamPosts.map((p) => ({ ...p, isTeamHighlight: true }));
    const teamIds = new Set(highlighted.map((p) => p.id));
    return [...highlighted, ...generic.filter((p) => !teamIds.has(p.id))].slice(0, limit);
  } catch (error) {
    console.error("Error fetching recent posts:", error);
    return [];
  }
}

/**
 * Null means "no team feed to show" — either the viewer is logged out,
 * hasn't onboarded (favourite_club empty; shouldn't happen once onboarded,
 * but this runs for every visitor, onboarded or not), or their team simply
 * has nothing recent. All three cases fall through to the same generic feed
 * in the caller, which is the actual "if not, generic content" behaviour —
 * there's no separate "team feed but it's empty" state to render.
 */
async function getTeamFeedIfAny(
  supabase: Awaited<ReturnType<typeof createClient>>,
  limit: number
): Promise<PostType[] | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('favourite_club')
    .eq('id', user.id)
    .single();

  const team = getTeamByName(profile?.favourite_club);
  if (!team) return null;

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - TEAM_FEED_WINDOW_DAYS);

  // .or() takes one comma-joined expression, not an array — each alias
  // becomes its own ilike clause. Aliases never contain a comma or a `%`
  // themselves (see psl-teams.ts), so there's nothing to escape here.
  const aliasFilter = team.aliases.map((alias) => `content.ilike.%${alias}%`).join(',');

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .gte('created_at', windowStart.toISOString())
    .or(aliasFilter)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching team feed, falling back to generic:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  return data.map(mapRow);
}

export async function getVideoPosts(options: { limit?: number; before?: string } = {}): Promise<PostType[]> {
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

    if (options.before) {
      query = query.lt('created_at', options.before);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(mapRow);
  } catch (error) {
    console.error("Error fetching video posts:", error);
    return [];
  }
}
