
'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Home, Hash, Bell, User, MessageSquare, LogOut, Bookmark, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { CreatePost, type Media } from './create-post';
import { usePosts } from '@/contexts/post-context';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import type { PostType } from '@/lib/data';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { SidebarBadge } from './ui/sidebar-badge';
import { useUnreadNotificationCount } from '@/hooks/use-unread-notifications';

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Hash },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  // { href: '/live', label: 'Match Centre' },
  { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/profile', label: 'My Profile', icon: User },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { addPost } = usePosts();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const unreadNotifications = useUnreadNotificationCount();

  const handlePost = async (data: { text: string; media: Media[], poll?: PostType['poll'], location?: string | null }) => {
    try {
        await addPost(data);
        setIsDialogOpen(false);
        toast({ description: "Your post has been published!" });
    } catch (error) {
        console.error("Failed to create post from dialog:", error);
        toast({ variant: 'destructive', description: "Something went wrong. Please try again." });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Force a full page reload to ensure all state is cleared.
    window.location.href = '/login';
  };

  const userHandle = profile?.handle || user?.email?.split('@')[0] || 'user';

  return (
    <div className="h-full flex-col sticky top-0 flex w-full">
      <Sidebar className="h-screen overflow-y-auto">
        <SidebarHeader>
          <div className="flex h-14 items-center justify-start pl-3 pr-4">
              <Link href="/home" className="group-data-[collapsible=icon]:hidden w-28" aria-label="BHOLO">
                  <Image src="/bholo_logo.png" alt="BHOLO Logo" width={112} height={45} priority />
              </Link>
              <Link href="/home" className="hidden group-data-[collapsible=icon]:block w-8 h-8" aria-label="BHOLO">
                   <Image src="/bholo_logo.png" alt="BHOLO Icon" width={32} height={32} priority />
              </Link>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href) && (item.href !== '/profile' || pathname === '/profile' || pathname.startsWith('/profile/'))}
                  className="text-lg h-14"
                >
                  <Link href={item.href === '/profile' && user ? `/profile/${user.id}` : item.href} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <item.icon className="h-7 w-7" />
                        <span className={pathname.startsWith(item.href) ? 'font-bold' : 'font-normal'}>{item.label}</span>
                    </div>
                     {item.href === '/notifications' && unreadNotifications > 0 && (
                        <SidebarBadge count={unreadNotifications} />
                     )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem className="px-2 mt-4 hidden md:block">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-14 text-lg rounded-full">Kick-It!</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                  <DialogHeader>
                    <DialogTitle>Create a new post</DialogTitle>
                  </DialogHeader>
                  <div className='-mx-6'>
                      <CreatePost onPost={handlePost} />
                  </div>
                </DialogContent>
              </Dialog>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
         <SidebarFooter className="mt-auto">
           {user && (
              <div className="w-full p-2">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start p-3 h-auto rounded-xl bg-sidebar-accent/50 hover:bg-sidebar-accent/75 transition-colors">
                              <div className="flex items-center gap-3 w-full">
                                  <Avatar className="h-10 w-10">
                                      <AvatarImage src={profile?.photo_url || 'https://placehold.co/40x40.png'} alt="User Avatar" data-ai-hint="user avatar" />
                                      <AvatarFallback>{profile?.display_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 overflow-hidden text-left">
                                      <p className="truncate font-bold">{profile?.display_name || 'User'}</p>
                                      <p className="truncate text-sm text-muted-foreground">@{userHandle}</p>
                                  </div>
                                  <MoreHorizontal className="h-5 w-5 ml-auto" />
                              </div>
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64 mb-2" side="top" align="start">
                          <DropdownMenuItem onSelect={() => router.push(`/profile/${user.id}`)}>
                              <User className="mr-2 h-4 w-4" />
                              <span>My Account</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleLogout}>
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Log out</span>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </div>
           )}
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}
