
'use client';

import { Post } from '@/components/post';
import { CreateComment, type ReplyMedia } from '@/components/create-comment';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { PostType } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import { usePosts } from '@/contexts/post-context';
import { useLiveComments } from '@/hooks/use-live-comments';
import { formatTimestamp, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PostSkeleton } from '@/components/post-skeleton';
import { Button } from '@/components/ui/button';
import { getPost } from '@/app/(app)/post/[id]/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';


function ReplyDialog({ post, onReply, open, onOpenChange }: { post: PostType, onReply: (data: { text: string; media: any[] }) => Promise<boolean | null>, open: boolean, onOpenChange: (open: boolean) => void }) {
    const { toast } = useToast();
    const router = useRouter();

    const handleCreateReply = async (data: { text: string; media: any[] }) => {
        try {
            const success = await onReply(data);
            if (success) {
                onOpenChange(false);
                toast({
                    description: "Your reply was sent.",
                    action: (
                        <Button variant="outline" size="sm" onClick={() => {
                            router.push(`/post/${post.id}#comments`);
                        }}>
                            View
                        </Button>
                    ),
                });
                return true;
            }
             return null;
        } catch (error) {
            toast({ variant: 'destructive', description: "Failed to send reply." });
            return null;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 gap-0" onClick={(e) => e.stopPropagation()}>
                <DialogHeader className="p-4 border-b">
                     <DialogTitle className="sr-only">Reply to post</DialogTitle>
                     <DialogClose />
                </DialogHeader>
                <div className="p-4">
                    <div className="flex space-x-3">
                        <div className="flex flex-col items-center">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={post.authorAvatar} alt={post.authorName} />
                                <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold">{post.authorName}</span>
                                <span className="text-sm text-muted-foreground">@{post.authorHandle}</span>
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">
                                Replying to <span className="text-primary">@{post.authorHandle}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <CreateComment onComment={handleCreateReply} isDialog={true} />
            </DialogContent>
        </Dialog>
    );
}

export function PostPageView({ postId }: { postId: string }) {
  const { user } = useAuth();
  const { addComment } = usePosts();
  const router = useRouter();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Seed from the feed cache when the post is already known (the common
  // case — you just tapped it from a feed that was already showing it),
  // so the page renders instantly and revalidates in the background
  // instead of flashing a skeleton on every open.
  const cachedFromFeed = queryClient
    .getQueryData<PostType[]>(queryKeys.feed(user?.id ?? 'anonymous'))
    ?.find(p => p.id === postId);

  const { data: post = null, isLoading } = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => getPost(postId),
    enabled: !!postId,
    initialData: cachedFromFeed,
    staleTime: 30_000,
  });

  const loadingPost = !!postId && isLoading && !cachedFromFeed;
  const { comments: liveComments, loading: loadingComments } = useLiveComments(postId);
  /**
   * The thread, arranged rather than listed.
   *
   * Every reply used to land at the bottom as a fresh top-level comment, so
   * answering someone put your response nowhere near what it answered. Replies
   * now sit under their parent, in the order they were written. One level only
   * — a reply to a reply is stored against the same parent, so this never nests
   * twice.
   */
  const threaded = (() => {
    const tops = liveComments.filter(c => !c.parentCommentId);
    const repliesByParent = new Map<string, typeof liveComments>();
    for (const c of liveComments) {
      if (!c.parentCommentId) continue;
      const existing = repliesByParent.get(c.parentCommentId) ?? [];
      existing.push(c);
      repliesByParent.set(c.parentCommentId, existing);
    }
    // A reply whose parent is missing — deleted, or not loaded — would vanish
    // otherwise, so it falls back to sitting on its own.
    const known = new Set(tops.map(c => c.id));
    const orphans = liveComments.filter(c => c.parentCommentId && !known.has(c.parentCommentId));
    return [...tops, ...orphans].map(parent => ({
      parent,
      replies: repliesByParent.get(parent.id) ?? [],
    }));
  })();

  const comments: PostType[] = liveComments.map(c => ({
    id: c.id,
    authorId: c.authorId,
    authorName: c.authorName,
    authorHandle: c.authorHandle,
    authorAvatar: c.authorAvatar,
    content: c.content,
    timestamp: formatTimestamp(new Date(c.createdAt)),
    media: c.media.map(m => ({ ...m, url: m.url ?? '' })),
    comments: c.comments,
    reposts: c.reposts,
    likes: c.likes,
  }));
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  
  const mainCommentBoxRef = useRef<HTMLDivElement>(null);
  const commentSectionRef = useRef<HTMLDivElement>(null);
  
  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/home');
    }
  };


  useEffect(() => {
    if (!loadingComments && window.location.hash === '#comments' && commentSectionRef.current) {
      setTimeout(() => {
          commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [loadingComments]);

  const handleCreateComment = async (data: { text: string, media: ReplyMedia[] }) => {
    if (!user || !postId) return null;
    try {
        await addComment(postId, data);
        return true; 
    } catch (error) {
        console.error("Failed to add comment:", error);
        return null;
    }
  }

  const Header = ({ post, onBack }: { post: PostType | null, onBack: () => void }) => (
    <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-2 md:p-4 backdrop-blur-sm h-14">
        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={onBack}>
            <ArrowLeft />
        </Button>
        <div>
            <h1 className="text-xl font-bold">{post ? 'Post' : 'Loading...'}</h1>
        </div>
    </header>
  );

  if (loadingPost) {
    return (
        <div>
            <Header post={null} onBack={handleBack} />
            <PostSkeleton />
        </div>
    );
  }

  if (!post) {
      return (
          <div>
              <Header post={null} onBack={handleBack} />
              <div className="p-8 text-center text-muted-foreground">
                <h2 className="text-xl font-bold">Post not found</h2>
                <p>This post may have been deleted.</p>
              </div>
          </div>
      )
  }

  return (
    <div className="h-screen flex flex-col">
      <Header post={post} onBack={handleBack} />
      <div className="flex-1 overflow-y-auto">
        <Post {...post} isStandalone={true} />
        
        <div ref={commentSectionRef} id="comments">
          <div ref={mainCommentBoxRef}>
            <CreateComment onComment={handleCreateComment} />
          </div>
        </div>

        <div className="border-t">
            {loadingComments ? (
                Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="flex space-x-3 md:space-x-4 p-3 md:p-4 border-b">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/5" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                    </div>
                ))
            ) : comments.length > 0 ? (
                 threaded.map(({ parent, replies }) => {
                    const asPost = (c: typeof parent): PostType => ({
                        id: c.id, authorId: c.authorId, authorName: c.authorName,
                        authorHandle: c.authorHandle, authorAvatar: c.authorAvatar,
                        content: c.content, timestamp: formatTimestamp(new Date(c.createdAt)),
                        media: c.media.map(m => ({ ...m, url: m.url ?? '' })),
                        comments: c.comments, reposts: c.reposts, likes: c.likes,
                    });
                    return (
                        <div key={`comment-${parent.id}`} className="border-b">
                            <Post {...asPost(parent)} isReplyView={true} parentPostId={post.id} />

                            {/* Indented once, against a line, so it is clear
                                what the reply is answering. */}
                            {replies.length > 0 && (
                                <div className="ml-6 border-l pl-3 md:ml-10 md:pl-4">
                                    {replies.map(reply => (
                                        <Post
                                            key={`reply-${reply.id}`}
                                            {...asPost(reply)}
                                            isReplyView={true}
                                            parentPostId={post.id}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                 })
            ) : (
                 <div className="p-8 text-center text-muted-foreground">
                    <h2 className="text-xl font-bold">No comments yet</h2>
                    <p>Be the first to reply!</p>
                </div>
            )}
        </div>
      </div>
      <ReplyDialog 
        post={post}
        onReply={handleCreateComment}
        open={isReplyDialogOpen}
        onOpenChange={setIsReplyDialogOpen}
      />
    </div>
  );
}
