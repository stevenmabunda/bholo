'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useEmblaCarousel from 'embla-carousel-react';
import {
  MessageCircle, Repeat, Heart, Bookmark, Share2, Copy,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChart3, Maximize2, X,
} from 'lucide-react';

import type { PostType } from '@/lib/data';
import { cn, linkify } from '@/lib/utils';
import { siteUrl } from '@/lib/site';
import { usePosts } from '@/contexts/post-context';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getIsFollowing } from '@/app/(app)/profile/actions';
import { useLiveComments } from '@/hooks/use-live-comments';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatTimestamp } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CreateComment } from '@/components/create-comment';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FollowButton } from '@/components/follow-button';
import { CommentEngagement } from '@/components/post';
import { LoginOrSignupDialog } from '@/components/login-or-signup-dialog';
import { XIcon, FacebookIcon, WhatsAppIcon } from '@/components/icons';

/** 3.9K, 400K — the way X writes counts once they stop fitting. */
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
function formatCount(n?: number): string {
  if (!n) return '';
  return n < 1000 ? String(n) : compact.format(n);
}

/**
 * A post's pictures, full screen, at their own address.
 *
 * This used to be a dialog living inside the post card, which meant it could
 * only be reached from a post page and the phone's back button knew nothing
 * about it. It is a route now: tapping a photo in the feed overlays it with the
 * feed still mounted behind, back closes it, and the URL can be shared.
 */
