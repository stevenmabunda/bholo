'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PSL_TEAMS } from '@/lib/psl-teams';
import { useProfile } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * The 16 Betway Premiership clubs, as a browsable index.
 *
 * There is no per-club feed yet, so tapping a club runs the club name through
 * search — which already indexes posts, people and hashtags. That is a real
 * destination inside the app rather than a dead card.
 */
export default function ClubsPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const myClub = profile?.favourite_club ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 p-4 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Clubs</h1>
      </header>

      <main className="flex-1 space-y-4 p-4">
        <Link
          href="/standings"
          className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-secondary/50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold">PSL standings</p>
            <p className="text-sm text-muted-foreground">The full Betway Premiership table</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        <div className="grid grid-cols-2 gap-3">
          {PSL_TEAMS.map((team) => {
            const isMine = !!myClub && myClub.toLowerCase() === team.name.toLowerCase();
            return (
              <Link
                key={team.slug}
                href={`/search?q=${encodeURIComponent(team.name)}`}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-secondary/50',
                  isMine && 'border-primary/60 bg-primary/5'
                )}
              >
                <Image
                  src={team.badge}
                  alt={team.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain"
                />
                <span className="text-sm font-semibold leading-tight">{team.name}</span>
                {isMine && <span className="text-[11px] font-medium text-primary">Your club</span>}
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
