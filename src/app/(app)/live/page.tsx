
'use client';
import { getTodaysFixtures } from "@/app/(app)/home/actions";
import { FixturesWidget } from "@/components/fixtures-widget";
import { StandingsTable } from "@/components/standings-table";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export default function LivePage() {
    // Same cache key the sidebar FixturesWidget uses, so the two share
    // one entry instead of each fetching the same fixtures separately.
    const { data: todaysMatches = [], isLoading: loading } = useQuery({
        queryKey: queryKeys.fixtures(),
        queryFn: () => getTodaysFixtures(),
        staleTime: 60_000,
        refetchInterval: 60_000,
    });

    return (
        <div className="flex h-full min-h-screen flex-col">
            <header className="sticky top-0 z-10 border-b bg-background/80 p-4 backdrop-blur-sm">
                <h1 className="text-xl font-bold">Match Centre</h1>
            </header>
            <main className="flex-1 space-y-6">
                <div className="p-4">
                    <FixturesWidget isPage={true} matches={todaysMatches} loading={loading} emptyMessage="No matches are currently live." />
                </div>
                <div className="px-4">
                    <StandingsTable />
                </div>
            </main>
        </div>
    );
}
