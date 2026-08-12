
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { getFollowers, getFollowing, getIsFollowing, type ProfileData } from '@/app/(app)/profile/actions';
import { Skeleton } from './ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { FollowButton } from './follow-button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface FollowListDialogProps {
  profileId: string;
  type: 'followers' | 'following';
  children: React.ReactNode;
}

function UserSkeleton() {
  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>
  );
}

export function FollowListDialog({ profileId, type, children }: FollowListDialogProps) {
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [userList, setUserList] = useState<ProfileData[]>([]);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const title = type.charAt(0).toUpperCase() + type.slice(1);

  const fetchUsers = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const fetchFunction = type === 'followers' ? getFollowers : getFollowing;
      const users = await fetchFunction(profileId);
      setUserList(users);

      if (users.length > 0) {
        const followChecks = users.map(u => getIsFollowing(currentUser.id, u.uid));
        const followStatuses = await Promise.all(followChecks);
        const newFollowedUserIds = new Set<string>();
        users.forEach((u, index) => {
          if (followStatuses[index]) {
            newFollowedUserIds.add(u.uid);
          }
        });
        setFollowedUserIds(newFollowedUserIds);
      }

    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
      toast({ variant: 'destructive', description: `Could not load ${type}.` });
    } finally {
      setLoading(false);
    }
  }, [profileId, type, toast, currentUser]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

   const handleFollowToggle = (profileId: string, isFollowing: boolean) => {
      setFollowedUserIds(prev => {
          const newSet = new Set(prev);
          if (isFollowing) {
              newSet.add(profileId);
          } else {
              newSet.delete(profileId);
          }
          return newSet;
      })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-80">
          <div className="p-1">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <UserSkeleton key={i} />)
            ) : userList.length > 0 ? (
              userList.map((user) => (
                <div key={user.uid} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-accent">
                  <DialogClose asChild>
                    <Link href={`/profile/${user.uid}`} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL} data-ai-hint="user avatar" />
                          <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold hover:underline">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">@{user.handle}</p>
                        </div>
                    </Link>
                  </DialogClose>
                  {currentUser?.id !== user.uid && (
                    <FollowButton
                        profileId={user.uid}
                        isFollowing={followedUserIds.has(user.uid)}
                        onToggleFollow={(isFollowing) => handleFollowToggle(user.uid, isFollowing)}
                    />
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground p-4">
                {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
