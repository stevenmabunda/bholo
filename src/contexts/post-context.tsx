
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PostType } from '@/lib/data';
import type { Media } from '@/components/create-post';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/lib/supabase/client';
import { formatTimestamp } from '@/lib/utils';
import { queryKeys } from '@/lib/query-keys';
import type { ReplyMedia } from '@/components/create-comment';
import { getRecentPosts } from '@/app/(app)/home/actions';
import { usePathname } from 'next/navigation';

/**
 * A post is created in two steps — the row is inserted, then updated once its
 * media finishes uploading — so a row arriving over realtime may not have its
 * media yet. These bound how hard we chase it.
 */
const MEDIA_RECONCILE_ATTEMPTS = 3;
const MEDIA_RECONCILE_DELAY_MS = 1500;

/** How many unseen posts to hold for the "new posts" banner. */
const NEW_POSTS_BUFFER_LIMIT = 50;

type PostContextType = {
  forYouPosts: PostType[];
  newForYouPosts: PostType[];
  loadingForYou: boolean;
  showNewForYouPosts: () => void;
  addPost: (data: { text: string; media: Media[], poll?: PostType['poll'], location?: string | null, scheduledFor?: string | null }) => Promise<PostType | null>;
  editPost: (postId: string, data: { text:string }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  addVote: (postId: string, choiceIndex: number) => Promise<void>;
  addComment: (postId: string, data: { text: string; media: ReplyMedia[] }) => Promise<boolean | null>;
  likePost: (postId: string, currentlyLiked: boolean) => Promise<void>;
  likeComment: (postId: string, commentId: string, isUnlike: boolean) => Promise<void>;
  repostComment: (commentId: string, isReposted: boolean) => Promise<void>;
  repostPost: (postId: string, isReposted: boolean) => Promise<void>;
  bookmarkPost: (postId: string, isBookmarked: boolean) => Promise<void>;
  bookmarkedPostIds: Set<string>;
  likedPostIds: Set<string>;
  fetchForYouPosts: (options?: { limit?: number; before?: string }) => Promise<PostType[]>;
};

const PostContext = createContext<PostContextType | undefined>(undefined);

const commonStopWords = new Set(['i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now']);

function extractKeywords(text: string): string[] {
  if (!text) return [];

  const topics = new Set<string>();
  const phraseWords = new Set<string>();

  const capitalizedPhrases = text.match(/\b([A-Z][a-z']*\s*){2,}/g) || [];
  capitalizedPhrases.forEach(phrase => {
    const trimmedPhrase = phrase.trim().toLowerCase();
    topics.add(trimmedPhrase);
    trimmedPhrase.split(/\s+/).forEach(word => phraseWords.add(word));
  });

  const allWords = text.replace(/[.,!?:;()"']/g, '').split(/\s+/);
  allWords.forEach(word => {
    if (word.startsWith('#')) {
      topics.add(word.substring(1).toLowerCase());
      return;
    }

    const lowerWord = word.toLowerCase();

    if (!commonStopWords.has(lowerWord) && lowerWord.length > 2 && !phraseWords.has(lowerWord)) {
      topics.add(lowerWord);
    }
  });

  return Array.from(topics);
}

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Grabs a still frame from a video so it has something to show as a poster and,
 * more importantly, so a shared link has a thumbnail — WhatsApp, Facebook and X
 * cannot render an mp4, so a video post without one previews as bare text.
 *
 * Never rejects: a codec the browser can't decode should cost the post its
 * thumbnail, not the upload. Callers get null and carry on.
 */
const captureVideoPoster = (file: File): Promise<{ blob: Blob | null; width: number; height: number }> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      // The intrinsic size comes free with the decode, and the feed needs it to
      // reserve the right shape instead of assuming 16:9 for every clip.
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      resolve({ blob, width, height });
    };

    // A stuck decode must not hold the upload open indefinitely.
    const timeout = setTimeout(() => finish(null), 10000);

    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    video.onloadeddata = () => {
      // The very first frame is often black while the encoder settles, so take
      // one slightly in — but never past the end of a very short clip.
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };

    video.onseeked = () => {
      try {
        // Cap the long edge: a 4K frame makes a multi-megabyte JPEG, and
        // crawlers skip images that are slow or too large to fetch.
        const maxEdge = 1280;
        const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);

        const ctx = canvas.getContext('2d');
        if (!ctx || !canvas.width || !canvas.height) return finish(null);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => { clearTimeout(timeout); finish(blob); },
          'image/jpeg',
          0.8
        );
      } catch {
        clearTimeout(timeout);
        finish(null);
      }
    };

    video.onerror = () => { clearTimeout(timeout); finish(null); };
    video.src = objectUrl;
  });
};

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

