
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { MessageCircle, Repeat, Heart, Share2, MoreHorizontal, Edit, Trash2, Bookmark, Copy, X, ChevronLeft, ChevronRight, Check, Play, Pause, Volume2, VolumeX, Sparkles, BarChart3, Maximize2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import { cn, linkify, formatTimestamp, formatDetailedTimestamp } from "@/lib/utils";
import { findFirstYoutubeVideoId } from "@/lib/youtube";
import { YoutubeEmbed } from "@/components/youtube-embed";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getPost } from "@/app/(app)/post/[id]/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import type { PostType } from "@/lib/data";
import { Progress } from "./ui/progress";
import { usePosts } from "@/contexts/post-context";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FollowButton } from "./follow-button";
import { getIsFollowing } from "@/app/(app)/profile/actions";
import { ScrollArea } from "./ui/scroll-area";
import { CreateComment } from "./create-comment";
import { useLiveComments } from '@/hooks/use-live-comments';
import { Skeleton } from "./ui/skeleton";
import useEmblaCarousel from 'embla-carousel-react';
import { LoginOrSignupDialog } from "./login-or-signup-dialog";
import { ProfileHoverCard } from "./profile-hover-card";
import { AskAiDialog } from "./ask-ai-dialog";
import { useTabContext } from "@/contexts/tab-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { siteUrl } from "@/lib/site";
import { feedAspect, PORTRAIT_THRESHOLD } from "@/lib/media-aspect";
import { getFeedScroller } from "@/lib/scroll-container";


type PostProps = PostType & {
  isStandalone?: boolean;
  isReplyView?: boolean;
  parentPostId?: string;
};

type CommentType = PostType;

function CommentEngagement({ parentPostId, commentId, initialLikes, onReplyClick }: { parentPostId: string, commentId: string, initialLikes: number, onReplyClick: (event: React.MouseEvent) => void }) {
    const { user } = useAuth();
    const { likeComment } = usePosts();
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    
    const [likeCount, setLikeCount] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(false);
    const [isReposted, setIsReposted] = useState(false);

    const handleActionClick = (action: () => void) => (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!user) {
            setIsLoginDialogOpen(true);
            return;
        }
        action();
    };

    const handleLike = () => {
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLikeCount(prev => prev + (newIsLiked ? 1 : -1));
        likeComment(parentPostId, commentId, newIsLiked);
    };
    
    const handleRepost = () => {
      // NOTE: Reposting comments is often a more complex feature (e.g., quote tweet).
      // For now, this is a UI-only interaction.
      setIsReposted(!isReposted);
    }
    
    const handleReply = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      // The parent's handler wants the event too — it stops propagation of its
      // own before opening the reply dialog.
      onReplyClick(e);
    }


    return (
         <div className="flex items-center justify-between text-muted-foreground max-w-xs mt-2">
            <div className="flex items-center -ml-3">
                <Button variant="ghost" size='icon' className="h-8 w-8 flex items-center gap-2 hover:text-primary" onClick={handleReply}>
                    <MessageCircle className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size='icon' className={cn("h-8 w-8 flex items-center gap-2 hover:text-green-500", isReposted && "text-green-500")} onClick={handleActionClick(handleRepost)}>
                    <Repeat className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size='icon' className={cn("h-8 w-8 flex items-center gap-2", isLiked ? 'text-red-500' : 'hover:text-red-500')} onClick={handleActionClick(handleLike)}>
                    <Heart className={cn("h-5 w-5", isLiked && 'fill-current')} />
                    {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
                </Button>
            </div>
             <LoginOrSignupDialog isOpen={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen} />
        </div>
    );
}

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

/** 3.9K, 400K — the way X writes counts once they stop fitting. */
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
function formatCount(n?: number): string {
  if (!n) return '';
  return n < 1000 ? String(n) : compact.format(n);
}

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

function Poll({ poll, postId }: { poll: NonNullable<PostType['poll']>, postId: string }) {
  const [votedChoice, setVotedChoice] = useState<number | null>(null);
  const { addVote } = usePosts();

  const totalVotes = useMemo(() => {
    return poll.choices.reduce((acc, choice) => acc + choice.votes, 0);
  }, [poll.choices]);

  const handleVote = (index: number) => {
    if (votedChoice !== null) return;
    setVotedChoice(index);
    addVote(postId, index);
  };

  return (
    <div className="mt-3 space-y-2">
      {poll.choices.map((choice, index) => {
        const percentage = totalVotes > 0 ? (choice.votes / totalVotes) * 100 : 0;
        const hasVotedThisChoice = votedChoice === index;

        return (
          <div key={index}>
            {votedChoice !== null ? (
              <div className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center font-medium">
                    {choice.text}
                    {hasVotedThisChoice && <Check className="ml-2 h-4 w-4 text-primary" />}
                  </div>
                  <span className="font-bold">{percentage.toFixed(0)}%</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start font-medium"
                onClick={(e) => {
                    e.stopPropagation();
                    handleVote(index);
                }}
              >
                {choice.text}
              </Button>
            )}
          </div>
        );
      })}
      {votedChoice !== null && <p className="text-xs text-muted-foreground">{totalVotes} vote{totalVotes !== 1 && 's'}</p>}
    </div>
  );
}

