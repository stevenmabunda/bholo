
'use client';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserProfile, getIsFollowing } from '@/app/(app)/profile/actions';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from './ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { FollowButton } from './follow-button';
import Link from 'next/link';

interface ProfileHoverCardProps {
  children: React.ReactNode;
  userId: string;
}

function ProfileHoverCardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function ProfileHoverCard({ children, userId }: ProfileHoverCardProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);

  const isMyProfile = currentUser?.id === userId;

  // Same cache the profile page reads (queryKeys.profile) — hover someone
  // whose page you've already opened, or whose card is already open
  // elsewhere in the feed, and this resolves from cache with no request at
  // all, instead of every card instance paying its own round trip.
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => getUserProfile(userId),
    enabled: isOpen,
  });

  const { data: fetchedIsFollowing = false } = useQuery({
    queryKey: ['profile', userId, 'is-following', currentUser?.id ?? 'anon'],
    queryFn: () => getIsFollowing(currentUser!.id, userId),
    enabled: isOpen && !!currentUser && !isMyProfile,
  });

  const isFollowing = followOverride ?? fetchedIsFollowing;

  // Fires on pointer-in, well before the card's own openDelay below elapses
  // — so on a cache miss, the request is already in flight by the time the
  // card is visible rather than starting only once it opens.
  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile(userId),
      queryFn: () => getUserProfile(userId),
    });
  };

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen} openDelay={150}>
      <HoverCardTrigger asChild onMouseEnter={prefetch}>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80" side="top" onClick={(e) => e.stopPropagation()}>
        {profileLoading || !profile ? (
          <ProfileHoverCardSkeleton />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <Link href={`/profile/${profile.uid}`}>
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={profile.photoURL}
                    data-ai-hint="user avatar"
                  />
                  <AvatarFallback>
                    {profile.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Link>
              {!isMyProfile && (
                <FollowButton
                  profileId={profile.uid}
                  isFollowing={isFollowing}
                  onToggleFollow={setFollowOverride}
                />
              )}
            </div>
            <div>
              <Link href={`/profile/${profile.uid}`}>
                <h3 className="font-bold hover:underline">{profile.displayName}</h3>
              </Link>
              <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            </div>
            {profile.bio && <p className="text-sm">{profile.bio}</p>}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="font-bold text-foreground">
                  {profile.followingCount}
                </span>
                <span>Following</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span className="font-bold text-foreground">
                  {profile.followersCount}
                </span>
                <span>Followers</span>
              </div>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
