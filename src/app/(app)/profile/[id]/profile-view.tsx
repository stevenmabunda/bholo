

'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Post } from "@/components/post";
import Image from "next/image";
import { MapPin, Link as LinkIcon, CalendarDays, Camera, Loader2, ArrowLeft, Heart, Globe, RefreshCw, PlayCircle, Move } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PostSkeleton } from "@/components/post-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useParams, useRouter } from "next/navigation";
import { getUserProfile, getIsFollowing, toggleFollow, type ProfileData, getLikedPosts, updateUserPosts, getMediaPosts, getUserPosts } from "../actions";
import { FollowButton } from "@/components/follow-button";
import type { PostType } from "@/lib/data";
import { FollowListDialog } from "@/components/follow-list-dialog";
import { MessageButton } from "@/components/message-button";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { ScrollArea } from "@/components/ui/scroll-area";


const profileFormSchema = z.object({
    displayName: z.string().min(2, "Name must be at least 2 characters."),
    handle: z.string()
        .min(3, "Username must be at least 3 characters.")
        .max(20, "Username must not exceed 20 characters.")
        .regex(/^[a-z0-9_]+$/i, "Username can only contain letters, numbers and underscores.")
        .transform((v) => v.toLowerCase()),
    bio: z.string().max(160, "Bio must not exceed 160 characters.").optional(),
    location: z.string().max(30, "Location must not exceed 30 characters.").optional(),
    country: z.string().max(50, "Country must not exceed 50 characters.").optional(),
    favouriteClub: z.string().max(50, "Club name must not exceed 50 characters.").optional(),
});


