
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { PostType } from '@/lib/data';
import type { Media } from '@/components/create-post';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { supabase } from '@/lib/supabase/client';
import { formatTimestamp } from '@/lib/utils';
import type { ReplyMedia } from '@/components/create-comment';
import { getRecentPosts } from '@/app/(app)/home/actions';

type PostContextType = {
  forYouPosts: PostType[];
  newForYouPosts: PostType[];
  loadingForYou: boolean;
  showNewForYouPosts: () => void;
  addPost: (data: { text: string; media: Media[], poll?: PostType['poll'], location?: string | null }) => Promise<PostType | null>;
  editPost: (postId: string, data: { text:string }) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  addVote: (postId: string, choiceIndex: number) => Promise<void>;
  addComment: (postId: string, data: { text: string; media: ReplyMedia[] }) => Promise<boolean | null>;
  likePost: (postId: string, currentlyLiked: boolean) => Promise<void>;
  likeComment: (postId: string, commentId: string, isUnlike: boolean) => Promise<void>;
  repostPost: (postId: string, isReposted: boolean) => Promise<void>;
  bookmarkPost: (postId: string, isBookmarked: boolean) => Promise<void>;
  bookmarkedPostIds: Set<string>;
  likedPostIds: Set<string>;
  fetchForYouPosts: (options?: { limit?: number; lastPostId?: string }) => Promise<PostType[]>;
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
  const [forYouPosts, setForYouPosts] = useState<PostType[]>([]);
  const [newForYouPosts, setNewForYouPosts] = useState<PostType[]>([]);

  const [loadingForYou, setLoadingForYou] = useState(true);

  const { user } = useAuth();
  const { profile } = useProfile();
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(new Set());
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());

  const [hasFetchedInitial, setHasFetchedInitial] = useState(false);

  const fetchForYouPosts = useCallback(async (options: { limit?: number; lastPostId?: string } = {}) => {
      if (!options.lastPostId) setLoadingForYou(true);
      try {
          const posts = await getRecentPosts(options);
          if (options.lastPostId) {
              setForYouPosts(prev => [...prev, ...posts]);
          } else {
              setForYouPosts(posts);
          }
          return posts;
      } catch (error) {
          console.error("Failed to fetch 'For You' posts:", error);
          return [];
      } finally {
          setLoadingForYou(false);
      }
  }, []);


  useEffect(() => {
    if (!hasFetchedInitial) {
        fetchForYouPosts({ limit: 20 });
        setHasFetchedInitial(true);
    }
  }, [hasFetchedInitial, fetchForYouPosts]);


  const showNewForYouPosts = () => {
    setForYouPosts(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const uniqueNewPosts = newForYouPosts.filter(p => !existingIds.has(p.id));
      return [...uniqueNewPosts, ...prev];
    });
    setNewForYouPosts([]);
  };

  // Live bookmark/like IDs for the current user.
  useEffect(() => {
    if (!user) {
        setBookmarkedPostIds(new Set());
        setLikedPostIds(new Set());
        return;
    }

    const loadIds = async () => {
      const [{ data: bookmarks }, { data: likes }] = await Promise.all([
        supabase.from('bookmarks').select('post_id').eq('user_id', user.id),
        supabase.from('likes').select('post_id').eq('user_id', user.id).not('post_id', 'is', null),
      ]);
      setBookmarkedPostIds(new Set((bookmarks ?? []).map(b => b.post_id)));
      setLikedPostIds(new Set((likes ?? []).map(l => l.post_id)));
    };
    loadIds();

    const channel = supabase
      .channel(`user-interactions-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${user.id}` }, loadIds)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `user_id=eq.${user.id}` }, loadIds)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Live "new posts" banner: subscribe to inserts and filter client-side,
  // same dedup logic the Firestore version used.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`posts-feed-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, (payload) => {
        const row = payload.new as any;
        if (row.author_id === user.id) return;
        const post = mapRow(row);
        setForYouPosts(prev => {
          if (prev.some(p => p.id === post.id)) return prev;
          setNewForYouPosts(newPrev => {
            if (newPrev.some(p => p.id === post.id)) return newPrev;
            return [post, ...newPrev];
          });
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  const addPost = async ({ text, media, poll, location }: { text: string; media: Media[]; poll?: PostType['poll'], location?: string | null }): Promise<PostType | null> => {
    if (!user || !profile) {
        throw new Error("Cannot add post: user not logged in.");
    }

    const insertRow: any = {
        author_id: user.id,
        author_name: profile.display_name || 'Anonymous User',
        author_handle: profile.handle,
        author_avatar: profile.photo_url,
        content: text,
        media: [],
        ...(poll && { poll }),
        ...(location && { location }),
    };

    const { data: inserted, error } = await supabase.from('posts').insert(insertRow).select().single();
    if (error || !inserted) {
        throw error ?? new Error('Failed to create post');
    }

    const optimisticPost = mapRow({ ...inserted, media: media.map(m => ({ url: m.previewUrl, type: m.type, hint: 'user uploaded content' })) });
    setForYouPosts(prev => [optimisticPost, ...prev]);

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
        return baseMediaData;
    });

    Promise.all(uploadPromises).then(async mediaUploads => {
        await supabase.from('posts').update({ media: mediaUploads }).eq('id', inserted.id);
        const finalPost = { ...optimisticPost, media: mediaUploads };
        setForYouPosts(prev => prev.map(p => p.id === optimisticPost.id ? finalPost : p));
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
    setForYouPosts(updater);
    setNewForYouPosts(updater);
  };

  const deletePost = async (postId: string) => {
    if (!user) throw new Error("Not authorized");
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;

    const updater = (posts: PostType[]) => posts.filter(p => p.id !== postId)
    setForYouPosts(updater);
    setNewForYouPosts(updater);
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

    setForYouPosts(updater);
    setNewForYouPosts(updater);

    const { error } = await supabase.rpc('vote_on_poll', { p_post_id: postId, p_choice_index: choiceIndex });
    if (error) {
      console.error("Failed to update vote:", error);
      fetchForYouPosts();
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
            author_name: profile.display_name || 'Anonymous User',
            author_handle: profile.handle,
            author_avatar: profile.photo_url,
            content: text,
            media: mediaUploads,
        });
        if (error) throw error;

        const updater = (posts: PostType[]) => posts.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p);
        setForYouPosts(updater);
        setNewForYouPosts(updater);

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
    setForYouPosts(updater);
    setNewForYouPosts(updater);

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
        setForYouPosts(revertUpdater);
        setNewForYouPosts(revertUpdater);
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

  const bookmarkPost = async (postId: string, isBookmarked: boolean) => {
    if (!user) return;
    const { error } = isBookmarked
      ? await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId)
      : await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
    if (error) console.error("Error updating bookmark:", error);
  };

  const value = {
      forYouPosts, newForYouPosts,
      loadingForYou,
      showNewForYouPosts, addPost, editPost, deletePost, addVote,
      addComment, likePost, likeComment, repostPost, bookmarkPost,
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