export function PhotoViewer({ post, startIndex }: { post: PostType; startIndex: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { likePost, repostPost, bookmarkPost, addComment, likedPostIds, bookmarkedPostIds, repostedPostIds } = usePosts();

  const images = useMemo(() => (post.media ?? []).filter(m => m.type === 'image'), [post.media]);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, startIndex });
  const [index, setIndex] = useState(startIndex);

  const [likeCount, setLikeCount] = useState(post.likes);
  // The count comes from the server row, so a reply sent from here left it
  // reading the old number until the page was fetched again.
  const [commentCount, setCommentCount] = useState(post.comments);
  const [repostCount, setRepostCount] = useState(post.reposts);
  const [repostedOverride, setRepostedOverride] = useState<boolean | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(true);
  const [isShareOpen, setShareOpen] = useState(false);
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [isReplyOpen, setReplyOpen] = useState(false);
  /**
   * Whether the desktop side panel is showing.
   *
   * The toggle sits opposite the close control, the way X has it: close on the
   * left of the picture, collapse on the right. Collapsed, the picture takes
   * the whole window.
   */
  const [panelOpen, setPanelOpen] = useState(true);
  /**
   * Whether the conversation is showing.
   *
   * Two states, not a free drag: the photo has the screen, or the photo pulls
   * back and the replies sit under it. On desktop the side panel shows them
   * always, so this only governs the phone.
   */
  const [showComments, setShowComments] = useState(false);

  // Nothing is subscribed until someone asks to read the thread — most photos
  // are looked at and left.
  const isDesktop = useIsMobile() === false;
  const wantsComments = showComments || isDesktop;
  const { comments, loading: commentsLoading } = useLiveComments(wantsComments ? post.id : null);

  const isLiked = likedPostIds.has(post.id);
  const isReposted = repostedOverride ?? repostedPostIds.has(post.id);
  const isBookmarked = bookmarkedPostIds.has(post.id);
  const isAuthor = !!user && user.id === post.authorId;

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    let cancelled = false;
    if (!user || isAuthor) { setFollowLoading(false); return; }
    getIsFollowing(user.id, post.authorId)
      .then(following => { if (!cancelled) setIsFollowing(following); })
      .finally(() => { if (!cancelled) setFollowLoading(false); });
    return () => { cancelled = true; };
  }, [user, isAuthor, post.authorId]);

  /**
   * Back if there is somewhere to go back to, the post otherwise.
   *
   * A photo opened from the feed has history behind it; one opened from a
   * shared link does not, and sending that person backwards would take them
   * out of the app.
   */
  const close = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.replace(`/post/${post.id}`);
  }, [router, post.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const requireUser = (action: () => void) => () => {
    if (!user) { setLoginOpen(true); return; }
    action();
  };

  const handleLike = requireUser(() => {
    setLikeCount(prev => prev + (isLiked ? -1 : 1));
    likePost(post.id, isLiked);
  });

  const handleRepost = requireUser(() => {
    const next = !isReposted;
    setRepostedOverride(next);
    setRepostCount(prev => Math.max(prev + (next ? 1 : -1), 0));
    repostPost(post.id, isReposted);
  });

  const handleBookmark = requireUser(() => {
    bookmarkPost(post.id, isBookmarked);
    toast({ description: !isBookmarked ? 'Post bookmarked.' : 'Bookmark removed.' });
  });

  const openReply = () => {
    if (!user) { setLoginOpen(true); return; }
    setReplyOpen(true);
  };

  const submitReply = async (data: { text: string; media: any[] }) => {
    try {
      const ok = await addComment(post.id, data);
      if (ok) {
        setReplyOpen(false);
        setCommentCount(prev => prev + 1);
        // Straight into the thread, so the reply is visible rather than
        // announced. It arrives over realtime on its own.
        setShowComments(true);
        return true;
      }
      return null;
    } catch {
      toast({ variant: 'destructive', description: 'Failed to send reply.' });
      return null;
    }
  };

  const postUrl = `${siteUrl}/post/${post.id}`;
  const shareText = `Check out this post on BHOLO: "${post.content.slice(0, 80)}${post.content.length > 80 ? '…' : ''}"`;
  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${postUrl}`)}`,
  };
  const copyLink = () => {
    navigator.clipboard.writeText(postUrl);
    toast({ description: 'Link copied to clipboard.' });
    setShareOpen(false);
  };

  const counts = (
    <>
      <button
        onClick={() => setShowComments(v => !v)}
        className={cn('flex items-center gap-1.5 py-1.5 text-[13px] transition-colors', showComments ? 'text-primary' : 'hover:text-primary')}
      >
        <MessageCircle className="h-[18px] w-[18px]" />
        {formatCount(commentCount)}
      </button>
      <button onClick={handleRepost} className={cn('flex items-center gap-1.5 py-1.5 text-[13px] transition-colors', isReposted ? 'text-green-500' : 'hover:text-green-500')}>
        <Repeat className="h-[18px] w-[18px]" />
        {formatCount(repostCount)}
      </button>
      <button onClick={handleLike} className={cn('flex items-center gap-1.5 py-1.5 text-[13px] transition-colors', isLiked ? 'text-red-500' : 'hover:text-red-500')}>
        <Heart className={cn('h-[18px] w-[18px]', isLiked && 'fill-current')} />
        {formatCount(likeCount)}
      </button>
      {!!post.views && (
        <span className="flex items-center gap-1.5 py-1.5 text-[13px]">
          <BarChart3 className="h-[18px] w-[18px]" />
          {formatCount(post.views)}
        </span>
      )}
      <button onClick={handleBookmark} className={cn('py-1.5 transition-colors', isBookmarked ? 'text-primary' : 'hover:text-primary')}>
        <Bookmark className={cn('h-[18px] w-[18px]', isBookmarked && 'fill-current')} />
      </button>
      <button onClick={() => setShareOpen(true)} className="py-1.5 transition-colors hover:text-primary">
        <Share2 className="h-[18px] w-[18px]" />
      </button>
    </>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-50 flex flex-col bg-black md:flex-row"
    >
      <div className="relative flex min-h-0 flex-1 flex-col md:h-full">
        {/* One row on a solid bar, above the picture rather than over it. */}
        <div className="flex shrink-0 items-center gap-3 bg-black px-1 py-2 md:hidden">
          <Button variant="ghost" size="icon" onClick={close} className="h-10 w-10 shrink-0 text-white hover:bg-white/10 hover:text-white" aria-label="Back">
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Link href={`/profile/${post.authorId}`} className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={post.authorAvatar} alt={post.authorName} />
              <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-white">{post.authorName}</p>
              <p className="truncate text-xs text-neutral-400">@{post.authorHandle}</p>
            </div>
          </Link>

          {!isAuthor && user && (
            <FollowButton profileId={post.authorId} isFollowing={isFollowing} isLoading={followLoading} onToggleFollow={setIsFollowing} />
          )}
        </div>

        {/* Desktop has no back bar, so it keeps controls of its own: close on
            the left, panel toggle on the right, as X arranges them. */}
        <Button variant="ghost" size="icon" onClick={close} className="absolute left-4 top-4 z-20 hidden h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white md:inline-flex" aria-label="Close">
          <X className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPanelOpen(v => !v)}
          className="absolute right-4 top-4 z-20 hidden h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white md:inline-flex"
          aria-label={panelOpen ? 'Hide replies' : 'Show replies'}
          aria-expanded={panelOpen}
        >
          {panelOpen ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
        </Button>

        {/* With the replies open, the photo and the thread become one surface
            that scrolls together — the photo rides up out of the way as you
            read, rather than staying pinned while text slides underneath it.
            That pinned version worked but felt like two panes bolted together;
            this is how X does it.

            `contents` keeps this wrapper out of the layout whenever it is not
            the scroller — closed on a phone, and always on desktop, where the
            photo is a flex child and the replies live in the side panel. */}
        <div
          className={cn(
            showComments ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain md:contents' : 'contents'
          )}
        >
        <div
          className={cn(
            'group/viewer relative w-full',
            // Pulled back, but only a little: most of the picture stays with
            // you, and the first replies sit just under it.
            showComments ? 'h-[60vh] shrink-0 md:h-auto md:flex-1' : 'min-h-0 flex-1'
          )}
        >
          <div className="h-full w-full overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {images.map((image, i) => (
                <div key={i} className="relative min-w-0 flex-[0_0_100%]">
                  <Image
                    src={image.url}
                    alt={`Image ${i + 1} of ${images.length}`}
                    width={image.width || 1200}
                    height={image.height || 1200}
                    className="h-full w-full object-contain"
                    priority={i === startIndex}
                  />
                </div>
              ))}
            </div>
          </div>

          {images.length > 1 && (
            <>
              {/* Desktop only: a mouse has no swipe. */}
              <Button variant="ghost" size="icon" onClick={() => emblaApi?.scrollPrev()} className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-black/30 text-white opacity-50 transition-opacity hover:bg-black/50 hover:text-white group-hover/viewer:opacity-100 md:left-4 md:inline-flex">
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => emblaApi?.scrollNext()} className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-black/30 text-white opacity-50 transition-opacity hover:bg-black/50 hover:text-white group-hover/viewer:opacity-100 md:right-4 md:inline-flex">
                <ChevronRight className="h-6 w-6" />
              </Button>

              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-sm" aria-hidden>
                {images.map((_, i) => (
                  <span key={i} className={cn('h-1.5 w-1.5 rounded-full transition-colors', i === index ? 'bg-white' : 'bg-white/40')} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* The conversation, revealed under the photo. The caption comes back
            here — it belongs with the replies, not over the picture. It does
            not scroll on its own; the wrapper above scrolls both. */}
        {showComments && (
          <div className="bg-black md:hidden">
            <div className="border-b border-neutral-800 px-4 py-3">
              <p className="whitespace-pre-wrap text-sm text-white">{linkify(post.content)}</p>
            </div>

            {commentsLoading ? (
              <p className="p-6 text-center text-sm text-neutral-500">Loading replies…</p>
            ) : comments.length === 0 ? (
              <p className="p-6 text-center text-sm text-neutral-500">No replies yet.</p>
            ) : (
              comments.map(c => (
                <article key={c.id} className="flex gap-3 border-b border-neutral-800 px-4 py-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={c.authorAvatar} alt={c.authorName} />
                    <AvatarFallback>{c.authorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-bold text-white">{c.authorName}</span>{' '}
                      <span className="text-neutral-500">@{c.authorHandle} · {formatTimestamp(new Date(c.createdAt))}</span>
                    </p>
                    {c.content && <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-200">{linkify(c.content)}</p>}
                    {c.media?.length > 0 && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-neutral-800">
                        {c.media[0].type === 'video' ? (
                          <video src={c.media[0].url ?? ''} className="max-h-64 w-auto" controls playsInline />
                        ) : (
                          // GIFs and stickers are remote Giphy URLs of unknown
                          // size, so this is a plain img rather than next/image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.media[0].url ?? ''} alt="" className="max-h-64 w-auto object-contain" />
                        )}
                      </div>
                    )}

                    {/* The same row a reply gets on the post page. Without it
                        this was a thread you could read and not answer. */}
                    <CommentEngagement
                      parentPostId={post.id}
                      commentId={c.id}
                      initialLikes={c.likes}
                      initialReposts={c.reposts}
                      onReplyClick={openReply}
                    />
                  </div>
                </article>
              ))
            )}
          </div>
        )}
        </div>

        {/* Mobile chrome: counts, then the reply field. Pinned under whichever
            of the two states is showing — it never scrolls away. */}
        <div className="shrink-0 bg-black md:hidden">
          <div className="flex items-center justify-between px-3 py-2 text-neutral-400">{counts}</div>

          <div className="flex items-center gap-2 border-t border-neutral-800 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt="" />
              <AvatarFallback>{(user?.email ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <button onClick={openReply} className="flex min-w-0 flex-1 items-center gap-0.5 rounded-full bg-neutral-900 py-1 pl-4 pr-1.5">
              <span className="min-w-0 flex-1 truncate py-1.5 text-left text-sm text-neutral-500">Post your reply</span>
              <span className="shrink-0 rounded-full p-1.5 text-neutral-400"><Maximize2 className="h-[18px] w-[18px]" /></span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop side panel. The left border is the seam between picture and
          replies — without it the two areas ran together. */}
      {panelOpen && (
      <aside className="hidden w-[380px] shrink-0 flex-col border-l bg-background md:flex md:h-full">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${post.authorId}`} className="shrink-0">
                <Avatar>
                  <AvatarImage src={post.authorAvatar} alt={post.authorName} />
                  <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <Link href={`/profile/${post.authorId}`} className="truncate font-bold hover:underline">{post.authorName}</Link>
                <span className="shrink-0 truncate text-sm text-muted-foreground">@{post.authorHandle}</span>
              </div>
              {!isAuthor && user && (
                <FollowButton profileId={post.authorId} isFollowing={isFollowing} isLoading={followLoading} onToggleFollow={setIsFollowing} />
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{linkify(post.content)}</p>
          </div>

          <div className="flex items-center justify-around border-t px-4 py-2 text-muted-foreground">{counts}</div>

          <div className="border-t p-4">
            <button onClick={openReply} className="block w-full rounded-full bg-secondary px-4 py-2 text-left text-sm text-muted-foreground hover:bg-accent">
              Post your reply
            </button>
          </div>

          <div className="border-t">
            {commentsLoading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading replies…</p>
            ) : comments.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No replies yet.</p>
            ) : (
              comments.map(c => (
                <article key={c.id} className="flex gap-3 border-b p-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={c.authorAvatar} alt={c.authorName} />
                    <AvatarFallback>{c.authorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-bold">{c.authorName}</span>{' '}
                      <span className="text-muted-foreground">@{c.authorHandle} · {formatTimestamp(new Date(c.createdAt))}</span>
                    </p>
                    {c.content && <p className="mt-0.5 whitespace-pre-wrap text-sm">{linkify(c.content)}</p>}
                    {c.media?.length > 0 && (
                      <div className="mt-2 overflow-hidden rounded-xl border ">
                        {c.media[0].type === 'video' ? (
                          <video src={c.media[0].url ?? ''} className="max-h-64 w-auto" controls playsInline />
                        ) : (
                          // GIFs and stickers are remote Giphy URLs of unknown
                          // size, so this is a plain img rather than next/image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.media[0].url ?? ''} alt="" className="max-h-64 w-auto object-contain" />
                        )}
                      </div>
                    )}

                    {/* The same row a reply gets on the post page. Without it
                        this was a thread you could read and not answer. */}
                    <CommentEngagement
                      parentPostId={post.id}
                      commentId={c.id}
                      initialLikes={c.likes}
                      initialReposts={c.reposts}
                      onReplyClick={openReply}
                    />
                  </div>
                </article>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>
      )}

      <Sheet open={isShareOpen} onOpenChange={setShareOpen}>
        <SheetContent side="bottom" className="rounded-t-lg">
          <SheetHeader><SheetTitle>Share Post</SheetTitle></SheetHeader>
          <div className="grid grid-cols-4 gap-4 py-4">
            <a href={shareUrls.twitter} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary group-hover:bg-accent"><XIcon className="h-7 w-7" /></div>
              <span className="text-xs">X</span>
            </a>
            <a href={shareUrls.facebook} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary group-hover:bg-accent"><FacebookIcon className="h-7 w-7" /></div>
              <span className="text-xs">Facebook</span>
            </a>
            <a href={shareUrls.whatsapp} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary group-hover:bg-accent"><WhatsAppIcon className="h-7 w-7" /></div>
              <span className="text-xs">WhatsApp</span>
            </a>
            <button onClick={copyLink} className="group flex flex-col items-center gap-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary group-hover:bg-accent"><Copy className="h-7 w-7" /></div>
              <span className="text-xs">Copy Link</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* A plain overlay rather than a Dialog.

          The composer carries GIF, sticker and emoji pickers, and every one of
          them is a Popover that portals to document.body. Inside a modal
          Dialog that portal lands outside the dialog's own subtree, so the
          focus trap treats the picker as an outside click and shuts it the
          instant it opens — which is why GIF search flashed and vanished here
          but works on the post page, where the same composer is rendered
          inline.

          Absolutely positioned inside the viewer rather than fixed, so the
          pickers — which portal to the body at the same z-index and later in
          the document — still paint above it. */}
      {isReplyOpen && (
        <div
          className="absolute inset-0 z-30 flex items-end justify-center bg-black/70 md:items-center"
          onClick={() => setReplyOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-background md:rounded-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Replying to <span className="text-primary">@{post.authorHandle}</span>
              </p>
              <button onClick={() => setReplyOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <CreateComment onComment={submitReply} isDialog />
          </div>
        </div>
      )}

      <LoginOrSignupDialog isOpen={isLoginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