export function ProfileView() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileId = params.id as string;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  // Which secondary tabs have been opened — their data is fetched lazily
  // the first time you visit the tab, then cached like everything else.
  const [openedTabs, setOpenedTabs] = useState<Set<string>>(new Set());

  const isMyProfile = currentUser?.id === profileId;

  // Profile and posts run in PARALLEL. Previously posts were chained
  // behind the profile fetch (fetchProfileData().then(fetchPosts)),
  // so the page paid two sequential round trips to the database region
  // before it could show anything.
  const { data: profile = null, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.profile(profileId),
    queryFn: () => getUserProfile(profileId),
    enabled: !!profileId,
  });

  const { data: userPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: queryKeys.profilePosts(profileId, 'posts'),
    queryFn: () => getUserPosts(profileId),
    enabled: !!profileId,
  });

  const { data: fetchedIsFollowing = false, isLoading: followLoading } = useQuery({
    queryKey: ['profile', profileId, 'is-following', currentUser?.id ?? 'anon'],
    queryFn: () => getIsFollowing(currentUser!.id, profileId),
    enabled: !!profileId && !!currentUser && currentUser.id !== profileId,
  });

  const isFollowing = followOverride ?? fetchedIsFollowing;
  const setIsFollowing = (value: boolean) => setFollowOverride(value);

  const { data: likedPosts = [], isLoading: likedPostsLoading } = useQuery({
    queryKey: queryKeys.profilePosts(profileId, 'likes'),
    queryFn: () => getLikedPosts(profileId),
    enabled: !!profileId && openedTabs.has('likes'),
  });

  const { data: mediaPosts = [], isLoading: mediaPostsLoading } = useQuery({
    queryKey: queryKeys.profilePosts(profileId, 'media'),
    queryFn: () => getMediaPosts(profileId),
    enabled: !!profileId && openedTabs.has('media'),
  });

  useEffect(() => {
    if (profile) {
      document.title = `${profile.displayName} (@${profile.handle}) | BHOLO`;
    }
    return () => {
      document.title = 'BHOLO';
    };
  }, [profile]);

  // Re-read profile + posts after an edit saves.
  const fetchProfileData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(profileId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.profilePosts(profileId, 'posts') }),
    ]);
  }, [queryClient, profileId]);

  const handleTabChange = (value: string) => {
    if (value === 'likes' || value === 'media') {
      setOpenedTabs(prev => prev.has(value) ? prev : new Set(prev).add(value));
    }
  };

  // A profile that resolved to nothing doesn't exist — bounce home.
  useEffect(() => {
    if (!profileLoading && profileId && profile === null) {
      toast({ variant: 'destructive', title: "Error", description: "Profile not found." });
      router.push('/home');
    }
  }, [profileLoading, profile, profileId, toast, router]);


  if (authLoading || profileLoading || !currentUser) {
      return (
        <div>
            <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-4 backdrop-blur-sm">
                 <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <h1 className="text-xl font-bold">Profile</h1>
            </header>
            <div className="relative h-36 w-full bg-muted sm:h-48">
                <Skeleton className="h-full w-full" />
            </div>
             <div className="p-4">
                <div className="relative -mt-16 sm:-mt-20">
                     <Skeleton className="h-24 w-24 rounded-full border-4 border-background sm:h-32 sm:w-32" />
                </div>
                 <div className="mt-4 space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-full max-w-lg" />
                 </div>
             </div>
        </div>
      );
  }
  
  if (!profile) {
    return (
        <div>
            <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-4 backdrop-blur-sm">
                 <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => router.back()}>
                    <ArrowLeft />
                </Button>
                <h1 className="text-xl font-bold">Profile not found</h1>
            </header>
            <div className="p-8 text-center text-muted-foreground">
                <p>This user may not exist.</p>
            </div>
        </div>
    )
  }
  
  return (
    <div>
       <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-4 backdrop-blur-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={() => router.back()}>
                <ArrowLeft />
            </Button>
            <div>
                <h1 className="text-xl font-bold">{profile.displayName}</h1>
                <p className="text-sm text-muted-foreground">{userPosts.length} posts</p>
            </div>
       </header>
      <div className="relative h-36 w-full bg-muted sm:h-48">
        <Image
          src={profile.bannerUrl}
          alt="Profile banner"
          fill
          className="object-cover"
          style={{ objectPosition: `center ${profile.bannerPosition || 50}%` }}
          priority
          data-ai-hint="stadium lights"
        />
      </div>
      <div className="p-4">
        <div className="relative -mt-16 flex justify-between sm:-mt-20">
          <Avatar className="h-24 w-24 border-4 border-background sm:h-32 sm:w-32">
            <AvatarImage src={profile.photoURL} data-ai-hint="football player" />
            <AvatarFallback>{profile.displayName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
            {isMyProfile ? (
              <Button variant="outline" className="mt-20 sm:mt-24" onClick={() => setIsEditDialogOpen(true)}>
                Edit profile
              </Button>
            ) : (
                <div className="mt-20 sm:mt-24 flex items-center gap-2">
                    <MessageButton otherUserId={profile.uid} />
                    <FollowButton 
                        profileId={profile.uid} 
                        isFollowing={isFollowing}
                        isLoading={followLoading}
                        onToggleFollow={setIsFollowing}
                    />
                </div>
            )}
        </div>
        <div className="mt-4">
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-muted-foreground">@{profile.handle}</p>
        </div>
        {profile.bio && <div className="mt-4"><p>{profile.bio}</p></div>}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}
          {profile.country && (
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span>{profile.country}</span>
            </div>
          )}
          {profile.favouriteClub && (
            <div className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>{profile.favouriteClub}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            <span>Joined {profile.joined}</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
          <FollowListDialog profileId={profile.uid} type="following">
            <div className="cursor-pointer hover:underline">
              <span className="font-bold">{profile.followingCount}</span>
              <span className="text-muted-foreground"> Following</span>
            </div>
          </FollowListDialog>
          <FollowListDialog profileId={profile.uid} type="followers">
            <div className="cursor-pointer hover:underline">
              <span className="font-bold">{profile.followersCount}</span>
              <span className="text-muted-foreground"> Followers</span>
            </div>
          </FollowListDialog>
        </div>
      </div>
      {isMyProfile && (
        <EditProfileDialog 
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            profile={profile}
            onProfileUpdate={fetchProfileData}
        />
      )}
      <Tabs defaultValue="posts" className="w-full border-t" onValueChange={handleTabChange}>
        <TabsList className="flex w-full justify-around rounded-none border-b bg-transparent p-0">
          <TabsTrigger value="posts" className="flex-1 rounded-none py-3 text-sm font-semibold text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Posts</TabsTrigger>
          <TabsTrigger value="media" className="flex-1 rounded-none py-3 text-sm font-semibold text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Media</TabsTrigger>
          <TabsTrigger value="likes" className="flex-1 rounded-none py-3 text-sm font-semibold text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Likes</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <div className="divide-y divide-border">
            {postsLoading ? (
                <>
                    <PostSkeleton />
                    <PostSkeleton />
                </>
            ) : userPosts.length > 0 ? (
                userPosts.map(post => <Post key={post.id} {...post} />)
            ) : (
                <div className="p-8 text-center text-muted-foreground">No posts yet.</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="media">
            {mediaPostsLoading ? (
                 <div className="grid grid-cols-3 gap-1 p-1">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="aspect-square w-full" />
                    ))}
                 </div>
            ) : mediaPosts.length > 0 ? (
                 <div className="grid grid-cols-3 gap-1">
                    {mediaPosts.flatMap(post => 
                        post.media
                            ?.filter(media => media.type === 'image')
                            .map((media, index) => (
                                <Link key={`${post.id}-${index}`} href={`/post/${post.id}`} className="relative aspect-square w-full block group bg-secondary">
                                    <Image
                                        src={media.url}
                                        alt={`Media from post ${post.id}`}
                                        fill
                                        className="object-cover"
                                        data-ai-hint={media.hint || 'user content'}
                                    />
                                </Link>
                            )) ?? []
                    )}
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    <h2 className="text-xl font-bold">No media yet</h2>
                    <p>When {isMyProfile ? "you post" : `@${profile.handle} posts`} with images or videos, they'll appear here.</p>
                </div>
            )}
        </TabsContent>
        <TabsContent value="likes">
             <div className="divide-y divide-border">
                {likedPostsLoading ? (
                    <>
                        <PostSkeleton />
                        <PostSkeleton />
                        <PostSkeleton />
                    </>
                ) : likedPosts.length > 0 ? (
                    likedPosts.map(post => <Post key={post.id} {...post} />)
                ) : (
                    <div className="p-8 text-center text-muted-foreground">
                        <h2 className="text-xl font-bold">No liked posts yet</h2>
                        <p>When {isMyProfile ? "you like" : `@${profile.handle} likes`} posts, they'll appear here.</p>
                    </div>
                )}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Edit Profile Dialog Component
function EditProfileDialog({ isOpen, onOpenChange, profile, onProfileUpdate }: { isOpen: boolean, onOpenChange: (open: boolean) => void, profile: ProfileData | null, onProfileUpdate: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>(profile?.photoURL || '');
    const [bannerPreview, setBannerPreview] = useState<string>(profile?.bannerUrl || '');
    
    // State for banner repositioning
    const [bannerPosition, setBannerPosition] = useState(profile?.bannerPosition || 50); // In percentage
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ y: 0, position: 0 });
    const bannerRef = useRef<HTMLDivElement>(null);


    const avatarInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    
    const form = useForm({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            displayName: profile?.displayName || '',
            handle: profile?.handle || '',
            bio: profile?.bio || '',
            location: profile?.location || '',
            country: profile?.country || '',
            favouriteClub: profile?.favouriteClub || '',
        },
    });
    
    useEffect(() => {
        if (profile && isOpen) {
            form.reset({
                displayName: profile.displayName || '',
                handle: profile.handle || '',
                bio: profile.bio || '',
                location: profile.location || '',
                country: profile.country || '',
                favouriteClub: profile.favouriteClub || '',
            });
            setAvatarPreview(profile.photoURL);
            setBannerPreview(profile.bannerUrl);
            setBannerPosition(profile.bannerPosition || 50);
        }
    }, [profile, form, isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
        const file = e.target.files?.[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            if (type === 'avatar') {
                setAvatarFile(file);
                setAvatarPreview(previewUrl);
            } else {
                setBannerFile(file);
                setBannerPreview(previewUrl);
                setBannerPosition(50); // Reset position for new banner
            }
        }
    };
    
    // Banner dragging handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { y: e.clientY, position: bannerPosition };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !bannerRef.current) return;
        const bannerHeight = bannerRef.current.offsetHeight;
        const deltaY = e.clientY - dragStartRef.current.y;
        const deltaPercent = (deltaY / bannerHeight) * 100;
        
        let newPosition = dragStartRef.current.position + deltaPercent;
        newPosition = Math.max(0, Math.min(100, newPosition)); // Clamp between 0 and 100
        setBannerPosition(newPosition);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };
    
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove as any);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove as any);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove]);


    const uploadImage = async (file: File, bucket: 'avatars' | 'banners', userId: string): Promise<string> => {
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
        return publicUrl;
    };

    const onSubmit = async (data: z.infer<typeof profileFormSchema>) => {
        if (!user || !profile) return;
        setIsSaving(true);
        try {
            let newAvatarUrl = profile.photoURL;
            if (avatarFile) {
                newAvatarUrl = await uploadImage(avatarFile, 'avatars', user.id);
            }

            let newBannerUrl = profile.bannerUrl;
            if (bannerFile) {
                newBannerUrl = await uploadImage(bannerFile, 'banners', user.id);
            }

            const { error } = await supabase.from('profiles').update({
                display_name: data.displayName,
                handle: data.handle,
                photo_url: newAvatarUrl,
                bio: data.bio,
                location: data.location,
                country: data.country,
                favourite_club: data.favouriteClub,
                banner_url: newBannerUrl,
                banner_position: Math.round(bannerPosition),
            }).eq('id', user.id);

            if (error) throw error;

            // Denormalized author fields on existing posts/comments are not
            // backfilled automatically — call updateUserPosts(user.id) if needed.

            toast({ title: "Success", description: "Profile updated!" });
            onProfileUpdate();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error updating profile:", error);
            const isHandleTaken = error?.code === '23505';
            toast({
                variant: 'destructive',
                title: "Error",
                description: isHandleTaken
                    ? "That username is already taken. Please choose another."
                    : "Failed to update profile.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!profile) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="flex flex-col h-full max-h-[90vh] sm:max-h-[800px]">
                <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                     <DialogDescription>
                        Make changes to your profile here. Click save when you're done. 
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 pr-6 -mr-6">
                    <div className="space-y-4">
                        <div 
                            ref={bannerRef}
                            className={cn("relative h-32 w-full bg-muted sm:h-40 rounded-md overflow-hidden", isDragging ? "cursor-grabbing" : "cursor-grab")}
                            onMouseDown={handleMouseDown}
                        >
                            <Image 
                                src={bannerPreview} 
                                alt="Banner preview" 
                                fill 
                                className="object-cover" 
                                style={{ objectPosition: `center ${bannerPosition}%` }}
                                draggable="false"
                             />
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white space-y-2 pointer-events-none">
                                <div className="flex items-center gap-4">
                                     <button 
                                        type="button" 
                                        className="p-2 rounded-full bg-black/50 hover:bg-black/75 pointer-events-auto" 
                                        onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click();}}
                                    >
                                        <Camera className="h-5 w-5" />
                                    </button>
                                     <div className="flex items-center gap-1">
                                        <Move className="h-5 w-5" />
                                        <span className="text-xs font-semibold">Drag to reposition</span>
                                     </div>
                                </div>
                            </div>
                             <input type="file" accept="image/*" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} className="hidden" />
                        </div>

                        <div className="relative -mt-12 ml-4 h-24 w-24">
                            <Avatar className="h-24 w-24 border-4 border-background">
                                <AvatarImage src={avatarPreview} />
                                <AvatarFallback>{profile.displayName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
                                <Button size="icon" type="button" variant="ghost" className="text-white hover:bg-black/50" onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click();}}>
                                    <Camera className="h-6 w-6" />
                                </Button>
                                <input type="file" accept="image/*" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
                            </div>
                        </div>
                        
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                            <Controller name="displayName" control={form.control} render={({ field }) => <Input placeholder="Name" {...field} />} />
                            {form.formState.errors.displayName && <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>}

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">@</span>
                                <Controller name="handle" control={form.control} render={({ field }) => <Input placeholder="username" className="pl-7" {...field} />} />
                            </div>
                            {form.formState.errors.handle && <p className="text-sm text-destructive">{form.formState.errors.handle.message}</p>}

                            <Controller name="bio" control={form.control} render={({ field }) => <Textarea placeholder="Bio" {...field} />} />
                            {form.formState.errors.bio && <p className="text-sm text-destructive">{form.formState.errors.bio.message}</p>}

                            <Controller name="location" control={form.control} render={({ field }) => <Input placeholder="Location" {...field} />} />
                            {form.formState.errors.location && <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>}

                            <Controller name="country" control={form.control} render={({ field }) => <Input placeholder="Country" {...field} />} />
                            {form.formState.errors.country && <p className="text-sm text-destructive">{form.formState.errors.country.message}</p>}

                            <Controller name="favouriteClub" control={form.control} render={({ field }) => <Input placeholder="Favourite Club" {...field} />} />
                            {form.formState.errors.favouriteClub && <p className="text-sm text-destructive">{form.formState.errors.favouriteClub.message}</p>}
                        </form>
                    </div>
                </ScrollArea>
                <DialogFooter className="pt-4 border-t">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


    

    




    


    


