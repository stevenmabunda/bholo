
'use client';

import { useQuery } from '@tanstack/react-query';
import { getTodaysFixtures } from '@/app/(app)/home/actions';
import { queryKeys } from '@/lib/query-keys';
import type { MatchType } from '@/lib/data';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import Link from 'next/link';

function MatchSkeleton() {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 w-2/5">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-8" />
                <div className="flex items-center gap-2 justify-end w-2/5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-5 rounded-full" />
                </div>
            </div>
        </div>
    );
}


export function FixturesWidget({ isPage = false, matches: propMatches, loading: propLoading, emptyMessage = "No live matches right now." }: { isPage?: boolean, matches?: MatchType[], loading?: boolean, emptyMessage?: string }) {
    // Only fetches when matches aren't supplied by the parent.
    const { data: internalMatches = [], isLoading: internalLoading } = useQuery({
        queryKey: queryKeys.fixtures(),
        queryFn: () => getTodaysFixtures(),
        enabled: propMatches === undefined,
        staleTime: 60_000,
        refetchInterval: 60_000,
    });

    const matches = propMatches !== undefined ? propMatches : internalMatches;
    const loading = propLoading !== undefined ? propLoading : internalLoading;

    const content = (
        <div className="flex flex-col gap-4">
            {loading ? (
                <>
                    <MatchSkeleton />
                    <MatchSkeleton />
                    <MatchSkeleton />
                </>
            ) : matches.length > 0 ? (
                matches.map((match) => (
                    <Link key={match.id} href={`/live/${match.id}`} className="flex flex-col gap-2 text-sm hover:opacity-80">
                        <p className="text-xs text-muted-foreground font-semibold">{match.league}</p>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 w-2/5 truncate">
                                <Image src={match.team1.logo || 'https://placehold.co/20x20.png'} alt={match.team1.name} width={20} height={20} className="rounded-full" />
                                <span className="font-bold truncate">{match.team1.name}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-base">
                                {match.isLive ? (
                                    <>
                                        <span className="font-bold">{match.score?.split('-')[0].trim()}</span>
                                        <span className="text-primary text-xs animate-pulse">LIVE</span>
                                        <span className="font-bold">{match.score?.split('-')[1].trim()}</span>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground text-xs font-sans font-bold">{match.time}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 justify-end w-2/5 truncate">
                                <span className="font-bold truncate text-right">{match.team2.name}</span>
                                <Image src={match.team2.logo || 'https://placehold.co/20x20.png'} alt={match.team2.name} width={20} height={20} className="rounded-full" />
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                <div className="text-center text-muted-foreground p-4">
                    <p>{emptyMessage}</p>
                </div>
            )}
            
            {!isPage && (
                <div className="pt-4">
                    <Button variant="link" className="p-0 text-primary w-fit text-sm" asChild>
                        <Link href="/live">View Match Centre</Link>
                    </Button>
                </div>
            )}
        </div>
    );

    if (isPage) {
        return <div className="p-4">{content}</div>;
    }

    return (
        <>
            <h2 className="text-xl font-bold mb-4 text-primary">Betway Premiership Fixtures</h2>
            {content}
        </>
    );
}
