'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { PSL_TEAMS } from '@/lib/psl-teams';
import { completeTeamOnboarding } from '@/app/onboarding/actions';
import { cn } from '@/lib/utils';

export function TeamPickerView() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Same backstop pattern as login/signup: middleware already keeps a
  // logged-out visitor off this page, this just covers the render before
  // the auth check resolves client-side.
  if (!loading && !user) {
    router.replace('/login');
    return null;
  }

  const handleContinue = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    const result = await completeTeamOnboarding(selected);
    if (result.success) {
      router.push('/home');
      router.refresh();
    } else {
      setSubmitting(false);
      toast({ variant: 'destructive', description: result.error ?? 'Could not save your team.' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-10 md:py-16">
      <div className="w-full max-w-2xl flex flex-col items-center text-center">
        <Image src="/bholo_logo.png" alt="BHOLO" width={120} height={48} priority />
        <h1 className="mt-6 text-2xl md:text-3xl font-bold text-foreground">
          Who do you support?
        </h1>
        <p className="mt-2 text-muted-foreground max-w-md">
          Pick your Betway Premiership club — your feed leads with what's
          being said about them.
        </p>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
          {PSL_TEAMS.map((team) => {
            const isSelected = selected === team.name;
            return (
              <button
                key={team.slug}
                type="button"
                onClick={() => setSelected(team.name)}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors',
                  'bg-card hover:bg-accent',
                  isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                )}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <div className="relative h-14 w-14">
                  {/* priority, not the lazy default: this grid is the
                      entire page, so every crest is already on screen —
                      and native lazy-loading on a `fill` image measures
                      an absolutely-positioned, percentage-sized box before
                      layout settles, sees zero, and never queues the
                      fetch at all. Confirmed live: all 16 silently never
                      requested with the default. */}
                  <Image src={team.badge} alt={team.name} fill sizes="56px" priority className="object-contain" />
                </div>
                <span className="text-xs font-medium text-foreground leading-tight">
                  {team.name}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          className="mt-10 w-full max-w-xs h-12 text-base"
          disabled={!selected || submitting}
          onClick={handleContinue}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
        </Button>
      </div>
    </div>
  );
}
