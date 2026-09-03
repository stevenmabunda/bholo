
'use server';

import { createClient } from '@/lib/supabase/server';
import type { Socials } from '@/lib/socials';
import type { PostType } from '@/lib/data';
import { formatTimestamp } from '@/lib/utils';

export type ProfileData = {
  uid: string;
  displayName: string;
  handle: string;
  photoURL: string;
  bannerUrl: string;
  bannerPosition?: number;
  bio: string;
  location: string;
  country: string;
  favouriteClub: string;
  joined: string;
  followersCount: number;
  followingCount: number;
  socials?: Socials;
};

function mapPostRow(row: any): PostType {
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
    media: row.media,
    poll: row.poll,
    timestamp: createdAt ? formatTimestamp(createdAt) : 'now',
    createdAt: createdAt ? createdAt.toISOString() : undefined,
  } as PostType & { createdAt?: string };
}

export async function getUserProfile(
  profileId: string
): Promise<ProfileData | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).single();

  if (error || !data) return null;

  return {
    uid: data.id,
    displayName: data.display_name || 'User',
    photoURL: data.photo_url || 'https://placehold.co/128x128.png',
    handle: data.handle || 'user',
    joined: data.created_at
      ? new Date(data.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'recently',
    bio: data.bio || '',
    location: data.location || '',
    country: data.country || '',
    favouriteClub: data.favourite_club || '',
    bannerUrl: data.banner_url || 'https://placehold.co/1200x400.png',
    bannerPosition: data.banner_position ?? 50,
    followersCount: data.followers_count || 0,
    followingCount: data.following_count || 0,
    socials: (data.socials ?? {}) as Socials,
  };
}

export async function getUserPosts(userId: string): Promise<PostType[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return [];
    return (data ?? []).map(mapPostRow);
}

export async function getIsFollowing(
  currentUserId: string,
  profileId: string
): Promise<boolean> {
  if (!currentUserId || !profileId || currentUserId === profileId) return false;
  const supabase = await createClient();

  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', currentUserId)
    .eq('followed_id', profileId)
    .maybeSingle();

  return !!data;
}

export async function toggleFollow(
  currentUserId: string,
  profileId: string,
  isCurrentlyFollowing: boolean
): Promise<{ success: boolean }> {
  if (currentUserId === profileId) return { success: false };
  const supabase = await createClient();

  try {
    // follower_count/following_count and the follow notification are both
    // handled by triggers on this table — this insert/delete is the whole action.
    const { error } = isCurrentlyFollowing
      ? await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('followed_id', profileId)
      : await supabase.from('follows').insert({ follower_id: currentUserId, followed_id: profileId });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Toggle follow failed: ', error);
    return { success: false };
  }
}

export async function getIsBlocked(
  currentUserId: string,
  profileId: string
): Promise<boolean> {
  if (!currentUserId || !profileId || currentUserId === profileId) return false;
  const supabase = await createClient();

  const { data } = await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocker_id', currentUserId)
    .eq('blocked_id', profileId)
    .maybeSingle();

  return !!data;
}

/** Runs as block_user() (025_reports_and_blocks.sql) rather than a plain
 *  insert — it also has to remove any follow between the two people in
 *  either direction, and deleting the OTHER person's follow row needs to
 *  bypass RLS, which only a SECURITY DEFINER function can do from here. */
export async function blockUser(blockedId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc('block_user', { p_blocked_id: blockedId });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('blockUser failed:', error);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function unblockUser(
  currentUserId: string,
  blockedId: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', blockedId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('unblockUser failed:', error);
    return { success: false };
  }
}

export async function getLikedPosts(userId: string): Promise<PostType[]> {
  if (!userId) return [];
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('likes')
      .select('created_at, posts(*)')
      .eq('user_id', userId)
      .not('post_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data ?? [])
      .filter((row: any) => row.posts)
      .map((row: any) => mapPostRow(row.posts));
  } catch (error) {
    console.error("Error fetching liked posts:", error);
    return [];
  }
}

