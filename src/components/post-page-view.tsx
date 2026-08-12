
'use client';

import { Post } from '@/components/post';
import { CreateComment, type ReplyMedia } from '@/components/create-comment';
import { useState, useEffect, useRef } from 'react';
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

  const [post, setPost] = useState<PostType | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const { comments: liveComments, loading: loadingComments } = useLiveComments(postId);
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
    if (!postId) {
        setLoadingPost(false);
        return;
    };

    const fetchPostData = async () => {
        setLoadingPost(true);
        const fetchedPost = await getPost(postId);
        if (fetchedPost) {
            setPost(fetchedPost);
        }
        setLoadingPost(false);
    };

    fetchPostData();
  }, [postId]);

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
                 comments.map((comment, index) => (
                    <div key={`comment-${comment.id}`} className={cn(
                        "border-b",
                        index % 2 !== 0 && "border-b-transparent"
                    )}>
                        <Post {...comment} isReplyView={true} parentPostId={post.id} />
                    </div>
                 ))
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
