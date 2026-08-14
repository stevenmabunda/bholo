
'use client';

import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { CreatePost, type Media } from '@/components/create-post';
import { usePosts } from '@/contexts/post-context';
import { useToast } from '@/hooks/use-toast';
import type { PostType } from '@/lib/data';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function FloatingCreatePostButton() {
  const { addPost } = usePosts();
  const { toast } = useToast();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handlePost = async (data: { text: string; media: Media[], poll?: PostType['poll'], location?: string | null }) => {
    try {
        const newPost = await addPost(data);
        setIsDialogOpen(false);
        if (newPost) {
          toast({ 
            description: "Your post has been published!",
            action: (
              <Button variant="outline" size="sm" onClick={() => router.push(`/post/${newPost.id}`)}>
                View
              </Button>
            ),
          });
        } else {
            toast({ description: "Your post has been published!" });
        }
    } catch (error) {
        console.error("Failed to create post from dialog:", error);
        toast({ variant: 'destructive', description: "Something went wrong. Please try again." });
    }
  };


  return (
    <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-lg p-0 h-[90vh] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
        >
        <SheetHeader className="p-3 md:p-4 pb-0 flex-shrink-0">
            <SheetTitle>Create a new post</SheetTitle>
        </SheetHeader>
        <div className="p-3 md:p-4 pt-0 flex-1 min-h-0">
            <CreatePost onPost={handlePost} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