export function PostProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [newForYouPosts, setNewForYouPosts] = useState<PostType[]>([]);

  const { user } = useAuth();
  const { profile } = useProfile();
  const onFeed = usePathname() === '/home';

  // The feed lives in the query cache, so navigating away and back
  // renders instantly from cache instead of refetching behind a
  // skeleton. Pagination appends into this same cache entry.
  const { data: forYouPosts = [], isLoading: loadingForYou } = useQuery({
    queryKey: queryKeys.feed(),
    queryFn: () => getRecentPosts({ limit: 20 }),
    staleTime: 60_000,
  });

  // Helper so mutations can edit the cached feed the same way they used
  // to edit local state.
  const updateFeed = useCallback(
    (updater: (posts: PostType[]) => PostType[]) => {
      queryClient.setQueryData<PostType[]>(queryKeys.feed(), (prev) => updater(prev ?? []));
    },
    [queryClient]
  );

  const fetchForYouPosts = useCallback(
    async (options: { limit?: number; before?: string } = {}) => {
      try {
        const posts = await getRecentPosts(options);
        if (options.before) {
          // Pagination: append into the cached feed.
          updateFeed((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            return [...prev, ...posts.filter((p) => !existingIds.has(p.id))];
          });
        } else {
          queryClient.setQueryData(queryKeys.feed(), posts);
        }
        return posts;
      } catch (error) {
        console.error("Failed to fetch 'For You' posts:", error);
        return [];
      }
    },
    [queryClient, updateFeed]
  );

  /**
   * Re-read media for posts that reached us before their upload finished.
   *
   * addPost inserts with media: [] and updates the row once the files are in
   * storage, but the banner listens for INSERT — so every buffered row is the
   * pre-upload version. Splicing those in showed a photo post as text only,
   * and nothing short of a reload fixed it, because nothing else ever re-read
   * the row.
   *
   * Subscribing to UPDATE would be the tidier fix and is the wrong one: the
   * likes trigger updates posts on every like, so it would push a row to every
   * client on the feed each time anyone anywhere liked anything.
   *
   * Retries because a large video can still be uploading when the banner is
   * clicked. Each pass drops the ids that have resolved; text posts simply
   * never resolve and cost three small reads.
   */
  const reconcileMedia = useCallback(async (ids: string[], attempt = 0): Promise<void> => {
    if (ids.length === 0) return;

    const { data, error } = await supabase.from('posts').select('id, media').in('id', ids);
    if (error || !data) return;

    const resolved = new Map(
      data.filter((row: any) => Array.isArray(row.media) && row.media.length > 0)
          .map((row: any) => [row.id as string, row.media])
    );

    if (resolved.size > 0) {
      // Media only. The cached post carries optimistic like and bookmark state
      // that the database does not know about yet, and replacing the row
      // wholesale would flick those back.
      updateFeed((prev) => prev.map((p) => (resolved.has(p.id) ? { ...p, media: resolved.get(p.id) } : p)));
    }

    const stillEmpty = ids.filter((id) => !resolved.has(id));
    if (stillEmpty.length > 0 && attempt + 1 < MEDIA_RECONCILE_ATTEMPTS) {
      setTimeout(() => { void reconcileMedia(stillEmpty, attempt + 1); }, MEDIA_RECONCILE_DELAY_MS * (attempt + 1));
    }
  }, [updateFeed]);

  const showNewForYouPosts = () => {
    updateFeed((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const uniqueNewPosts = newForYouPosts.filter((p) => !existingIds.has(p.id));
      return [...uniqueNewPosts, ...prev];
    });

    const missingMedia = newForYouPosts
      .filter((p) => !Array.isArray(p.media) || p.media.length === 0)
      .map((p) => p.id);
    void reconcileMedia(missingMedia);

    setNewForYouPosts([]);
  };

  // Per-user interaction sets (bookmarks/likes), cached and kept live.
  const { data: interactions } = useQuery({
    queryKey: queryKeys.interactions(user?.id ?? 'anon'),
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user) return { bookmarked: [] as string[], liked: [] as string[] };
      const [{ data: bookmarks }, { data: likes }] = await Promise.all([
        // Explicit and newest-first, so the bound is a defined "most recent
        // 1000" rather than an arbitrary slice from PostgREST's cap. A user
        // past that would stop seeing their oldest likes reflected in the
        // feed; the real fix then is looking up state for the posts on
        // screen instead of the whole history.
        supabase.from('bookmarks').select('post_id').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(1000),
        supabase.from('likes').select('post_id').eq('user_id', user.id)
          .not('post_id', 'is', null).order('created_at', { ascending: false }).limit(1000),
      ]);
      return {
        bookmarked: (bookmarks ?? []).map((b) => b.post_id as string),
        liked: (likes ?? []).map((l) => l.post_id as string),
      };
    },
  });

  const bookmarkedPostIds = new Set(interactions?.bookmarked ?? []);
  const likedPostIds = new Set(interactions?.liked ?? []);

  // Live bookmark/like IDs for the current user — realtime now feeds the
  // query cache rather than separate component state, so there's one
  // source of truth.
  useEffect(() => {
    if (!user) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.interactions(user.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks(user.id) });
    };

    // Everything that watches the signed-in user's own rows rides on this one
    // channel. useProfile and useUnreadNotificationCount used to open their
    // own per call site, so a feed render left a handful of duplicate
    // subscriptions open for data the cache already had.
    const channel = supabase
      .channel(`user-interactions-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${user.id}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `user_id=eq.${user.id}` }, invalidate)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        // payload.new is the raw row, which is the shape myProfile holds.
        // It must not be written into queryKeys.profile — that key belongs to
        // the profile page's camelCase display shape.
        (payload) => {
          queryClient.setQueryData(queryKeys.myProfile(user.id), payload.new);
          queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: queryKeys.unreadNotificationCount(user.id) })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Live "new posts" banner: subscribe to inserts and filter client-side,
  // same dedup logic the Firestore version used.
  useEffect(() => {
    if (!user) return;
    // The banner this feeds only exists on the feed itself. Subscribing from
    // everywhere meant every post inserted anywhere was pushed to every client
    // while they sat in messages or on a profile, and buffered for a banner
    // they could not see.
    if (!onFeed) return;

    const channel = supabase
      .channel(`posts-feed-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const row = payload.new as any;
        if (row.author_id === user.id) return;
        const post = mapRow(row);
        const cached = queryClient.getQueryData<PostType[]>(queryKeys.feed()) ?? [];
        if (cached.some(p => p.id === post.id)) return;
        setNewForYouPosts(newPrev => {
          if (newPrev.some(p => p.id === post.id)) return newPrev;
          // Only the three newest avatars are ever shown and no total is
          // displayed, so an unbounded buffer just grew for as long as the tab
          // stayed open.
          return [post, ...newPrev].slice(0, NEW_POSTS_BUFFER_LIMIT);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, onFeed]);


  const addPost = async ({ text, media, poll, location, scheduledFor }: { text: string; media: Media[]; poll?: PostType['poll'], location?: string | null, scheduledFor?: string | null }): Promise<PostType | null> => {
    if (!user || !profile) {
        throw new Error("Cannot add post: user not logged in.");
    }

    const insertRow: any = {
        author_id: user.id,
        // Falls back to the handle, never to a placeholder. "Anonymous User" is
        // the column default, so using it here made a misread profile look like
        // a legitimately anonymous account rather than a bug.
        author_name: profile.display_name || profile.handle,
        author_handle: profile.handle,
        author_avatar: profile.photo_url,
        content: text,
        media: [],
        ...(poll && { poll }),
        ...(location && { location }),
        ...(scheduledFor && { scheduled_for: scheduledFor }),
    };

    const { data: inserted, error } = await supabase.from('posts').insert(insertRow).select().single();
    if (error || !inserted) {
        throw error ?? new Error('Failed to create post');
    }

    const optimisticPost = mapRow({ ...inserted, media: media.map(m => ({ url: m.previewUrl, type: m.type, hint: 'user uploaded content' })) });
    // A scheduled post isn't live yet, so it must not be dropped into the
    // feed optimistically — it would show at the top until the next refetch.
    if (!scheduledFor) {
      updateFeed(prev => [optimisticPost, ...prev]);
    }

    const uploadPromises = media.map(async (m) => {
        if (m.type === 'gif' || m.type === 'sticker') {
            return { url: m.url ?? '', type: m.type, width: m.width, height: m.height, hint: 'giphy content' };
        }
        const fileName = `${Date.now()}-${m.file.name}`;
        const storagePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('post-media').upload(storagePath, m.file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(storagePath);
        const baseMediaData = { url: publicUrl, type: m.type, hint: 'user uploaded content' };

        if (m.type === 'image') {
            const { width, height } = await getImageDimensions(m.file);
            return { ...baseMediaData, width, height };
        }

        if (m.type === 'video') {
            const { blob: poster, width, height } = await captureVideoPoster(m.file);
            const dimensions = width && height ? { width, height } : {};
            if (!poster) return { ...baseMediaData, ...dimensions };

            const posterPath = `${user.id}/${fileName}-poster.jpg`;
            const { error: posterError } = await supabase.storage
                .from('post-media')
                .upload(posterPath, poster, { contentType: 'image/jpeg' });
            // A missing poster is a worse thumbnail, not a failed post.
            if (posterError) return { ...baseMediaData, ...dimensions };

            const { data: { publicUrl: posterUrl } } = supabase.storage
                .from('post-media')
                .getPublicUrl(posterPath);
            return { ...baseMediaData, ...dimensions, posterUrl };
        }

        return baseMediaData;
    });

    Promise.all(uploadPromises).then(async mediaUploads => {
        await supabase.from('posts').update({ media: mediaUploads }).eq('id', inserted.id);
        const finalPost = { ...optimisticPost, media: mediaUploads };
        updateFeed(prev => prev.map(p => p.id === optimisticPost.id ? finalPost : p));
        queryClient.setQueryData(queryKeys.post(optimisticPost.id), finalPost);
    }).catch(uploadError => {
        console.error("Error during media upload, post created without media:", uploadError);
    });

    if (text) {
      const topics = extractKeywords(text);
      if (topics.length > 0) {
        await supabase.from('topics').insert(topics.map(topic => ({ topic, post_id: inserted.id })));
      }
    }

    return optimisticPost;
  };

  const editPost = async (postId: string, data: { text: string }) => {
    if (!user) throw new Error("Not authorized");
    const { error } = await supabase.from('posts').update({ content: data.text }).eq('id', postId);
    if (error) throw error;

    const updater = (posts: PostType[]) => posts.map(p => p.id === postId ? { ...p, content: data.text } : p)
    updateFeed(updater);
    setNewForYouPosts(updater);
    queryClient.setQueryData<PostType>(queryKeys.post(postId), prev =>
      prev ? { ...prev, content: data.text } : prev
    );
  };

  const deletePost = async (postId: string) => {
    if (!user) throw new Error("Not authorized");
    const { error } = await supabase.rpc('delete_post', { p_post_id: postId });
    if (error) throw error;

    const updater = (posts: PostType[]) => posts.filter(p => p.id !== postId)
    updateFeed(updater);
    setNewForYouPosts(updater);
    queryClient.removeQueries({ queryKey: queryKeys.post(postId) });
    if (user) queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks(user.id) });
  };

  const addVote = async (postId: string, choiceIndex: number) => {
    const updater = (posts: PostType[]) =>
      posts.map(p => {
        if (p.id === postId && p.poll) {
          const newChoices = p.poll.choices.map((choice, index) =>
            index === choiceIndex ? { ...choice, votes: choice.votes + 1 } : choice
          );
          return { ...p, poll: { ...p.poll, choices: newChoices } };
        }
        return p;
      });

    updateFeed(updater);
    setNewForYouPosts(updater);

    const { error } = await supabase.rpc('vote_on_poll', { p_post_id: postId, p_choice_index: choiceIndex });
    if (error) {
      console.error("Failed to update vote:", error);
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
    }
  };

  const addComment = async (postId: string, data: { text: string; media: ReplyMedia[] }): Promise<boolean | null> => {
    if (!user || !profile) throw new Error("User not authenticated.");

    const { text, media } = data;
    try {
        const mediaUploads = await Promise.all(media.map(async (m) => {
            if (m.type === 'gif' || m.type === 'sticker') {
                return { url: m.url, type: m.type, width: m.width, height: m.height, hint: 'giphy content' };
            }
            const { width, height } = m.type === 'image' ? await getImageDimensions(m.file) : { width: undefined, height: undefined };
            const fileName = `comment-${Date.now()}-${m.file.name}`;
            const storagePath = `${user.id}/comments/${postId}/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('post-media').upload(storagePath, m.file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(storagePath);
            return { url: publicUrl, type: m.type, width, height, hint: 'user uploaded reply' };
        }));

        const { error } = await supabase.from('comments').insert({
            post_id: postId,
            author_id: user.id,
            // Falls back to the handle, never to a placeholder. "Anonymous User" is
        // the column default, so using it here made a misread profile look like
        // a legitimately anonymous account rather than a bug.
        author_name: profile.display_name || profile.handle,
            author_handle: profile.handle,
            author_avatar: profile.photo_url,
            content: text,
            media: mediaUploads,
        });
        if (error) throw error;

        const updater = (posts: PostType[]) => posts.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p);
        updateFeed(updater);
        setNewForYouPosts(updater);
        queryClient.setQueryData<PostType>(queryKeys.post(postId), prev =>
          prev ? { ...prev, comments: prev.comments + 1 } : prev
        );

        return true;
    } catch (e) {
        console.error("Error adding comment: ", e);
        throw new Error("Could not post comment.");
    }
  };

  const likePost = async (postId: string, currentlyLiked: boolean) => {
    if (!user) return;
    const shouldUnlike = currentlyLiked;

    const updater = (posts: PostType[]) => posts.map(p =>
        p.id === postId
        ? { ...p, likes: p.likes + (shouldUnlike ? -1 : 1) }
        : p
    );
    updateFeed(updater);
    setNewForYouPosts(updater);
    queryClient.setQueryData<PostType>(queryKeys.post(postId), prev =>
      prev ? { ...prev, likes: prev.likes + (shouldUnlike ? -1 : 1) } : prev
    );
    // Optimistically flip membership so the heart fills immediately
    // instead of waiting on the realtime round trip.
    queryClient.setQueryData<{ bookmarked: string[]; liked: string[] }>(
      queryKeys.interactions(user.id),
      prev => prev
        ? {
            ...prev,
            liked: shouldUnlike
              ? prev.liked.filter(pid => pid !== postId)
              : [...prev.liked, postId],
          }
        : prev
    );

    const { error } = shouldUnlike
      ? await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId)
      : await supabase.from('likes').insert({ user_id: user.id, post_id: postId });

    if (error) {
        console.error("Error updating likes:", error);
        const revertUpdater = (posts: PostType[]) => posts.map(p =>
            p.id === postId
            ? { ...p, likes: p.likes + (shouldUnlike ? 1 : -1) }
            : p
        );
        updateFeed(revertUpdater);
        setNewForYouPosts(revertUpdater);
        queryClient.setQueryData<PostType>(queryKeys.post(postId), prev =>
          prev ? { ...prev, likes: prev.likes + (shouldUnlike ? 1 : -1) } : prev
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.interactions(user.id) });
    }
  };

  const likeComment = async (postId: string, commentId: string, isUnlike: boolean) => {
    if (!user) return;
    const { error } = isUnlike
      ? await supabase.from('likes').delete().eq('user_id', user.id).eq('comment_id', commentId)
      : await supabase.from('likes').insert({ user_id: user.id, comment_id: commentId });
    if (error) console.error("Error updating comment likes:", error);
  };

  const repostPost = async (postId: string, isReposted: boolean) => {
    const { error } = await supabase.rpc('increment_repost_count', { p_post_id: postId, p_delta: isReposted ? -1 : 1 });
    if (error) console.error("Error updating reposts:", error);
  };

  /**
   * Reposting a comment, as a row.
   *
   * The button used to change colour and stop there — nothing reached the
   * database, and the count beside it never moved. A row per person per comment
   * means the count is maintained by the trigger, and a second one is refused
   * by the unique index rather than quietly inflating the number.
   */
  const repostComment = async (commentId: string, isReposted: boolean) => {
    if (!user) return;
    const { error } = isReposted
      ? await supabase.from('reposts').delete().eq('user_id', user.id).eq('comment_id', commentId)
      : await supabase.from('reposts').insert({ user_id: user.id, comment_id: commentId });
    if (error) console.error("Error updating comment reposts:", error);
  };

  const bookmarkPost = async (postId: string, isBookmarked: boolean) => {
    if (!user) return;

    queryClient.setQueryData<{ bookmarked: string[]; liked: string[] }>(
      queryKeys.interactions(user.id),
      prev => prev
        ? {
            ...prev,
            bookmarked: isBookmarked
              ? prev.bookmarked.filter(pid => pid !== postId)
              : [...prev.bookmarked, postId],
          }
        : prev
    );

    const { error } = isBookmarked
      ? await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId)
      : await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });

    if (error) {
      console.error("Error updating bookmark:", error);
      queryClient.invalidateQueries({ queryKey: queryKeys.interactions(user.id) });
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks(user.id) });
  };

  const value = {
      forYouPosts, newForYouPosts,
      loadingForYou,
      showNewForYouPosts, addPost, editPost, deletePost, addVote,
      addComment, likePost, likeComment, repostPost, repostComment, bookmarkPost,
      bookmarkedPostIds, likedPostIds,
      fetchForYouPosts
  };

  return (
    <PostContext.Provider value={value}>
      {children}
    </PostContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostProvider');
  }
  return context;
}
