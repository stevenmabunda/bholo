
'use client';

import { Button } from "./ui/button";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getTrendingTopics } from "@/app/(app)/explore/actions";
import { Skeleton } from "./ui/skeleton";
import type { GenerateTrendingTopicsOutput } from "@/ai/flows/generate-trending-topics";

type TrendingTopic = GenerateTrendingTopicsOutput['topics'][number];

function HeadlineSkeleton() {
    return (
        <div className="group cursor-pointer p-4 hover:bg-accent flex items-start justify-between gap-4 border-t">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        </div>
    )
}

export function DiscoverHeadlines() {
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopics = async () => {
        setLoading(true);
        try {
            const result = await getTrendingTopics({});
            setTopics(result.topics);
        } catch (error) {
            console.error("Failed to fetch discover headlines:", error);
            // Optionally set some default topics on error
        } finally {
            setLoading(false);
        }
    };
    fetchTopics();
  }, []);

  const [heroHeadline, ...otherHeadlines] = topics;

  if (loading) {
      return (
        <div className="border-b">
            {/* Hero Skeleton */}
            <div className="relative w-full h-64 mb-2">
                <Skeleton className="w-full h-full" />
                <div className="absolute bottom-0 left-0 p-4 w-full">
                    <Skeleton className="h-4 w-1/4 mb-2" />
                    <Skeleton className="h-8 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-1/5" />
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

  if (topics.length === 0) {
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
      {heroHeadline && (
        <div className="relative w-full h-64 cursor-pointer group mb-2">
            <Image
            src="https://placehold.co/600x300.png"
            alt={heroHeadline.topic}
            fill
            sizes="(max-width: 767px) 100vw, 624px"
            objectFit="cover"
            className="group-hover:opacity-90 transition-opacity"
            data-ai-hint={heroHeadline.imageHint || 'stadium lights'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 p-4 text-white">
            <p className="text-sm font-semibold">{heroHeadline.category}</p>
            <h2 className="text-2xl font-bold leading-tight mt-1">{heroHeadline.topic}</h2>
            <p className="text-sm mt-1">{heroHeadline.postCount}</p>
            </div>
        </div>
      )}

      {/* List of other headlines */}
      {otherHeadlines.map((item, index) => (
        <div key={index} className="group cursor-pointer p-4 hover:bg-accent flex items-start justify-between gap-4 border-t">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{item.category}</p>
            <p className="font-bold text-base group-hover:underline">{item.topic}</p>
            <p className="text-sm text-muted-foreground">{item.postCount}</p>
          </div>
          <Image src="https://placehold.co/100x100.png" alt={item.topic} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" data-ai-hint={item.imageHint || 'football action'} />
        </div>
      ))}
      <div className="p-4 hover:bg-accent cursor-pointer border-t">
         <Button variant="link" className="p-0 text-primary text-sm">Show more</Button>
      </div>
    </div>
  );
}
