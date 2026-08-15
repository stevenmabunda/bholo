
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { getConversations } from './actions';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { formatTimestamp } from '@/lib/utils';
import { cn } from '@/lib/utils';

function ConversationSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-3 w-10" />
        </div>
    );
}

export function MessagesView() {
    const { user } = useAuth();

    const { data: conversations = [], isLoading } = useQuery({
        queryKey: queryKeys.conversations(user?.id ?? 'anon'),
        queryFn: () => getConversations(user!.id),
        enabled: !!user,
        staleTime: 15_000,
    });

    const loading = !!user && isLoading;

    return (
        <div className="flex h-full min-h-screen flex-col">
            <header className="sticky top-0 z-10 border-b bg-background/80 p-4 backdrop-blur-sm">
                <h1 className="text-xl font-bold">Messages</h1>
            </header>
            <main className="flex-1">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <ConversationSkeleton key={i} />)
                ) : conversations.length > 0 ? (
                    <ul className="divide-y divide-border">
                        {conversations.map((convo) => (
                            <li key={convo.id}>
                                <Link href={`/messages/${convo.id}`} className="flex items-start gap-4 p-4 hover:bg-accent">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={convo.otherUser.photoURL} data-ai-hint="user avatar" />
                                        <AvatarFallback>{convo.otherUser.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex items-baseline gap-2">
                                            <p className="font-bold truncate">{convo.otherUser.displayName}</p>
                                            <p className="text-sm text-muted-foreground truncate">@{convo.otherUser.handle}</p>
                                        </div>
                                        <p className={cn("text-sm truncate", convo.isRead ? "text-muted-foreground" : "text-foreground font-semibold")}>
                                            {convo.lastMessage.senderId === user?.id && 'You: '}{convo.lastMessage.text}
                                        </p>
                                    </div>
                                    <time className="text-xs text-muted-foreground flex-shrink-0">
                                        {formatTimestamp(convo.lastMessage.timestamp)}
                                    </time>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-8 text-center text-muted-foreground">
                        <h2 className="text-xl font-bold">No messages yet</h2>
                        <p>When you have new messages, they'll appear here.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
