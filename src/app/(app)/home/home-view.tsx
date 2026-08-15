
'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Post } from '@/components/post';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePosts } from '@/contexts/post-context';
import { PostSkeleton } from '@/components/post-skeleton';
import { DiscoverFeed } from '@/components/discover-feed';
import type { PostType } from '@/lib/data';
import { CreatePost, type Media } from '@/components/create-post';
import { useToast } from '@/hooks/use-toast';
import { useTabContext } from '@/contexts/tab-context';
import { NewPostsNotification } from '@/components/new-posts-notification';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { Loader2, Bell, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from "next/image";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingTopics } from '@/components/trending-topics';
import { useUnreadNotificationCount } from '@/hooks/use-unread-notifications';
import LivePage from '../live/page';
import { Card } from '@/components/ui/card';
import { SignupPrompt } from '@/components/signup-prompt';
import VideoFeedPage from '../video/page';


export function HomeView() {
  const { 
    forYouPosts,
    newForYouPosts,
    showNewForYouPosts,
    loadingForYou,
    addPost,
    fetchForYouPosts,
  } = usePosts();

  const { toast } = useToast();
  const { activeTab, setActiveTab } = useTabContext();
  const { user } = useAuth();
  const { profile } = useProfile();

  const [showNotification, setShowNotification] = useState(false);
  const [hasScrolledFromTop, setHasScrolledFromTop] = useState(false);
  
  const [loadingMoreForYou, setLoadingMoreForYou] = useState(false);
  const [hasMoreForYou, setHasMoreForYou] = useState(true);
  
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const unreadNotifications = useUnreadNotificationCount();

  useEffect(() => {
    document.title = 'Home | BHOLO';
  }, []);
  
  useEffect(() => {
    // This effect handles restoring scroll position.
    if (!loadingForYou && forYouPosts.length > 0) {
      try {
        const desktopScrollY = sessionStorage.getItem('desktopScrollY');
        const desktopScrollArea = document.querySelector('#desktop-scroll-area > div');
        if (desktopScrollY && desktopScrollArea) {
          desktopScrollArea.scrollTo(0, parseInt(desktopScrollY, 10));
          sessionStorage.removeItem('desktopScrollY');
          return;
        }

        const mobileScrollY = sessionStorage.getItem('homeScrollY');
        if (mobileScrollY) {
            window.scrollTo(0, parseInt(mobileScrollY, 10));
            sessionStorage.removeItem('homeScrollY');
        }
      } catch (e) {
        console.error("Could not restore scroll position:", e);
      }
    }
  }, [loadingForYou, forYouPosts.length]);


  const loadMoreForYouPosts = useCallback(async () => {
    if (loadingMoreForYou || !hasMoreForYou) return;

    setLoadingMoreForYou(true);
    const lastPost = forYouPosts[forYouPosts.length - 1];
    try {
        const morePosts = await fetchForYouPosts({ limit: 20, lastPostId: lastPost?.id });
        if (morePosts.length === 0) {
            setHasMoreForYou(false);
        }
    } catch (error) {
        console.error("Failed to load more posts:", error);
        toast({ variant: 'destructive', description: "Could not load more posts." });
    } finally {
        setLoadingMoreForYou(false);
    }
  }, [loadingMoreForYou, hasMoreForYou, fetchForYouPosts, toast, forYouPosts]);

  const createObserver = (callback: () => void) => (node: HTMLDivElement) => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        callback();
      }
    });
    if (node) observer.observe(node);
    return () => { if (node) observer.unobserve(node); };
  };

  const forYouTriggerRef = useCallback(createObserver(loadMoreForYouPosts), [loadMoreForYouPosts]);

  useEffect(() => {
    const handleScroll = () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
            setIsHeaderHidden(true);
        } else {
            setIsHeaderHidden(false);
        }
        lastScrollY.current = currentScrollY;

        if (activeTab !== 'foryou') {
            setShowNotification(false);
            return;
        }
        const isScrolledPastThreshold = window.scrollY > 200;
        if (isScrolledPastThreshold) {
            setHasScrolledFromTop(true);
        } else {
            setHasScrolledFromTop(false);
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  useEffect(() => {
    if (newForYouPosts.length > 0 && hasScrolledFromTop && activeTab === 'foryou') {
      setShowNotification(true);
    } else {
      setShowNotification(false);
    }
  }, [newForYouPosts, hasScrolledFromTop, activeTab]);


  const handleShowNewPosts = () => {
    showNewForYouPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowNotification(false);
  }
  
  const handlePost = async (data: { text: string; media: Media[], poll?: PostType['poll'], location?: string | null }) => {
    try {
        await addPost(data);
        toast({ description: "Your post has been published!" });
        if (window.scrollY < 200) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        console.error("Failed to create post:", error);
        toast({ variant: 'destructive', description: "Something went wrong. Please try again." });
    }
  };
  
  const postsToShow = user ? forYouPosts : forYouPosts.slice(0, 5);

  const homeTabs = [
    { value: 'foryou', label: 'For You' },
    { value: 'discover', label: 'Discover' },
    // { value: 'live', label: 'Match Centre' },
  ];

  return (
    <div className="flex h-full min-h-screen flex-col">
       <NewPostsNotification 
            show={showNotification}
            avatars={newForYouPosts.map(p => p.authorAvatar)}
            onClick={handleShowNewPosts}
        />
      <Tabs defaultValue="foryou" value={activeTab} className="w-full flex flex-col flex-1" onValueChange={setActiveTab}>
        <header className={cn(
            "fixed md:sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm transition-transform duration-300 ease-in-out md:translate-y-0",
            isHeaderHidden && 'hide-header'
        )}>
            <div className="md:hidden">
                <div className="flex h-14 items-center justify-between px-4">
                     <SidebarTrigger asChild>
                        <button className="h-8 w-8 rounded-full overflow-hidden">
                            <Avatar className="h-full w-full">
                                <AvatarImage src={profile?.photo_url || undefined} data-ai-hint="user avatar" />
                                <AvatarFallback>{profile?.display_name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                        </button>
                    </SidebarTrigger>
                     <Link href="/home" aria-label="Home" className="flex items-center justify-center h-10">
                         <Image src="/bholo_logo.png" alt="BHOLO Logo" width="100" height="40" className="h-auto w-auto max-h-full" />
                    </Link>
                     <div className="flex items-center gap-1">
                        <Link href="/notifications" passHref>
                            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                                <Bell className="h-5 w-5" />
                                {unreadNotifications > 0 && (
                                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                    </span>
                                )}
                                <span className="sr-only">Notifications</span>
                            </Button>
                        </Link>
                        <Link href="/messages" passHref>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Mail className="h-5 w-5" />
                                <span className="sr-only">Messages</span>
                            </Button>
                        </Link>
                    </div>
                </div>
                 <TabsList className="flex w-full justify-around border-b bg-transparent p-0 overflow-x-auto no-scrollbar">
                    {homeTabs.map(tab => (
                       <TabsTrigger key={tab.value} value={tab.value} className="flex-auto shrink-0 rounded-none border-b-2 border-transparent py-3 text-sm font-bold text-muted-foreground data-[state=active]:text-white data-[state=active]:border-white data-[state=active]:shadow-none px-2">{tab.label}</TabsTrigger>
                    ))}
                </TabsList>
            </div>
            {/* Desktop Header */}
            <div className="hidden md:block">
                 <TabsList className="flex w-full justify-evenly border-b bg-transparent p-0 overflow-x-auto no-scrollbar">
                    {homeTabs.map(tab => (
                       <TabsTrigger key={tab.value} value={tab.value} className="flex-1 shrink-0 rounded-none border-b-2 border-transparent py-4 text-base font-bold text-muted-foreground data-[state=active]:text-white data-[state=active]:border-white data-[state=active]:shadow-none px-4">{tab.label}</TabsTrigger>
                    ))}
                </TabsList>
            </div>
        </header>

        <main className="flex-1 md:pt-0 pt-[112px]">
          <TabsContent value="foryou" className="h-full">
            {user && (
              <div className="hidden md:block border-b">
                <CreatePost onPost={handlePost} />
              </div>
            )}
            <div className="divide-y divide-border">
              {loadingForYou && postsToShow.length === 0 ? (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              ) : postsToShow.length > 0 ? (
                postsToShow.map((post) => {
                    if (!post) return null;
                    return <Post key={post.id} {...post} />
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <h2 className="text-xl font-bold">Your feed is empty</h2>
                  <p>Follow some accounts or check out the Discover tab!</p>
                </div>
              )}
            </div>
            
            {!user && forYouPosts.length > 5 && <SignupPrompt />}
            
            {user && hasMoreForYou && !loadingForYou && (
                <div ref={forYouTriggerRef} className="py-8 text-center">
                    {loadingMoreForYou && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
                </div>
            )}
            {user && !hasMoreForYou && !loadingForYou && forYouPosts.length > 0 && (
                <p className="py-8 text-center text-muted-foreground">You've reached the end!</p>
            )}
          </TabsContent>
          <TabsContent value="discover" className="h-full">
            <DiscoverFeed />
          </TabsContent>
           <TabsContent value="trending" className="h-full p-4">
             <TrendingTopics />
          </TabsContent>
          {/* <TabsContent value="live" className="h-full">
            <LivePage />
          </TabsContent> */}
        </main>
      </Tabs>
    </div>
  );
}
