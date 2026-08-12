
'use server';

import { createClient } from '@/lib/supabase/server';
import type { PostType } from '@/lib/data';
import type { ProfileData } from '@/app/(app)/profile/actions';
import { formatTimestamp } from '@/lib/utils';

export type SearchResults = {
  users: ProfileData[];
  posts: PostType[];
};

export async function searchEverything(searchText: string): Promise<SearchResults> {
  if (!searchText) {
    return { users: [], posts: [] };
  }
  const supabase = await createClient();
  const pattern = `%${searchText}%`;

  try {
    const [usersRes, postsRes] = await Promise.all([
      supabase.from('profiles').select('*').or(`display_name.ilike.${pattern},handle.ilike.${pattern}`).limit(10),
      supabase.from('posts').select('*').ilike('content', pattern).order('created_at', { ascending: false }).limit(20),
    ]);

    const users = (usersRes.data ?? []).map(p => ({
        uid: p.id,
        displayName: p.display_name || 'User',
        handle: p.handle || 'user',
        photoURL: p.photo_url || 'https://placehold.co/128x128.png',
        bio: p.bio || '',
        followersCount: p.followers_count || 0,
        followingCount: p.following_count || 0,
        bannerUrl: p.banner_url || 'https://placehold.co/1200x400.png',
        location: p.location || '',
        country: p.country || '',
        favouriteClub: p.favourite_club || '',
        joined: p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
    } as ProfileData));

    const posts = (postsRes.data ?? []).map(row => {
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
        } as PostType;
    });

    return { users, posts };
  } catch (error) {
    console.error("Error during search:", error);
    return { users: [], posts: [] };
  }
}
