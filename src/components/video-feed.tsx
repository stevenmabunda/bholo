
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { getVideoPosts } from '@/app/(app)/home/actions';
import type { PostType } from '@/lib/data';
import { Loader2, Play, Pause, Volume2, VolumeX, MessageCircle, Heart, Share2, Music, Copy } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { cn, formatTimestamp } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { usePosts } from '@/contexts/post-context';
import { useAuth } from '@/hooks/use-auth';
import { LoginOrSignupDialog } from './login-or-signup-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { ScrollArea } from './ui/scroll-area';
import { CreateComment } from './create-comment';
import { useLiveComments } from '@/hooks/use-live-comments';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Post } from './post';
import { useToast } from '@/hooks/use-toast';

// Helper components for social icons
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 2.8 3.2 3 5.2-1.4 1.1-3.5 2.2-6 2.2-2.3 0-4.6-1.1-6.8-2.2C5.3 14.3 4.1 12.3 3 10c1.8 1.4 3.9 2.4 6.3 2.5.1 0 .2 0 .3 0 2.3 0 4.2-1.1 5.7-2.2-.1-.1-.2-.2-.2-.3-.1-.3-.2-.5-.3-.8-.3-.9-.6-1.8-1-2.7-.4-.9-.9-1.8-1.4-2.6-1.1-1.4-2.6-2.3-4.2-2.3-1.4 0-2.8.7-3.9 1.8" /></svg>
);
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
);
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
);


function CommentSkeleton() {
  return (
      <div className="flex space-x-3 md:space-x-4 p-3 md:p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-4/5" />
          </div>
      </div>
  )
}

function CommentSheet({ post, onOpenChange }: { post: PostType, onOpenChange: (open: boolean) => void }) {
    const { addComment } = usePosts();
    const { comments: liveComments, loading } = useLiveComments(post.id);
    const comments: PostType[] = liveComments.map(c => ({
        id: c.id,
        authorId: c.authorId,
        authorName: c.authorName,
        authorHandle: c.authorHandle,
        authorAvatar: c.authorAvatar,
        content: c.content,
        media: c.media.map(m => ({ ...m, url: m.url ?? '' })),
        comments: c.comments,
        reposts: c.reposts,
        likes: c.likes,
        timestamp: formatTimestamp(new Date(c.createdAt)),
    }));

    const handleComment = async (data: { text: string; media: any[] }) => {
        try {
            await addComment(post.id, data);
            return true;
        } catch {
            return false;
        }
    }

    return (
        <SheetContent side="bottom" className="h-[85vh] flex flex-col p-0" onInteractOutside={(e) => e.preventDefault()}>
            <SheetHeader className="p-4 border-b text-center">
                <SheetTitle>Comments</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
                <div className="divide-y">
                     {loading ? (
                        Array.from({length: 3}).map((_, i) => <CommentSkeleton key={i} />)
                    ) : comments.length > 0 ? (
                         comments.map((comment) => <Post key={comment.id} {...comment} isReplyView={true} />)
                    ) : (
                        <p className="text-center text-muted-foreground p-8">No comments yet.</p>
                    )}
                </div>
            </ScrollArea>
             <div className="border-t">
                <CreateComment onComment={handleComment} isDialog />
            </div>
        </SheetContent>
    )
}

function ShareSheet({ post }: { post: PostType }) {
    const { toast } = useToast();

    const handleCopyLink = (e: React.MouseEvent) => {
        e.stopPropagation();
        const postUrl = `${window.location.origin}/post/${post.id}`;
        navigator.clipboard.writeText(postUrl);
        toast({ description: "Link copied to clipboard!" });
    };

    const getShareUrl = (platform: 'twitter' | 'facebook' | 'whatsapp') => {
        const postUrl = encodeURIComponent(`${window.location.origin}/post/${post.id}`);
        const text = encodeURIComponent(post.content);

        switch (platform) {
            case 'twitter': return `https://twitter.com/intent/tweet?url=${postUrl}&text=${text}`;
            case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
            case 'whatsapp': return `https://api.whatsapp.com/send?text=${text}%20${postUrl}`;
        }
    };

    return (
        <SheetContent side="bottom" className="rounded-t-lg">
            <SheetHeader>
                <SheetTitle>Share Post</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-4 gap-4 py-4">
                <a href={getShareUrl('twitter')} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-center group">
                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent"><TwitterIcon className="h-7 w-7" /></div>
                    <span className="text-xs">Twitter</span>
                </a>
                <a href={getShareUrl('facebook')} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-center group">
                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent"><FacebookIcon className="h-7 w-7" /></div>
                    <span className="text-xs">Facebook</span>
                </a>
                <a href={getShareUrl('whatsapp')} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-center group">
                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent"><WhatsAppIcon className="h-7 w-7" /></div>
                    <span className="text-xs">WhatsApp</span>
                </a>
                <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 text-center group">
                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent"><Copy className="h-7 w-7" /></div>
                    <span className="text-xs">Copy Link</span>
                </button>
            </div>
        </SheetContent>
    );
}

