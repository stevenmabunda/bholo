'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StandingsTable } from '@/components/standings-table';
import { Button } from '@/components/ui/button';

export default function StandingsPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 p-4 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Standings</h1>
      </header>
      <main className="flex-1">
        <StandingsTable />
      </main>
    </div>
  );
}
