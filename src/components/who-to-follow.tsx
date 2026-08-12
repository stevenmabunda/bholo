
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "./follow-button";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getUsersToFollow, getIsFollowing, type ProfileData } from "@/app/(app)/profile/actions";
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
  const [usersToFollow, setUsersToFollow] = useState<ProfileData[]>([]);
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
        setLoading(true);
        getUsersToFollow(user.id)
            .then(async (users) => {
                setUsersToFollow(users);
                if (users.length > 0) {
                    const followChecks = users.map(u => getIsFollowing(user.id, u.uid));
                    const followStatuses = await Promise.all(followChecks);
                    const newFollowedUserIds = new Set<string>();
                    users.forEach((u, index) => {
                        if (followStatuses[index]) {
                            newFollowedUserIds.add(u.uid);
                        }
                    });
                    setFollowedUserIds(newFollowedUserIds);
                }
            })
            .catch(err => console.error("Failed to fetch users to follow", err))
            .finally(() => setLoading(false));
    } else {
        setLoading(false);
    }
  }, [user]);

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
