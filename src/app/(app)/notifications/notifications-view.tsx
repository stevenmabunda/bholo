'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Heart, MessageCircle } from "lucide-react";
import { getNotifications, markNotificationsAsRead, type NotificationType } from './actions';
import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";

function NotificationSkeleton() {
    return (
        <div className="flex items-start gap-4 border-b p-4">
            <Skeleton className="h-8 w-8" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
            </div>
        </div>
    )
}

function NotificationItem({ notification }: { notification: NotificationType }) {
    const getIcon = () => {
        switch (notification.type) {
            case 'follow':
                return <UserPlus className="h-6 w-6 text-primary" />;
            case 'like':
                return <Heart className="h-6 w-6 text-red-500 fill-current" />;
            case 'comment':
                return <MessageCircle className="h-6 w-6 text-sky-500" />;
            default:
                return null;
        }
    };

    const getContent = () => {
        switch (notification.type) {
            case 'follow':
                return <p><span className="font-bold">{notification.fromUserName}</span> followed you.</p>;
            case 'like':
                return <p><span className="font-bold">{notification.fromUserName}</span> liked your post.</p>;
            case 'comment':
                return (
                    <>
                        <p><span className="font-bold">{notification.fromUserName}</span> replied to your post:</p>
                        <p className="text-sm text-muted-foreground border-l-2 pl-2 italic">"{notification.postContentSnippet}..."</p>
                    </>
                )
            default:
                return null;
        }
    };

    const linkHref = notification.postId ? `/post/${notification.postId}` : `/profile/${notification.fromUserId}`;

    return (
        <Link href={linkHref} className={cn(
            "flex items-start gap-4 p-4 hover:bg-accent",
            !notification.read && "bg-primary/5"
        )}>
            <div className="w-8 pt-1">
                {getIcon()}
            </div>
            <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={notification.fromUserAvatar} data-ai-hint="user avatar" />
                        <AvatarFallback>{notification.fromUserName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                     <p className="text-sm text-muted-foreground">{notification.formattedTimestamp}</p>
                </div>
                <div className="text-sm">{getContent()}</div>
            </div>
        </Link>
    )
}


export function NotificationsView() {
    const { user } = useAuth();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: queryKeys.notifications(user?.id ?? 'anon'),
        queryFn: () => getNotifications(user!.id),
        enabled: !!user,
        // Shorter than the app default: notifications are the feed where
        // staleness is most noticeable.
        staleTime: 15_000,
    });

    const loading = !!user && isLoading;

    useEffect(() => {
        if (user) markNotificationsAsRead(user.id);
    }, [user]);

    return (
        <div className="flex h-full min-h-screen flex-col">
            <header className="sticky top-0 z-10 border-b bg-background/80 p-4 backdrop-blur-sm">
                <h1 className="text-xl font-bold">Notifications</h1>
            </header>
            <main className="flex-1">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <NotificationSkeleton key={i} />)
                ) : notifications.length > 0 ? (
                    <ul className="divide-y divide-border">
                        {notifications.map((notification) => (
                            <li key={notification.id}>
                                <NotificationItem notification={notification} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-8 text-center text-muted-foreground">
                        <h2 className="text-xl font-bold">No notifications yet</h2>
                        <p>When you have new notifications, they'll appear here.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
