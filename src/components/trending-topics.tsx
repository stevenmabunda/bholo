
'use client';

import { useQuery } from '@tanstack/react-query';
import { getTrendingKeywords } from '@/app/(app)/explore/actions';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from './ui/button';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export function TrendingTopics() {
  const { data: topics = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.trendingKeywords(),
    queryFn: () => getTrendingKeywords({ numberOfTopics: 5 }),
    // Five minutes, not an hour. Counts move with every post on a match
    // day, and an hour of cache made a working panel look frozen — the
    // same symptom as the counting bug this was sitting on top of.
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  return (
     <>
        <h2 className="text-xl font-bold mb-4 text-primary">Join the conversation</h2>
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1 py-1">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-2/5" />
                </div>
              )
            )
          ) : (
            <>
              {topics.map((item, index) => (
                <Link href={`/search?q=${encodeURIComponent(item.topic)}`} key={index} className="group cursor-pointer block p-2 -m-2 rounded-md hover:bg-white/5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                      <p className="font-bold text-base">{item.topic}</p>
                      <p className="text-sm text-muted-foreground">{item.postCount}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>
                </Link>
              ))}
              <div className="pt-2">
                <Button variant="link" className="p-0 text-primary text-sm">Show more</Button>
              </div>
            </>
          )}
        </div>
      </>
  );
}