export async function getMediaPosts(userId?: string): Promise<PostType[]> {
  const supabase = await createClient();

  try {
    let query = supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('author_id', userId);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? [])
      .map(mapPostRow)
      .filter(post => post.media && post.media.length > 0);
  } catch (error) {
    console.error("Error fetching media posts:", error);
    return [];
  }
}

// Kept for parity with the old Firestore backfill utility — with author
// fields still denormalized onto posts/comments, a display-name change
// still requires this kind of explicit backfill, same limitation as before.
export async function updateUserPosts(userId: string): Promise<{ success: boolean, updatedCount: number, error?: string }> {
  if (!userId) return { success: false, updatedCount: 0, error: 'User not specified.' };
  const supabase = await createClient();

  try {
    const { data: profile } = await supabase.from('profiles').select('display_name, photo_url').eq('id', userId).single();
    if (!profile) return { success: false, updatedCount: 0, error: 'User profile not found.' };

    const { data: updated, error } = await supabase
      .from('posts')
      .update({ author_name: profile.display_name, author_avatar: profile.photo_url })
      .eq('author_id', userId)
      .select('id');

    if (error) throw error;
    return { success: true, updatedCount: updated?.length ?? 0 };
  } catch (error) {
    console.error("Error updating user's posts:", error);
    return { success: false, updatedCount: 0, error: 'An unexpected error occurred.' };
  }
}

async function getFollowList(
  profileId: string,
  type: 'followers' | 'following'
): Promise<ProfileData[]> {
  const supabase = await createClient();

  // A popular account passes 1000 followers eventually; without an order and
  // a bound, PostgREST would cap this at an arbitrary 1000 of them.
  const { data, error } = type === 'followers'
    ? await supabase.from('follows').select('profiles!follows_follower_id_fkey(*)')
        .eq('followed_id', profileId).order('created_at', { ascending: false }).limit(200)
    : await supabase.from('follows').select('profiles!follows_followed_id_fkey(*)')
        .eq('follower_id', profileId).order('created_at', { ascending: false }).limit(200);

  if (error || !data) return [];

  return data
    .map((row: any) => row.profiles)
    .filter((p: any): p is any => !!p)
    .map((p: any) => ({
      uid: p.id,
      displayName: p.display_name || 'User',
      handle: p.handle || 'user',
      photoURL: p.photo_url || 'https://placehold.co/40x40.png',
      bannerUrl: p.banner_url || '',
      bio: p.bio || '',
      country: p.country || '',
      favouriteClub: p.favourite_club || '',
      joined: '',
      followersCount: p.followers_count || 0,
      followingCount: p.following_count || 0,
      location: p.location || '',
    } as ProfileData));
}

export async function getFollowers(profileId: string): Promise<ProfileData[]> {
  return getFollowList(profileId, 'followers');
}

export async function getFollowing(profileId: string): Promise<ProfileData[]> {
  return getFollowList(profileId, 'following');
}

export async function getUsersToFollow(currentUserId: string): Promise<ProfileData[]> {
    if (!currentUserId) return [];
    const supabase = await createClient();

    try {
        const { data: following } = await supabase.from('follows').select('followed_id').eq('follower_id', currentUserId);
        const followingIds = new Set((following ?? []).map(f => f.followed_id));
        followingIds.add(currentUserId);

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('followers_count', { ascending: false })
          .limit(20);
        if (error) throw error;

        const usersToSuggest = (data ?? [])
          .filter(p => !followingIds.has(p.id))
          .map(p => ({
              uid: p.id,
              displayName: p.display_name || 'User',
              handle: p.handle || 'user',
              photoURL: p.photo_url || 'https://placehold.co/40x40.png',
              bannerUrl: '', bio: '', country: '', favouriteClub: '', joined: '', followersCount: 0, followingCount: 0, location: '', bannerPosition: 50, socials: {},
          } as ProfileData));

        return usersToSuggest.slice(0, 3);
    } catch (error) {
        console.error("Error getting users to follow:", error);
        return [];
    }
}
