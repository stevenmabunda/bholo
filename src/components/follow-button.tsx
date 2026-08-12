
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { toggleFollow } from '@/app/(app)/profile/actions';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoginOrSignupDialog } from './login-or-signup-dialog';

interface FollowButtonProps {
    profileId: string;
    isFollowing: boolean;
    isLoading?: boolean;
    onToggleFollow: (isFollowing: boolean) => void;
}

export function FollowButton({ profileId, isFollowing, isLoading: isParentLoading = false, onToggleFollow }: FollowButtonProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
    
    const handleFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (!user) {
            setIsLoginDialogOpen(true);
            return;
        }

        setIsUpdating(true);
        const result = await toggleFollow(user.id, profileId, isFollowing);
        if (result.success) {
            onToggleFollow(!isFollowing);
        } else {
             toast({ variant: 'destructive', description: "Something went wrong. Please try again." });
        }
        setIsUpdating(false);
    };

    if (user && user.id === profileId) {
        return null;
    }

    const isLoading = isParentLoading || isUpdating;

    return (
        <>
            <Button
                variant={isFollowing ? 'outline' : 'default'}
                size="sm"
                className={cn("shrink-0 rounded-full font-bold h-8 px-4", !isFollowing && "bg-foreground text-background hover:bg-foreground/90")}
                onClick={handleFollow}
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isFollowing ? 'Following' : 'Follow')}
            </Button>
            <LoginOrSignupDialog isOpen={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen} />
        </>
    );
}
