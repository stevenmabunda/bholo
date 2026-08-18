
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import useEmblaCarousel from 'embla-carousel-react';
import { getVideoPosts } from '@/app/(app)/home/actions';
import { queryKeys } from '@/lib/query-keys';
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
import { siteUrl } from '@/lib/site';

// Helper components for social icons (current brand marks, kept monochrome via currentColor to match the app's icon style)
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" /></svg>
);
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" /></svg>
);
const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
);


/**
 * Fisher-Yates, driven by a seed so the same mount always produces the same
 * order. Math.random() called during render would reshuffle on every re-render
 * and throw the viewer to a different clip mid-scroll.
 */
function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  // Small deterministic PRNG — mulberry32. Only needs to look unordered.
  let state = Math.floor(seed * 2 ** 32) || 1;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

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
        // Built during render, which also runs on the server — see post.tsx.
        const origin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
        const postUrl = encodeURIComponent(`${origin}/post/${post.id}`);
        const text = encodeURIComponent(post.content);

        switch (platform) {
            case 'twitter': return `https://x.com/intent/post?url=${postUrl}&text=${text}`;
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
                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent"><XIcon className="h-7 w-7" /></div>
                    <span className="text-xs">X</span>
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
        poster={post.media![0].posterUrl}
        className="w-full h-full object-contain"
        loop
        playsInline
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Play className="h-16 w-16 text-white/50" fill="currentColor" />
        </div>
      )}
      {/* The mobile bottom nav is fixed, 4rem tall plus the safe-area inset,
          and sits at z-40 — so a flat 80px offset put this behind it on any
          phone with a home indicator rather than merely close to the edge.
          Clear the nav, the inset, and a 2rem gap. */}
      <div className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-3 text-white z-10 w-3/4">
        <Link href={`/profile/${post.authorId}`} className="flex items-center gap-2 w-fit">
          <Avatar className="h-8 w-8 border border-white/40">
            <AvatarImage src={post.authorAvatar} alt={post.authorName} />
            <AvatarFallback>{post.authorName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <span className="font-bold truncate">@{post.authorHandle}</span>
        </Link>
        <p className="mt-1 text-sm line-clamp-2">{post.content}</p>
        <div className="flex items-center gap-2 mt-2 text-xs">
            <Music className="h-4 w-4" />
            <span>Original Audio - {post.authorName}</span>
        </div>
      </div>
      {/* Vertically centred at every size. It used to sit low on mobile
          (bottom-24) and only centre from sm up, which put it down beside the
          caption instead of within thumb reach. */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 text-white z-10">
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
  const searchParams = useSearchParams();
  const startPostId = searchParams.get('postId');

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis: 'y',
    loop: false,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  // Cached independently of which post you entered on, so re-opening
  // the video feed doesn't refetch the whole list.
  const { data: videoPosts = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.videoPosts(),
    queryFn: () => getVideoPosts(),
  });

  // Ordering is a view concern, derived from the cached list rather
  // than baked into it (the previous version mutated the fetched array
  // in place, so the requested post only led on a fresh fetch).
  // Reshuffled each time the feed is opened, not each render — the seed is
  // fixed for the life of this mount, so scrolling back up finds the same
  // clips in the same order, while coming back later gets a different run.
  const [shuffleSeed] = useState(() => Math.random());

  const posts = useMemo(() => {
    // Newest-first is the wrong order here. The immersive feed is for
    // browsing rather than catching up, and in date order the same handful of
    // recent clips lead every single time until someone posts.
    const shuffled = shuffle(videoPosts, shuffleSeed);

    if (!startPostId) return shuffled;
    // Whichever clip was tapped still has to lead, or opening a video plays
    // somebody else's.
    const startIndex = shuffled.findIndex(p => p.id === startPostId);
    if (startIndex < 0) return shuffled;
    const reordered = [...shuffled];
    const [startPost] = reordered.splice(startIndex, 1);
    reordered.unshift(startPost);
    return reordered;
  }, [videoPosts, startPostId, shuffleSeed]);

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
