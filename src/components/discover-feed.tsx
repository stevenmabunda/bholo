
'use client';

import { Button } from "./ui/button";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { getMostViewedPosts } from "@/app/(app)/discover/actions";
import { queryKeys } from "@/lib/query-keys";
import { Skeleton } from "./ui/skeleton";
import type { PostType } from "@/lib/data";
import { Eye, MessageCircle, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { WhoToFollow } from "./who-to-follow";

function HeadlineSkeleton() {
    return (
        <div className="group cursor-pointer p-4 hover:bg-accent flex items-start justify-between gap-4 border-t">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
        </div>
    )
}

export function DiscoverFeed() {
  const router = useRouter();

  const { data: posts = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.explorePosts(),
    queryFn: () => getMostViewedPosts(),
  });

  const [heroPost, ...otherPosts] = posts;

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  if (loading) {
      return (
        <div className="border-b">
            {/* Hero Skeleton */}
            <div className="relative w-full h-[400px] mb-2">
                <Skeleton className="w-full h-full" />
                <div className="absolute bottom-0 left-0 p-4 w-full bg-gradient-to-t from-black/70 to-transparent">
                    <Skeleton className="h-8 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>
            {/* List Skeleton */}
            <HeadlineSkeleton />
            <HeadlineSkeleton />
            <HeadlineSkeleton />
            <HeadlineSkeleton />
        </div>
      )
  }

  if (posts.length === 0) {
      return (
          <div className="p-8 text-center text-muted-foreground border-b">
              <h2 className="text-xl font-bold">Nothing to discover yet</h2>
              <p>Post something to see trending topics here.</p>
          </div>
      )
  }

  return (
    <div className="border-b">
      {/* Hero Section */}
      {heroPost && (
        <div 
            className="relative w-full h-[400px] cursor-pointer group mb-2"
            onClick={() => handlePostClick(heroPost.id)}
        >
            <Image
                src={heroPost.media?.[0]?.url || 'https://placehold.co/600x300.png'}
                alt={heroPost.content}
                fill
                sizes="(max-width: 767px) 100vw, 624px"
                className="object-cover object-center group-hover:opacity-90 transition-opacity"
                data-ai-hint={heroPost.media?.[0]?.hint || 'stadium lights'}
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 p-4 text-white">
                <h2 className="text-2xl font-bold leading-tight mt-1 line-clamp-2">{heroPost.content}</h2>
                <div className="flex items-center gap-4 text-sm mt-1">
                    <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        <span>{heroPost.likes}</span>
                    </div>
                     <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{heroPost.comments}</span>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* List of other headlines */}
      {otherPosts.map((post) => (
        <div key={post.id} 
            className="group cursor-pointer p-4 hover:bg-accent flex items-start justify-between gap-4 border-t"
            onClick={() => handlePostClick(post.id)}
        >
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">@{post.authorHandle}</p>
            <p className="font-bold text-base group-hover:underline line-clamp-2">{post.content}</p>
             <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{post.likes}</span>
                </div>
                    <div className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>{post.comments}</span>
                </div>
            </div>
          </div>
          {post.media?.[0]?.url &&
            <Image 
                src={post.media[0].url} 
                alt={post.content} 
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover" 
                data-ai-hint={post.media[0].hint || 'football action'} />
          }
        </div>
      ))}
      <div className="p-4 border-t">
        <WhoToFollow />
      </div>
    </div>
  );
}
