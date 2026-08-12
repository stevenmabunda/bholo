
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Plus, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { CreatePost, type Media } from '@/components/create-post';
import { usePosts } from '@/contexts/post-context';
import { useToast } from '@/hooks/use-toast';
import type { PostType } from '@/lib/data';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { Button } from './ui/button';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/explore', icon: Search, label: 'Explore' },
  { href: 'POST_ACTION', icon: Plus, label: 'Post' },
  // { href: '/live', label: 'Match Centre' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { addPost } = usePosts();
  const { toast } = useToast();
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-border z-40">
      <div className="flex justify-evenly items-center h-full">
        {navItems.map((item) => {
          if (item.href === 'POST_ACTION') {
            return (
              <Sheet key={item.label} open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <SheetTrigger asChild>
                  <button className="flex-1 flex justify-center items-center h-full">
                    <item.icon className='h-7 w-7 text-muted-foreground' strokeWidth={2.5} />
                  </button>
                </SheetTrigger>
                <SheetContent 
                    side="bottom" 
                    className="rounded-t-lg p-0 h-[90vh]"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <SheetHeader className="p-3 md:p-4 pb-0">
                      <SheetTitle>Create a new post</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full">
                        <div className="p-3 md-p-4 pt-0">
                            <CreatePost onPost={handlePost} />
                        </div>
                    </ScrollArea>
                </SheetContent>
              </Sheet>
            );
          }
          
          let href = item.href;
          if (item.href === '/profile' && user) {
            href = `/profile/${user.id}`;
          }

          const isActive = pathname === href || (item.href !== '/home' && pathname.startsWith(item.href));
          
          return (
            <Link key={item.href + item.label} href={href} className="flex-1 flex justify-center items-center h-full">
              <item.icon
                className={cn(
                  'h-6 w-6 text-muted-foreground transition-colors',
                  isActive && 'text-primary'
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
