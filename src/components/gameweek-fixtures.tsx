'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react';
import { getGameweekFixtures, type FixtureGroup } from '@/app/(app)/fixtures/actions';
import { queryKeys } from '@/lib/query-keys';
import type { FixtureEvent, FixtureStatus } from '@/services/thesportsdb-service';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';

function FixtureRow({ fixture }: { fixture: FixtureEvent }) {
  const isLive = fixture.status === 'live';
  const isFinished = fixture.status === 'finished';
  const isPostponed = fixture.status === 'postponed';
  const isCancelled = fixture.status === 'cancelled';

  return (
    <div className="border-t border-border/60 p-4 first:border-t-0">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
        <div className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-right font-semibold">{fixture.home.name}</span>
          <Image
            src={fixture.home.crest}
            alt={fixture.home.name}
            width={32}
            height={32}
            unoptimized
            className="h-8 w-8 flex-shrink-0 object-contain"
          />
        </div>

        <div className="min-w-[68px] text-center">
          {isPostponed || isCancelled ? (
            <span className="text-xs font-bold uppercase text-destructive">
              {fixture.statusLabel}
            </span>
          ) : isLive || isFinished ? (
            <span className={cn('text-lg font-bold tabular-nums', isLive && 'text-primary')}>
              {fixture.home.score ?? 0} - {fixture.away.score ?? 0}
            </span>
          ) : (
            <span className="text-base font-bold tabular-nums">
              {fixture.kickoff || 'TBC'}
            </span>
          )}
          {isLive && (
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-primary">
              Live
            </span>
          )}
          {isFinished && (
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              FT
            </span>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-start gap-2">
          <Image
            src={fixture.away.crest}
            alt={fixture.away.name}
            width={32}
            height={32}
            unoptimized
            className="h-8 w-8 flex-shrink-0 object-contain"
          />
          <span className="truncate font-semibold">{fixture.away.name}</span>
        </div>
      </div>

      {(fixture.venue || fixture.round) && (
        <p className="mt-2 truncate text-center text-xs text-muted-foreground">
          {[fixture.venue, fixture.round ? `Round ${fixture.round}` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}

function FixtureSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border/60 p-4 first:border-t-0">
      <div className="flex flex-1 items-center justify-end gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-6 w-14" />
      <div className="flex flex-1 items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}

const FIXTURE_STATUSES: FixtureStatus[] = ['scheduled', 'postponed'];
const RESULT_STATUSES: FixtureStatus[] = ['finished'];
const LIVE_STATUSES: FixtureStatus[] = ['live'];

function filterGroups(groups: FixtureGroup[], statuses: FixtureStatus[]): FixtureGroup[] {
  return groups
    .map((group) => ({
      ...group,
      fixtures: group.fixtures.filter((fixture) => statuses.includes(fixture.status)),
    }))
    .filter((group) => group.fixtures.length > 0);
}

function GroupedFixtures({
  groups,
  empty,
}: {
  groups: FixtureGroup[];
  empty: React.ReactNode;
}) {
  if (groups.length === 0) return <EmptyState>{empty}</EmptyState>;

  return (
    <div>
      {groups.map((group) => (
        <section key={group.date}>
          <h3 className="border-y border-border/60 bg-secondary/40 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {group.outsideWindow ? `Recent · ${group.label}` : group.label}
          </h3>
          {group.fixtures.map((fixture) => (
            <FixtureRow key={fixture.id} fixture={fixture} />
          ))}
        </section>
      ))}
    </div>
  );
}

export function GameweekFixtures() {
  const [offsetWeeks, setOffsetWeeks] = useState(0);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: queryKeys.gameweek(offsetWeeks),
    queryFn: () => getGameweekFixtures(offsetWeeks),
    // A live match needs a score every minute; everything else can sit on the
    // server cache for the normal five-minute window.
    staleTime: 60_000,
    refetchInterval: (query) => (query.state.data?.hasLive ? 60_000 : 300_000),
  });

  const groups = data?.groups ?? [];

  return (
    <Card className="m-4">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOffsetWeeks((weeks) => weeks - 1)}
            aria-label="Previous week"
          >
            <ChevronLeft />
          </Button>

          <div className="min-w-0 text-center">
            <p className="truncate text-lg font-bold">
              {data?.round ? `Round ${data.round}` : 'Fixtures'}
            </p>
            <p className="text-sm text-muted-foreground">
              {data?.rangeLabel ?? 'Loading…'}
            </p>
            <div className="mt-1 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              {data?.hasLive && (
                <span className="font-bold uppercase tracking-wide text-primary">Live now</span>
              )}
              {isFetching && !isLoading && (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating
                </span>
              )}
              {offsetWeeks !== 0 && (
                <button
                  type="button"
                  onClick={() => setOffsetWeeks(0)}
                  className="inline-flex items-center gap-1 font-semibold text-primary"
                >
                  <RotateCcw className="h-3 w-3" />
                  This week
                </button>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOffsetWeeks((weeks) => weeks + 1)}
            aria-label="Next week"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="fixtures" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-none">
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="live">Live</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div>
            <FixtureSkeleton />
            <FixtureSkeleton />
            <FixtureSkeleton />
          </div>
        ) : isError ? (
          <EmptyState>
            <p className="mb-3">Could not load fixtures.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </EmptyState>
        ) : (
          <>
            <TabsContent value="fixtures">
              <GroupedFixtures
                groups={filterGroups(groups, FIXTURE_STATUSES)}
                empty={
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    No fixtures in this week.
                  </span>
                }
              />
            </TabsContent>
            <TabsContent value="results">
              <GroupedFixtures
                groups={filterGroups(groups, RESULT_STATUSES)}
                empty="No results in this week."
              />
            </TabsContent>
            <TabsContent value="live">
              <GroupedFixtures
                groups={filterGroups(groups, LIVE_STATUSES)}
                empty="There are no live matches right now."
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </Card>
  );
}
