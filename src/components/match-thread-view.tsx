'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getTodaysFixtures } from '@/app/(app)/home/actions';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { formatTimestamp } from '@/lib/utils';
import { useLiveMatchComments, sendMatchComment } from '@/hooks/use-live-match-comments';

export function MatchThreadView({ fixtureId }: { fixtureId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  // Same cache key /live and the sidebar FixturesWidget already use — this
  // page rides whatever's already fetched rather than paying its own round
  // trip, and gets the same 60s score refresh for free.
  const { data: fixtures = [], isLoading: loadingFixtures } = useQuery({
    queryKey: queryKeys.fixtures(),
    queryFn: () => getTodaysFixtures(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const match = fixtures.find(m => String(m.id) === fixtureId);

  const { comments, loading: loadingComments } = useLiveMatchComments(fixtureId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A chat reads bottom-up — land on the most recent message, and follow
  // new ones in as they arrive, the way any live chat does.
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'end' });
  }, [comments.length]);

  const handleSend = async () => {
    if (!user || !profile || !text.trim() || sending) return;
    setSending(true);
    const result = await sendMatchComment({
      fixtureId,
      content: text,
      authorId: user.id,
      authorName: profile.display_name || 'User',
      authorHandle: profile.handle || 'user',
      authorAvatar: profile.photo_url,
    });
    setSending(false);
    if (result.success) {
      setText('');
    } else {
      toast({ variant: 'destructive', description: result.error ?? 'Could not send that.' });
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 p-2 md:p-4 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 flex-shrink-0" onClick={() => router.push('/live')}>
          <ArrowLeft />
        </Button>
        {loadingFixtures ? (
          <Skeleton className="h-6 w-40" />
        ) : match ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center text-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <Image src={match.team1.logo || 'https://placehold.co/20x20.png'} alt={match.team1.name} width={20} height={20} className="rounded-full flex-shrink-0" />
              <span className="font-bold truncate">{match.team1.name}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono flex-shrink-0 px-1">
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
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold truncate">{match.team2.name}</span>
              <Image src={match.team2.logo || 'https://placehold.co/20x20.png'} alt={match.team2.name} width={20} height={20} className="rounded-full flex-shrink-0" />
            </div>
          </div>
        ) : (
          // Not in today's fixture list — most likely this match has rolled
          // out of "today" since the link was shared. The thread itself
          // still works; there's just no score header to show.
          <h1 className="text-base font-bold">Match thread</h1>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
        {loadingComments ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))
        ) : comments.length > 0 ? (
          comments.map(c => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={c.authorAvatar ?? undefined} alt={c.authorName} />
                <AvatarFallback>{c.authorName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5 text-sm">
                  <span className="font-bold truncate">{c.authorName}</span>
                  <span className="text-muted-foreground text-xs flex-shrink-0">
                    @{c.authorHandle} · {formatTimestamp(new Date(c.createdAt))}
                  </span>
                </div>
                <p className="text-sm break-words">{c.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <h2 className="text-lg font-bold">No one's here yet</h2>
            <p className="text-sm">Be the first to say something.</p>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="border-t p-2 md:p-3 flex items-end gap-2 flex-shrink-0">
        <Textarea
          placeholder={user ? "Say something…" : "Log in to join the chat"}
          className="min-h-0 h-10 resize-none py-2"
          rows={1}
          maxLength={500}
          value={text}
          disabled={!user}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button size="icon" className="flex-shrink-0" disabled={!user || !text.trim() || sending} onClick={handleSend}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
