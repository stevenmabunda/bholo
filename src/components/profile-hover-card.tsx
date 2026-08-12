
'use client';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { CalendarDays, Heart, MapPin, Users } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { ProfileData } from '@/app/(app)/profile/actions';
import { getUserProfile, getIsFollowing } from '@/app/(app)/profile/actions';
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
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const isMyProfile = currentUser?.id === userId;

  const fetchProfile = useCallback(async () => {
    if (!isOpen || profile) return; // Don't fetch if already loaded or not open
    setLoading(true);
    try {
      const fetchedProfile = await getUserProfile(userId);
      if (fetchedProfile) {
        setProfile(fetchedProfile);
        if (currentUser && currentUser.id !== userId) {
          const followStatus = await getIsFollowing(currentUser.id, userId);
          setIsFollowing(followStatus);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile for hover card', error);
    } finally {
      setLoading(false);
    }
  }, [userId, isOpen, profile, currentUser]);

  useEffect(() => {
    if (isOpen) {
      // Use a small delay to avoid fetching on accidental mouse-overs
      const timer = setTimeout(() => {
        fetchProfile();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchProfile]);

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80" side="top" onClick={(e) => e.stopPropagation()}>
        {loading || !profile ? (
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
                  onToggleFollow={setIsFollowing}
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
