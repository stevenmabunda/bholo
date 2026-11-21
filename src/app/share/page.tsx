'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreatePost, type Media } from '@/components/create-post';
import { usePosts } from '@/contexts/post-context';
import { useToast } from '@/hooks/use-toast';
import type { PostType } from '@/lib/data';

/**
 * Compose screen for a link/text shared into BHOLO from Android's share sheet
 * (or a browser's Web Share API). The share target POST lands on
 * /api/share, which redirects here with `text` already filled in.
 */
export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addPost } = usePosts();
  const { toast } = useToast();

  const initialText = searchParams.get('text') ?? '';

  const handlePost = async (data: {
    text: string;
    media: Media[];
    poll?: PostType['poll'];
    location?: string | null;
    scheduledFor?: string | null;
  }) => {
    const newPost = await addPost(data);
    if (newPost) {
      toast({ description: 'Your post has been published!' });
      router.replace(`/post/${newPost.id}`);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/80 p-4 backdrop-blur-sm">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Share to BHOLO</h1>
      </header>
      <main className="flex-1 p-4">
        <CreatePost onPost={handlePost} initialText={initialText} />
      </main>
    </div>
  );
}
