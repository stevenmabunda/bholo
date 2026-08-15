
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "./follow-button";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import { getUsersToFollow, getIsFollowing } from "@/app/(app)/profile/actions";
import { Skeleton } from "./ui/skeleton";


function UserSkeleton() {
    return (
        <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
            <Skeleton className="h-9 w-20 rounded-full" />
        </div>
    );
}

export function WhoToFollow() {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.whoToFollow(user?.id ?? 'anon'),
    enabled: !!user,
    queryFn: async () => {
      const users = await getUsersToFollow(user!.id);
      let followed: string[] = [];
      if (users.length > 0) {
        const followStatuses = await Promise.all(users.map(u => getIsFollowing(user!.id, u.uid)));
        followed = users.filter((_, i) => followStatuses[i]).map(u => u.uid);
      }
      return { users, followed };
    },
  });

  const usersToFollow = data?.users ?? [];
  const loading = !!user && isLoading;

  // Local overrides layer on top of the cached follow state so toggling
  // reflects immediately without refetching the whole suggestion list.
  const followedUserIds = new Set(
    [...(data?.followed ?? []).filter(id => overrides.get(id) !== false),
     ...[...overrides.entries()].filter(([, v]) => v).map(([id]) => id)]
  );

  const handleFollowToggle = (profileId: string, isFollowing: boolean) => {
      setOverrides(prev => new Map(prev).set(profileId, isFollowing));
  }

  if (!user) {
    return null; // Don't show this component to guests
  }

  return (
    <>
        <h2 className="text-xl font-bold mb-4 text-primary">Who to follow</h2>
        <div className="flex flex-col gap-4">
          {loading ? (
            <>
                <UserSkeleton />
                <UserSkeleton />
                <UserSkeleton />
            </>
          ) : usersToFollow.length > 0 ? (
            usersToFollow.map((userToFollow) => (
                <div key={userToFollow.uid} className="flex items-center justify-between gap-2">
                <Link href={`/profile/${userToFollow.uid}`} className="flex items-center gap-3 group">
                    <Avatar className="h-10 w-10">
                    <AvatarImage src={userToFollow.photoURL} data-ai-hint="user avatar" />
                    <AvatarFallback>{userToFollow.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="grid">
                    <p className="font-semibold leading-none group-hover:underline">{userToFollow.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{userToFollow.handle}</p>
                    </div>
                </Link>
                <FollowButton 
                    profileId={userToFollow.uid}
                    isFollowing={followedUserIds.has(userToFollow.uid)}
                    onToggleFollow={(isFollowing) => handleFollowToggle(userToFollow.uid, isFollowing)}
                />
                </div>
            ))
          ) : (
             <p className="text-sm text-muted-foreground text-center py-4">No new suggestions right now.</p>
          )}

          {usersToFollow.length > 0 && (
             <div className="pt-2">
                <Button variant="link" className="p-0 text-primary text-sm">Show more</Button>
            </div>
          )}
        </div>
    </>
  );
}
