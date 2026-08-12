
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { getOrCreateConversation } from '@/app/(app)/messages/actions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare } from 'lucide-react';

export function MessageButton({ otherUserId }: { otherUserId: string }) {
    const { user } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleMessage = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!user) {
            toast({ variant: 'destructive', description: "You must be logged in to send a message." });
            return;
        }

        setIsLoading(true);
        try {
            const conversationId = await getOrCreateConversation(user.id, otherUserId);
            router.push(`/messages/${conversationId}`);
        } catch (error) {
            console.error("Failed to start conversation:", error);
            toast({ variant: 'destructive', description: "Could not start a conversation. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-8 px-4"
            onClick={handleMessage}
            disabled={isLoading}
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        </Button>
    );
}
