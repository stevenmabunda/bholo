
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { MessageCircle, Repeat, Heart, Share2, MoreHorizontal, Edit, Trash2, Bookmark, Copy, X, ChevronLeft, ChevronRight, Check, Play, Pause, Volume2, VolumeX, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useMemo, useRef, useEffect, useCallback, memo } from "react";
import { cn, linkify, formatDetailedTimestamp } from "@/lib/utils";
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
import { CreateComment } from "./create-comment";
import { Skeleton } from "./ui/skeleton";
import { LoginOrSignupDialog } from "./login-or-signup-dialog";
import { ProfileHoverCard } from "./profile-hover-card";
import { AskAiDialog } from "./ask-ai-dialog";
import { useTabContext } from "@/contexts/tab-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { siteUrl } from "@/lib/site";
import { XIcon, FacebookIcon, WhatsAppIcon } from "@/components/icons";
import { feedAspect, PORTRAIT_THRESHOLD } from "@/lib/media-aspect";
import { saveScrollPosition as savePosition } from "@/lib/scroll-position";


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
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);


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


  // Only the standalone post renders a follow button. Fetching this
  // unconditionally meant one server round trip per card in the feed for a
  // value nothing displayed — twenty posts, twenty requests, all discarded.
  const needsFollowState = isStandalone;

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
  
  // Keyed by the page being left, so a post opened from a profile comes back
  // to that profile rather than to wherever the feed happened to be.
  const saveScrollPosition = () => savePosition();

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

  /**
   * The photo has its own address now, so this is a navigation rather than a
   * piece of local state. That is what makes the phone's back button close it,
   * and what lets a photo be linked to.
   */
  const openImageViewer = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    saveScrollPosition();
    router.push(`/post/${id}/photo/${index}`);
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

  // Several pictures ride in a strip you scroll, so the arrows need to reach it.
  const stripRef = useRef<HTMLDivElement>(null);
  const nudgeStrip = (direction: -1 | 1) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

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
              "mt-3 rounded-2xl overflow-hidden",
              // A single photo draws its own edge, so the outline was just a
              // line around a picture. Video keeps it, because a clip that
              // letterboxes needs something to say where it ends, and so does
              // the photo strip, whose cells meet at a seam.
              !singleImage && "border",
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
              // Two behaviours, because the two screens have different problems.
              //
              // On a phone the column is narrow, a photo clamped to 4:5 lands
              // around 469px, and filling the width is what makes it feel like
              // a phone app. That is what mobile does, unchanged.
              //
              // Desktop is wider, so the same ratio ran to 665px and one photo
              // took most of the screen. There the height is capped instead and
              // the picture keeps every pixel, coming out narrower than the
              // column and sitting against its left edge — the treatment tall
              // video already gets here.
              <div
                  className={cn(
                    "relative w-full bg-black cursor-pointer overflow-hidden",
                    // Inline styles beat classes, so the ratio has to be turned
                    // off with force before the height cap can take over.
                    "md:!aspect-auto md:max-h-[500px]"
                  )}
                  style={
                    feedAspect(media[0].width, media[0].height) !== null
                      ? { aspectRatio: String(feedAspect(media[0].width, media[0].height)) }
                      : { maxHeight: 500 }
                  }
                  onClick={(e) => openImageViewer(e, 0)}
              >
                  <Image
                      src={media[0].url}
                      alt={media[0].hint || `Post image 1`}
                      width={media[0].width || 500}
                      height={media[0].height || 500}
                      sizes="(max-width: 768px) 100vw, 532px"
                      className={cn(
                        'w-full',
                        // Known shape: fill the clamped box. Unknown: never
                        // crop, since we cannot tell what would be lost.
                        feedAspect(media[0].width, media[0].height) !== null
                          ? 'h-full object-cover'
                          : 'h-auto max-h-[500px] object-contain',
                        // Desktop: fill the column, stop at the cap, crop
                        // nothing.
                        //
                        // w-auto was wrong here. It renders a picture at its own
                        // pixel size, so a 650px-wide photo sat at 650px in a
                        // wider column with a gap beside it — small and adrift,
                        // rather than a photo that fills its slot. w-full scales
                        // it to the column the way X does; the cap then holds
                        // back anything tall enough to run away, and what is
                        // held back is pinned left rather than centred.
                        'md:h-auto md:w-full md:max-h-[500px] md:object-contain md:object-left'
                      )}
                      data-ai-hint={media[0].hint}
                  />
              </div>
            ) : imageCount > 1 ? (
              /* Two at a time, sharing the width, scrolling to the rest.
                 The old grid crammed every picture into one fixed block, and
                 giving each its natural width instead just handed the whole
                 card to the first one. X splits the space: two photos side by
                 side with a seam between them, and more arrive by scrolling.
                 Tapping one still opens it. */
              <div className="group/strip relative aspect-[4/3]">
                <div
                  ref={stripRef}
                  className="no-scrollbar flex h-full snap-x snap-mandatory gap-0.5 overflow-x-auto overscroll-x-contain"
                  onClick={(e) => e.stopPropagation()}
                >
                  {media.map((item, index) => (
                    item.url && (
                      <button
                        key={index}
                        type="button"
                        /* Half the width each, so a pair shares the space
                           evenly and a third is a scroll away rather than a
                           squeeze. */
                        className="relative h-full w-[calc(50%-1px)] shrink-0 snap-start cursor-pointer bg-black"
                        onClick={(e) => openImageViewer(e, index)}
                        aria-label={`Open image ${index + 1} of ${imageCount}`}
                      >
                        <Image
                          src={item.url}
                          alt={item.hint || `Post image ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 45vw, 300px"
                          className="object-cover"
                          data-ai-hint={item.hint}
                        />
                      </button>
                    )
                  ))}
                </div>

                {/* A mouse has no swipe. These stay out of the way until the
                    card is hovered, the way the viewer's arrows do. */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nudgeStrip(-1)}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 hover:text-white group-hover/strip:opacity-100 md:inline-flex"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nudgeStrip(1)}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 hover:text-white group-hover/strip:opacity-100 md:inline-flex"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {/* Only worth saying when there is something you cannot
                    already see — with two, both are on screen. */}
                {imageCount > 2 && (
                  <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm md:group-hover/strip:opacity-0">
                    {imageCount} photos
                  </span>
                )}
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
