'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { askAboutPost } from '@/app/(app)/post/[id]/actions';

const SUGGESTIONS = [
  'Explain this to me',
  'Is this accurate?',
  'Give me the background',
];

export function AskAiDialog({
  open,
  onOpenChange,
  postContent,
  postAuthor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postContent: string;
  postAuthor: string;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setAnswer(null);
    setError(null);
    try {
      const result = await askAboutPost({ postContent, postAuthor, question: q });
      if ('error' in result) setError(result.error);
      else setAnswer(result.answer);
    } catch {
      setError("BHOLO AI couldn't answer that right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Ask BHOLO AI
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground line-clamp-3 border-l-2 border-border pl-3">
          {postContent || 'This post has no text.'}
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Ask anything about this post…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ask(question); }}
            disabled={loading}
          />
          <Button onClick={() => ask(question)} disabled={loading || !question.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
          </Button>
        </div>

        {!answer && !loading && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => { setQuestion(s); ask(s); }}
              >
                {s}
              </Button>
            ))}
          </div>
        )}

        {loading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {answer && (
          <div className="rounded-lg bg-secondary p-3 text-sm whitespace-pre-wrap">
            {answer}
            <p className="mt-2 text-xs text-muted-foreground">
              AI-generated — it can be wrong, especially about very recent results.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