function VideoPlayer({ post, isActive, isMuted, onMuteToggle }: { post: PostType, isActive: boolean, isMuted: boolean, onMuteToggle: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);

  const { user } = useAuth();
  const { likedPostIds, likePost } = usePosts();
  
  const [likeCount, setLikeCount] = useState(post.likes);
  const isLiked = likedPostIds.has(post.id);

  useEffect(() => {
    if (isActive) {
      videoRef.current?.play().catch(e => {
        if (e.name !== 'AbortError') console.error('Video play failed:', e);
      });
    } else {
      videoRef.current?.pause();
      if(videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [isActive]);
  
  useEffect(() => {
    if(videoRef.current) {
        videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current?.play();
    } else {
      videoRef.current?.pause();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  const handleActionClick = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
        setIsLoginDialogOpen(true);
        return;
    }
    action();
  };

  const handleLike = () => {
    setLikeCount(prev => prev + (isLiked ? -1 : 1));
    likePost(post.id, isLiked);
  };
  
  const handleComment = () => {
    setIsCommentSheetOpen(true);
  };

  const handleShare = () => {
      setIsShareSheetOpen(true);
  }

  const handleMuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMuteToggle();
  }

  return (
    <div className="relative h-full w-full bg-black" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={post.media![0].url}
        className="w-full h-full object-contain"
        loop
        playsInline
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Play className="h-16 w-16 text-white/50" fill="currentColor" />
        </div>
      )}
      <div className="absolute bottom-[80px] left-3 text-white z-10 w-3/4">
        <Link href={`/profile/${post.authorId}`} className="font-bold">@{post.authorHandle}</Link>
        <p className="mt-1 text-sm line-clamp-2">{post.content}</p>
        <div className="flex items-center gap-2 mt-2 text-xs">
            <Music className="h-4 w-4" />
            <span>Original Audio - {post.authorName}</span>
        </div>
      </div>
      <div className="absolute right-2 bottom-24 sm:bottom-1/2 sm:translate-y-1/2 flex flex-col items-center gap-6 text-white z-10">
        <button onClick={handleActionClick(handleLike)} className="flex flex-col items-center">
            <Heart className={cn("h-8 w-8", isLiked && "fill-current text-red-500")} />
            <span className="text-xs font-bold">{likeCount}</span>
        </button>
        <Sheet open={isCommentSheetOpen} onOpenChange={setIsCommentSheetOpen}>
            <SheetTrigger asChild>
                <button onClick={handleActionClick(handleComment)} className="flex flex-col items-center">
                    <MessageCircle className="h-8 w-8" />
                    <span className="text-xs font-bold">{post.comments}</span>
                </button>
            </SheetTrigger>
            <CommentSheet post={post} onOpenChange={setIsCommentSheetOpen} />
        </Sheet>
        <Sheet open={isShareSheetOpen} onOpenChange={setIsShareSheetOpen}>
            <SheetTrigger asChild>
                <button onClick={handleActionClick(handleShare)} className="flex flex-col items-center">
                    <Share2 className="h-8 w-8" />
                    <span className="text-xs font-bold">Share</span>
                </button>
            </SheetTrigger>
            <ShareSheet post={post} />
        </Sheet>
         <button onClick={handleMuteClick} className="flex flex-col items-center">
            {isMuted ? <VolumeX className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}
        </button>
      </div>
      <LoginOrSignupDialog isOpen={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen} />
    </div>
  );
}

export function VideoFeed() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const startPostId = searchParams.get('postId');

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const videoPosts = await getVideoPosts();
        
        if (startPostId) {
            const startIndex = videoPosts.findIndex(p => p.id === startPostId);
            if (startIndex > -1) {
                // Move the starting post to the beginning of the array
                const startPost = videoPosts.splice(startIndex, 1)[0];
                videoPosts.unshift(startPost);
            }
        }
        setPosts(videoPosts);

      } catch (error) {
        console.error("Failed to fetch video posts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [startPostId]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);
  
  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
  }
  
  return (
    <div className="h-screen w-screen bg-black embla" ref={emblaRef}>
      <div className="embla__container">
        {posts.map((post, index) => (
          <div key={post.id} className="embla__slide">
            <VideoPlayer 
                post={post} 
                isActive={index === activeIndex} 
                isMuted={isMuted}
                onMuteToggle={() => setIsMuted(prev => !prev)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