function Comment({ comment, parentPostId, onReplyClick }: { comment: CommentType, parentPostId: string, onReplyClick: () => void }) {
  const hasMedia = comment.media && comment.media.length > 0;
  const isVideo = hasMedia && comment.media![0].type === 'video';
  
  return (
    <div className="p-3 md:p-4">
      <div className="flex space-x-3 md:space-x-4">
          <Avatar>
            <AvatarImage src={comment.authorAvatar} alt={comment.authorName} data-ai-hint="user avatar" />
            <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
              <div className="flex items-center gap-2 text-sm">
                  <Link href={`/profile/${comment.authorId}`} className="font-bold hover:underline" onClick={(e) => e.stopPropagation()}>
                      {comment.authorName}
                  </Link>
                  <span className="text-muted-foreground">@{comment.authorHandle}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{comment.timestamp}</span>
              </div>
              <p className="mt-0 whitespace-pre-wrap">{linkify(comment.content)}</p>
              {hasMedia && (
                <div className={cn("mt-3 rounded-2xl overflow-hidden border max-h-[400px]")}>
                  {isVideo ? (
                    <video
                      src={comment.media![0].url}
                      controls
                      className="w-full h-auto max-h-96 object-contain bg-black"
                    />
                  ) : (
                    <Image
                      src={comment.media![0].url}
                      alt={`Comment image`}
                      width={comment.media![0].width || 500}
                      height={comment.media![0].height || 500}
                      className="w-full h-auto max-h-[400px] object-contain"
                      data-ai-hint={comment.media![0].hint}
                    />
                  )}
                </div>
              )}
               <CommentEngagement 
                    parentPostId={parentPostId} 
                    commentId={comment.id} 
                    initialLikes={comment.likes}
                    onReplyClick={onReplyClick}
                />
          </div>
      </div>
    </div>
  )
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


function PostComponent(props: PostProps) {
  const {
    id,
    authorId,
    authorName,
    authorHandle,
    authorAvatar,
    content,
    timestamp,
    createdAt,
    comments: initialComments,
    reposts: initialReposts,
    likes: initialLikes,
    views,
    media,
    poll,
    isStandalone = false,
    isReplyView = false,
    parentPostId,
  } = props;
  
  const router = useRouter();
  const { user } = useAuth();
  const { editPost, deletePost, likePost, repostPost, bookmarkPost, bookmarkedPostIds, addComment, addVote, likedPostIds } = usePosts();
  const { toast } = useToast();
  const { setActiveTab } = useTabContext();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [commentCount, setCommentCount] = useState(initialComments);

  const [likeCount, setLikeCount] = useState(initialLikes);
  const [repostCount, setRepostCount] = useState(initialReposts);
  const [isReposted, setIsReposted] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState(false);
  const [isShareSheetOpen, setShareSheetOpen] = useState(false);
  // The viewer needs its own, because the card's share sheet is still mounted
  // behind it. Both were reading isShareSheetOpen, so sharing from the open
  // viewer rendered two identical sheets on top of each other.
  const [isViewerShareOpen, setViewerShareOpen] = useState(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageViewerStartIndex, setImageViewerStartIndex] = useState(0);

  // Only the desktop viewer shows the thread; on mobile this would be a live
  // subscription feeding nothing on screen.
  const { comments: liveComments, loading: loadingComments } = useLiveComments(isImageViewerOpen && !isMobile ? id : null);
  const comments: CommentType[] = liveComments.map(c => ({
    id: c.id,
    authorId: c.authorId,
    authorName: c.authorName,
    authorHandle: c.authorHandle,
    authorAvatar: c.authorAvatar,
    content: c.content,
    timestamp: formatTimestamp(new Date(c.createdAt)),
    media: c.media.map(m => ({ ...m, url: m.url ?? '' })),
    comments: 0, reposts: 0, likes: c.likes,
  }));
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(true);

  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [isFeedVideoPlaying, setIsFeedVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);


  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  
  const isLiked = useMemo(() => likedPostIds.has(id), [id, likedPostIds]);
  const isBookmarked = useMemo(() => bookmarkedPostIds.has(id), [bookmarkedPostIds, id]);

  const mediaExists = media && media.length > 0;
  const isVideo = mediaExists && media[0].type === 'video';
  // 16:9 only when the real shape is genuinely unknown — every video uploaded
  // or backfilled since carries its own dimensions.
  const videoAspect = (isVideo && feedAspect(media[0].width, media[0].height, 'video')) || 16 / 9;
  const isPortraitVideo = isVideo && videoAspect < PORTRAIT_THRESHOLD;
  const youtubeVideoId = !mediaExists ? findFirstYoutubeVideoId(content) : null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const isAuthor = user && user.id === authorId;

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, startIndex: imageViewerStartIndex });
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  
  useEffect(() => {
    if (emblaApi) {
        emblaApi.scrollTo(imageViewerStartIndex, true); 
    }
  }, [emblaApi, imageViewerStartIndex, isImageViewerOpen]);

  // Which image the viewer is on, for the dots.
  const [viewerIndex, setViewerIndex] = useState(0);
  useEffect(() => {
    if (!emblaApi) return;
    const sync = () => setViewerIndex(emblaApi.selectedScrollSnap());
    sync();
    emblaApi.on('select', sync);
    return () => { emblaApi.off('select', sync); };
  }, [emblaApi, isImageViewerOpen]);

  useEffect(() => {
    // Posts uploaded since poster capture landed already carry a still, so
    // there's no need to download the video and decode a frame in every
    // viewer's browser just to show one.
    if (isVideo && media[0].posterUrl) return;

    if (isVideo && media[0].url && !media[0].url.startsWith('blob:')) {
      const video = document.createElement('video');
      video.crossOrigin = "anonymous";
      video.src = media[0].url;
      video.muted = true;
      video.playsInline = true;

      const onCanPlay = () => {
        video.currentTime = 0.1;
      };

      const onSeeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setVideoThumbnail(canvas.toDataURL('image/jpeg'));
        }
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('seeked', onSeeked);
      };

      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('seeked', onSeeked);

      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('seeked', onSeeked);
      };
    }
  }, [isVideo, media]);
  
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.isIntersecting) {
                videoRef.current?.play().catch(e => {
                    if (e.name !== 'AbortError') console.error("Autoplay failed", e);
                });
            } else {
                videoRef.current?.pause();
            }
        },
        { threshold: 0.5 }
    );

    const currentVideoRef = videoRef.current;
    if (currentVideoRef) observer.observe(currentVideoRef);

    return () => {
      const videoElement = currentVideoRef;
      if (videoElement && document.body.contains(videoElement)) {
          videoElement.pause();
          observer.unobserve(videoElement);
      }
    };
  }, [isVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
        if (video.duration > 0) {
            setVideoProgress((video.currentTime / video.duration) * 100);
        }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      if (video && document.body.contains(video)) {
          video.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [isFeedVideoPlaying]);


  const handleCreateComment = async (data: { text: string; media: any[] }) => {
    if (!user || !id) return null;
    try {
      const success = await addComment(id, data);
      if (success) {
        setCommentCount(prev => prev + 1);
      }
      return success;
    } catch (error) {
        toast({ variant: 'destructive', description: "Failed to post reply." });
        console.error("Failed to add comment:", error);
        return null;
    }
  }


  // Only the standalone post and the open image viewer actually render a
  // follow button. Fetching this unconditionally meant one server round trip
  // per card in the feed for a value nothing displayed — twenty posts, twenty
  // requests, all discarded.
  const needsFollowState = isStandalone || isImageViewerOpen;

  useEffect(() => {
    if (!needsFollowState) return;

    if (user && user.id !== authorId) {
        setFollowLoading(true);
        getIsFollowing(user.id, authorId).then(status => {
            setIsFollowing(status);
            setFollowLoading(false);
        });
    } else {
        setFollowLoading(false);
    }
  }, [user, authorId, needsFollowState]);
  
  const needsTruncation = !isStandalone && !isExpanded && content.length > 280;
  const displayText = needsTruncation ? `${content.substring(0, 280)}` : content;

  // Warm the post's cache entry on hover/touch-start so tapping through
  // usually has data ready before the navigation completes.
  const prefetchPost = () => {
    if (id.startsWith('temp_') || isStandalone || isReplyView) return;
    queryClient.prefetchQuery({
      queryKey: queryKeys.post(id),
      queryFn: () => getPost(id),
      staleTime: 30_000,
    });
  };

  const handlePostClick = () => {
    if (id.startsWith('temp_')) return;

    // Resolved at click time rather than from useIsMobile(), which is
    // undefined until after mount — a click landing before that resolved
    // would fall through to the post page instead of the immersive feed.
    const onMobile = typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : !!isMobile;

    if (isVideo && onMobile) {
      saveScrollPosition();
      router.push(`/video?postId=${id}`);
      return;
    }

    if (!isStandalone && !isReplyView) {
      saveScrollPosition();
      router.push(`/post/${id}`);
    }
  };
  
  const saveScrollPosition = () => {
      try {
        const desktopScrollArea = getFeedScroller();
        if (desktopScrollArea) {
          sessionStorage.setItem('desktopScrollY', String(desktopScrollArea.scrollTop));
        } else {
          sessionStorage.setItem('homeScrollY', String(window.scrollY));
        }
      } catch (e) {
        console.error("Could not save scroll position:", e);
      }
  }

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
        setIsLoginDialogOpen(true);
        return;
    }
    setIsReplyDialogOpen(true);
  };

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
    likePost(id, isLiked);
  };

  const handleRepost = () => {
    setIsReposted(!isReposted);
    setRepostCount(isReposted ? repostCount - 1 : repostCount + 1);
    repostPost(id, !isReposted);
  };

  const handleBookmark = () => {
    bookmarkPost(id, isBookmarked);
    toast({
      description: !isBookmarked ? "Post bookmarked." : "Bookmark removed.",
    });
  };
  
  const handleEditSave = async () => {
    if (editedContent.trim() === content.trim()) {
      setIsEditing(false);
      return;
    }
    try {
      await editPost(id, { text: editedContent });
      toast({ description: "Post updated." });
      setIsEditing(false);
    } catch (error) {
      toast({ variant: 'destructive', description: "Failed to update post." });
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost(id);
      toast({ description: "Post deleted." });
      if (isStandalone) {
        router.push('/home');
      }
    } catch (error) {
      // The generic message hid a database-level failure for a long time: every
      // delete was blocked by a replica-identity problem on `likes`, and the
      // toast said only "Failed to delete post." Surface what actually broke.
      const reason = error instanceof Error ? error.message : String(error);
      console.error('Delete post failed:', error);
      toast({ variant: 'destructive', description: `Couldn't delete that post — ${reason}` });
    }
  };
  
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}/post/${id}`;
    navigator.clipboard.writeText(postUrl);
    toast({ description: "Link copied to clipboard!" });
  };
  
  const getShareUrl = (platform: 'twitter' | 'facebook' | 'whatsapp') => {
    // These hrefs are built during render, which also runs on the server —
    // reaching for window here threw and took the whole post page's SSR with
    // it. On the server the configured site URL is the right origin anyway.
    const origin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
    const postUrl = encodeURIComponent(`${origin}/post/${id}`);
    const text = encodeURIComponent(content);

    switch (platform) {
      case 'twitter':
        return `https://x.com/intent/post?url=${postUrl}&text=${text}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
      case 'whatsapp':
        return `https://api.whatsapp.com/send?text=${text}%20${postUrl}`;
    }
  };

  const openImageViewer = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setImageViewerStartIndex(index);
    setIsImageViewerOpen(true);
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsMuted(prev => !prev);
  }

  // Explicit play/pause. Lives in the control bar rather than on the
  // video body, so tapping the video itself is free to open the
  // immersive feed.
  const handlePlayPauseToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
          video.play().catch(err => {
              if (err.name !== 'AbortError') console.error("Play failed", err);
          });
      } else {
          video.pause();
      }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const handlePlay = () => setIsFeedVideoPlaying(true);
    const handlePause = () => setIsFeedVideoPlaying(false);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    
    return () => {
        if (video && document.body.contains(video)) {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        }
    };
  }, []);

  const imageCount = mediaExists && !isVideo ? media.length : 0;
  
  const singleImage = imageCount === 1;

  const gridClasses = {
    2: 'grid-cols-2 grid-rows-1',
    3: 'grid-cols-2 grid-rows-2',
    4: 'grid-cols-2 grid-rows-2',
  }[imageCount] || '';

  const mainPostContent = (
    <div className={cn("flex space-x-3 md:space-x-4", isReplyView ? 'p-3 md:p-4' : 'p-3 md:p-4')}>
      <div className="flex flex-col items-center">
          <ProfileHoverCard userId={authorId}>
            <Link href={`/profile/${authorId}`} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <Avatar>
                <AvatarImage src={authorAvatar} alt={authorName} data-ai-hint="user avatar" />
                <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
              </Avatar>
            </Link>
          </ProfileHoverCard>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-sm min-w-0">
                    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                      <ProfileHoverCard userId={authorId}>
                        <Link href={`/profile/${authorId}`} className="font-bold hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                            {authorName}
                        </Link>
                      </ProfileHoverCard>
                      <span className="text-muted-foreground truncate">@{authorHandle}</span>
                    </div>
                    <span className="text-muted-foreground flex-shrink-0">·</span>
                    <span className="text-muted-foreground flex-shrink-0">{timestamp}</span>
                </div>
            </div>
           {isAuthor ? (
                <div className="flex-shrink-0 flex">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -my-1.5 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-5 w-5" />
                                <span className="sr-only">More options</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
           ) : user && isStandalone && !isReplyView ? (
                // Standalone view of someone else's post. This used to show
                // only the follow button, leaving no ... menu at all — so
                // report was unreachable on the one screen where you're
                // actually reading a post closely.
                <div className="flex-shrink-0 -mr-2 flex items-center gap-1">
                     <FollowButton
                        profileId={authorId}
                        isFollowing={isFollowing}
                        isLoading={followLoading}
                        onToggleFollow={setIsFollowing}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-5 w-5" />
                                <span className="sr-only">More options</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem>
                                Report post
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
           ) : (
                <div className="flex-shrink-0 flex">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -my-1.5 text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-5 w-5" />
                                <span className="sr-only">More options</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem>
                                Not interested in this post
                            </DropdownMenuItem>
                             <DropdownMenuItem>
                                Unfollow @{authorHandle}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                Report post
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
           )}
        </div>
        
        {isEditing ? (
            <div className="mt-2">
                <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[80px] text-base"
                    autoFocus
                />
                <div className="mt-2 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setIsEditing(false); setEditedContent(content); }}>Cancel</Button>
                    <Button size="sm" onClick={handleEditSave}>Save</Button>
                </div>
            </div>
        ) : (
            <p className={cn("whitespace-pre-wrap text-sm", "mt-0", isStandalone && "text-base")}>
                {linkify(isReplyView ? content : displayText)}
                {needsTruncation && (
                    <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(true);
                    }}
                    className="text-primary hover:underline ml-1"
                    >
                    ...more
                    </button>
                )}
            </p>
        )}

        {youtubeVideoId && <YoutubeEmbed videoId={youtubeVideoId} />}

        {poll && <Poll poll={poll} postId={id} />}

        {/* A vertical video keeps its real shape. It used to sit letterboxed
            inside a 16:9 box with black bars down both sides, because an
            unknown size fell back to landscape. Height is controlled by
            capping it on desktop — which makes the clip narrower and leaves it
            against the left of the column, the way X does it — while a phone
            gets it full width and properly vertical, since the screen is
            already that shape. */}
        {mediaExists && (
          <div
            className={cn(
              "mt-3 rounded-2xl overflow-hidden border",
              isVideo && 'relative bg-black flex items-center justify-center cursor-pointer group/video',
              isVideo && (isPortraitVideo ? 'w-full md:h-[560px] md:w-auto md:max-w-full' : 'w-full')
            )}
            style={isVideo ? { aspectRatio: String(videoAspect) } : undefined}
            onClick={handlePostClick}
          >
            {isVideo && media[0].url ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    src={media[0].url}
                    poster={media[0].posterUrl || videoThumbnail || ''}
                    // The poster is what the feed actually shows until someone
                    // presses play, so there is no reason for every video on
                    // screen to start pulling its own metadata on render.
                    preload="none"
                    className="w-full h-full object-contain bg-black"
                    playsInline
                    loop
                  />
                  {/* Play/pause and mute sit together in a bar at the
                      bottom, so the video body itself stays tappable for
                      opening the immersive feed. */}
                  <div className="absolute bottom-3 left-2 z-10 flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/75 text-white hover:text-white" onClick={handlePlayPauseToggle}>
                           {isFeedVideoPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/75 text-white hover:text-white" onClick={handleMuteToggle}>
                           {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                  </div>
                  {/* Desktop-only hover affordance. It was previously shown
                      on mobile too, where there's no real hover — a tap left
                      the state stuck, which is why the play icon appeared to
                      be permanently on top of the video. */}
                  <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none opacity-0 group-hover/video:opacity-100 transition-opacity">
                      {isFeedVideoPlaying ? <Pause className="h-12 w-12 text-white/70 drop-shadow-lg" fill="currentColor" /> : <Play className="h-12 w-12 text-white/70 drop-shadow-lg" fill="currentColor" />}
                  </div>
                  {isFeedVideoPlaying && (
                    <div
                      ref={progressRef}
                      className="absolute bottom-0 left-0 right-0 h-1.5 cursor-pointer"
                      onClick={handleSeek}
                    >
                        <Progress value={videoProgress} className="h-full rounded-none" />
                    </div>
                  )}
              </div>
            ) : singleImage && media[0].url ? (
              // Clamped by aspect rather than a pixel height, so the slot is
              // the same shape on every screen. A very tall photo is cropped
              // to 4:5 here and shown whole in the viewer on tap — the old
              // max-h-[500px] with object-contain letterboxed it into black
              // bars instead, which looked broken rather than deliberate.
              <div
                  className="relative w-full bg-black cursor-pointer overflow-hidden"
                  style={
                    feedAspect(media[0].width, media[0].height) !== null
                      ? { aspectRatio: String(feedAspect(media[0].width, media[0].height)) }
                      : { maxHeight: 500 }
                  }
                  onClick={(e) => { if (isStandalone) { openImageViewer(e, 0); } else { e.stopPropagation(); handlePostClick(); } }}
              >
                  <Image
                      src={media[0].url}
                      alt={media[0].hint || `Post image 1`}
                      width={media[0].width || 500}
                      height={media[0].height || 500}
                      className={cn(
                        'w-full',
                        // Known shape: fill the clamped box. Unknown: never
                        // crop, since we cannot tell what would be lost.
                        feedAspect(media[0].width, media[0].height) !== null
                          ? 'h-full object-cover'
                          : 'h-auto max-h-[500px] object-contain'
                      )}
                      data-ai-hint={media[0].hint}
                  />
              </div>
            ) : imageCount > 1 ? (
              <div className={cn("grid h-full gap-0.5 aspect-video", gridClasses)}>
                {media.map((item, index) => (
                   item.url && <div 
                      key={index} 
                      className={cn("relative cursor-pointer", imageCount === 3 && index === 0 && "row-span-2")}
                      onClick={(e) => { if (isStandalone) { openImageViewer(e, index); } else { e.stopPropagation(); handlePostClick(); } }}
                  >
                    <Image
                      src={item.url}
                      alt={item.hint || `Post image ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 300px"
                      className="object-cover"
                      data-ai-hint={item.hint}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {isStandalone && !isReplyView && createdAt && (
             <div className="mt-4 text-sm text-muted-foreground">
                 <span>{formatDetailedTimestamp(new Date(createdAt))}</span>
                 {views ? (
                    <>
                        <span className="mx-1">·</span>
                        <span className="font-bold text-foreground">{views.toLocaleString()}</span> Views
                    </>
                 ) : null}
            </div>
        )}
        
        {!isReplyView && (
             <div className={cn("flex items-center text-muted-foreground", isStandalone ? "mt-2" : "mt-4")}>
                <div className="flex items-center -ml-3">
                    <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:text-primary" onClick={handleCommentClick}>
                        <MessageCircle className="h-5 w-5" />
                        <span>{commentCount > 0 ? commentCount : ''}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className={cn("flex items-center gap-2", isReposted ? 'text-green-500' : 'hover:text-green-500')} onClick={handleActionClick(handleRepost)}>
                        <Repeat className="h-5 w-5" />
                        <span>{repostCount > 0 ? repostCount : ''}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className={cn("flex items-center gap-2", isLiked ? 'text-red-500' : 'hover:text-red-500')} onClick={handleActionClick(handleLike)}>
                        <Heart className={cn("h-5 w-5", isLiked && 'fill-current')} />
                        <span>{likeCount > 0 ? likeCount : ''}</span>
                    </Button>
                    <Button variant="ghost" size="icon" className={cn("hover:text-primary", isBookmarked && "text-primary")} onClick={handleActionClick(handleBookmark)}>
                        <Bookmark className={cn("h-5 w-5", isBookmarked && 'fill-current')} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Ask BHOLO AI about this post"
                        className="hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); setIsAskAiOpen(true); }}
                    >
                        <Sparkles className="h-5 w-5" />
                    </Button>
                     <Sheet open={isShareSheetOpen} onOpenChange={setShareSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                <Share2 className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="rounded-t-lg" onClick={(e) => e.stopPropagation()}>
                            <SheetHeader>
                                <SheetTitle>Share Post</SheetTitle>
                            </SheetHeader>
                            <div className="grid grid-cols-4 gap-4 py-4">
                                <a href={getShareUrl('twitter')} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-center group">
                                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent">
                                        <XIcon className="h-7 w-7" />
                                    </div>
                                    <span className="text-xs">X</span>
                                </a>
                                <a href={getShareUrl('facebook')} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-center group">
                                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent">
                                        <FacebookIcon className="h-7 w-7" />
                                    </div>
                                    <span className="text-xs">Facebook</span>
                                </a>
                                <a href={getShareUrl('whatsapp')} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-center group">
                                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent">
                                        <WhatsAppIcon className="h-7 w-7" />
                                    </div>
                                    <span className="text-xs">WhatsApp</span>
                                </a>
                                <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 text-center group">
                                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent">
                                        <Copy className="h-7 w-7" />
                                    </div>
                                    <span className="text-xs">Copy Link</span>
                                </button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        )}
        
         {isReplyView && parentPostId && (
            <CommentEngagement 
                parentPostId={parentPostId} 
                commentId={id} 
                initialLikes={initialLikes} 
                onReplyClick={handleCommentClick}
            />
        )}
      </div>
    </div>
  );

  return (
      <div
        className={cn(!isStandalone && !isReplyView && 'cursor-pointer hover:bg-accent/20')}
        onClick={handlePostClick}
        onPointerEnter={prefetchPost}
        onTouchStart={prefetchPost}
        data-post-id={id}
      >
          {mainPostContent}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent onClick={e => e.stopPropagation()}>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your post.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                          className={buttonVariants({ variant: "destructive" })}
                          onClick={handleDelete}
                      >
                          Delete
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
          <ReplyDialog post={props} onReply={handleCreateComment} open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen} />
           <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
                <DialogContent
                    className={cn(
                        "max-w-none w-screen h-[100dvh] bg-black border-none shadow-none p-0 flex flex-col md:flex-row",
                        // DialogContent always renders its own close button. On a
                        // phone that put an X in one corner and our back chevron in
                        // the other — two controls for one job. It is the only
                        // direct child button here, so this hides it on mobile and
                        // leaves the desktop viewer, which has no back control, as
                        // it was.
                        "[&>button]:hidden md:[&>button]:block"
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    <DialogTitle className="sr-only">Image Viewer</DialogTitle>

                    <div className="flex-1 flex flex-col min-h-0 md:h-full relative">
                        {/* One row on a solid bar, above the picture rather than
                            over it: back, author, follow. The old header floated
                            two rows of controls on a gradient across the top of
                            the image, so the thing you tapped to look at opened
                            with its top third covered. */}
                        <div className="md:hidden flex shrink-0 items-center gap-3 bg-black px-1 py-2">
                            <DialogClose asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-white hover:bg-white/10 hover:text-white">
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                            </DialogClose>

                            <Link
                                href={`/profile/${authorId}`}
                                className="flex min-w-0 flex-1 items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarImage src={authorAvatar} alt={authorName} />
                                    <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 leading-tight">
                                    <p className="truncate text-sm font-bold text-white">{authorName}</p>
                                    <p className="truncate text-xs text-neutral-400">@{authorHandle}</p>
                                </div>
                            </Link>

                            {!isAuthor && user && (
                                <FollowButton
                                    profileId={authorId}
                                    isFollowing={isFollowing}
                                    isLoading={followLoading}
                                    onToggleFollow={setIsFollowing}
                                />
                            )}
                        </div>

                        <div className="relative flex-1 min-h-0 w-full group/viewer">
                            <div className="overflow-hidden w-full h-full" ref={emblaRef}>
                                <div className="flex h-full">
                                    {media?.filter(m => m.type === 'image').map((image, index) => (
                                        <div key={index} className="flex-[0_0_100%] min-w-0 relative">
                                            <Image
                                                src={image.url}
                                                alt={`Enlarged view of post image ${index + 1}`}
                                                width={image.width || 1200}
                                                height={image.height || 1200}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Desktop only. On a phone the carousel already
                                swipes, so these sat on top of the picture
                                competing with the thing you opened it to look
                                at. A mouse has no swipe, so they stay where
                                there is no other way through. */}
                            {imageCount > 1 && (
                                <>
                                    <Button variant="ghost" size="icon" className="hidden md:inline-flex absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white h-10 w-10 bg-black/30 hover:bg-black/50 hover:text-white rounded-full opacity-50 group-hover/viewer:opacity-100 transition-opacity" onClick={scrollPrev}>
                                        <ChevronLeft className="h-6 w-6"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="hidden md:inline-flex absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white h-10 w-10 bg-black/30 hover:bg-black/50 hover:text-white rounded-full opacity-50 group-hover/viewer:opacity-100 transition-opacity" onClick={scrollNext}>
                                        <ChevronRight className="h-6 w-6"/>
                                    </Button>

                                    {/* Says there is more than one picture, and
                                        which one you are on — the only thing
                                        the removed arrows were still doing on a
                                        phone. Not buttons: at this size they
                                        would be a smaller tap target than the
                                        swipe they replace. */}
                                    <div
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-sm"
                                        aria-hidden
                                    >
                                        {media?.filter(m => m.type === 'image').map((_, index) => (
                                            <span
                                                key={index}
                                                className={cn(
                                                    'h-1.5 w-1.5 rounded-full transition-colors',
                                                    index === viewerIndex ? 'bg-white' : 'bg-white/40'
                                                )}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* The counts and the reply box, on black, under the
                            picture — the whole of the mobile chrome. What used to
                            sit here was the desktop side panel folded into a 40vh
                            drawer: caption, buttons, a reply composer with five
                            coloured icons and a filled Reply button, and the entire
                            comment thread, all competing under the image.

                            X shows the photo, one muted row of counts, and a reply
                            field. Reading the thread is what the post page is for,
                            and every icon here still leads there. */}
                        <div className="md:hidden shrink-0 bg-black">
                            <div className="flex items-center justify-between px-3 py-2 text-neutral-400">
                                <button onClick={handleCommentClick} className="flex items-center gap-1.5 py-1.5 text-[13px] transition-colors hover:text-primary">
                                    <MessageCircle className="h-[18px] w-[18px]" />
                                    {formatCount(commentCount)}
                                </button>
                                <button onClick={handleActionClick(handleRepost)} className={cn("flex items-center gap-1.5 py-1.5 text-[13px] transition-colors", isReposted ? 'text-green-500' : 'hover:text-green-500')}>
                                    <Repeat className="h-[18px] w-[18px]" />
                                    {formatCount(repostCount)}
                                </button>
                                <button onClick={handleActionClick(handleLike)} className={cn("flex items-center gap-1.5 py-1.5 text-[13px] transition-colors", isLiked ? 'text-red-500' : 'hover:text-red-500')}>
                                    <Heart className={cn("h-[18px] w-[18px]", isLiked && 'fill-current')} />
                                    {formatCount(likeCount)}
                                </button>
                                {!!views && (
                                    <span className="flex items-center gap-1.5 py-1.5 text-[13px]">
                                        <BarChart3 className="h-[18px] w-[18px]" />
                                        {formatCount(views)}
                                    </span>
                                )}
                                <button onClick={handleActionClick(handleBookmark)} className={cn("py-1.5 transition-colors", isBookmarked ? 'text-primary' : 'hover:text-primary')}>
                                    <Bookmark className={cn("h-[18px] w-[18px]", isBookmarked && 'fill-current')} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setViewerShareOpen(true); }} className="py-1.5 transition-colors hover:text-primary">
                                    <Share2 className="h-[18px] w-[18px]" />
                                </button>
                            </div>

                            {/* One field, with the controls inside it — X puts the
                                photo, GIF and expand icons in the pill rather than
                                loose on the bar beside a smaller box.

                                Each one opens the composer already on the picker it
                                names. They used to all open an empty text box, so
                                tapping the GIF icon looked like it had done nothing. */}
                            <div className="flex items-center gap-2 border-t border-neutral-800 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                                <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarImage src={user?.user_metadata?.avatar_url} alt="" />
                                    <AvatarFallback>{(user?.email ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>

                                <div className="flex min-w-0 flex-1 items-center gap-0.5 rounded-full bg-neutral-900 py-1 pl-4 pr-1.5">
                                    <button
                                        onClick={handleCommentClick}
                                        className="min-w-0 flex-1 truncate py-1.5 text-left text-sm text-neutral-500"
                                    >
                                        Post your reply
                                    </button>
                                    <button onClick={handleCommentClick} className="shrink-0 rounded-full p-1.5 text-neutral-400" aria-label="Open the full reply composer">
                                        <Maximize2 className="h-[18px] w-[18px]" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside className="hidden md:flex w-full md:w-[380px] md:h-full bg-background flex-col overflow-y-hidden flex-shrink-0 md:max-h-full">
                        <div className="flex-1 flex flex-col min-h-0">
                            <ScrollArea className="flex-1">
                                <div className="p-3 md:p-4">
                                     <div className="hidden md:flex items-center gap-3">
                                        <Link href={`/profile/${authorId}`} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <Avatar>
                                                <AvatarImage src={authorAvatar} alt={authorName} data-ai-hint="user avatar" />
                                                <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </Link>
                                        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
                                            <Link href={`/profile/${authorId}`} className="font-bold hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                                                {authorName}
                                            </Link>
                                            <span className="text-sm text-muted-foreground truncate flex-shrink-0">@{authorHandle}</span>
                                        </div>
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm">{linkify(content)}</p>
                                </div>
                                <div className="border-t px-3 md:px-4 py-2 flex items-center justify-around text-muted-foreground">
                                    <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:text-primary" onClick={handleCommentClick}>
                                        <MessageCircle className="h-5 w-5" />
                                        <span>{commentCount > 0 ? commentCount : ''}</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className={cn("flex items-center gap-2", isReposted ? 'text-green-500' : 'hover:text-green-500')} onClick={handleActionClick(handleRepost)}>
                                        <Repeat className="h-5 w-5" />
                                        <span>{repostCount > 0 ? repostCount : ''}</span>
                                    </Button>
                                    <Button variant="ghost" size="sm" className={cn("flex items-center gap-2", isLiked ? 'text-red-500' : 'hover:text-red-500')} onClick={handleActionClick(handleLike)}>
                                        <Heart className={cn("h-5 w-5", isLiked && 'fill-current')} />
                                        <span>{likeCount > 0 ? likeCount : ''}</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className={cn("hover:text-primary", isBookmarked && "text-primary")} onClick={handleActionClick(handleBookmark)}>
                                        <Bookmark className={cn("h-5 w-5", isBookmarked && 'fill-current')} />
                                    </Button>
                                    <Sheet open={isViewerShareOpen} onOpenChange={setViewerShareOpen}>
                                        <SheetTrigger asChild>
                                            <Button variant="ghost" size="icon" className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                                <Share2 className="h-5 w-5" />
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="bottom" className="rounded-t-lg" onClick={(e) => e.stopPropagation()}>
                                            <SheetHeader>
                                                <SheetTitle>Share Post</SheetTitle>
                                            </SheetHeader>
                                            <div className="grid grid-cols-4 gap-4 py-4">
                                                <a href={getShareUrl('twitter')} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-center group">
                                                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent">
                                                        <XIcon className="h-7 w-7" />
                                                    </div>
                                                    <span className="text-xs">X</span>
                                                </a>
                                                <a href={getShareUrl('facebook')} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-center group">
                                                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent">
                                                        <FacebookIcon className="h-7 w-7" />
                                                    </div>
                                                    <span className="text-xs">Facebook</span>
                                                </a>
                                                <a href={getShareUrl('whatsapp')} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 text-center group">
                                                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent">
                                                        <WhatsAppIcon className="h-7 w-7" />
                                                    </div>
                                                    <span className="text-xs">WhatsApp</span>
                                                </a>
                                                <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 text-center group">
                                                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center group-hover:bg-accent">
                                                        <Copy className="h-7 w-7" />
                                                    </div>
                                                    <span className="text-xs">Copy Link</span>
                                                </button>
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>

                                <div className="border-t">
                                     <CreateComment onComment={handleCreateComment} isDialog={true} />
                                </div>
                                <div className="divide-y divide-border border-t">
                                    {loadingComments ? (
                                        Array.from({length: 3}).map((_, i) => <CommentSkeleton key={i} />)
                                    ) : comments.length > 0 ? (
                                        comments.map((comment) => <Post key={`comment-${comment.id}`} {...comment} isReplyView={true} parentPostId={id}/>)
                                    ) : (
                                        <p className="p-8 text-center text-muted-foreground text-sm">No comments yet.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </aside>
                </DialogContent>
            </Dialog>
            <LoginOrSignupDialog isOpen={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen} />
            <AskAiDialog
                open={isAskAiOpen}
                onOpenChange={setIsAskAiOpen}
                postContent={content}
                postAuthor={authorHandle}
            />
      </div>
  );
}

/**
 * The feed renders fifty of these, and the post objects it maps over are
 * stable between renders — so without memo, any context change (a like
 * landing, the new-posts buffer ticking over) re-rendered every card in the
 * list along with it.
 */
export const Post = memo(PostComponent);
