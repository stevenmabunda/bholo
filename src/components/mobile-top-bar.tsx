
'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Mail, Bell } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function MobileTopBar() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 10) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <header className={cn(
            "md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm transition-transform duration-300 ease-in-out",
            !isVisible && "-translate-y-full"
        )}>
            <SidebarTrigger asChild>
                <button className="h-8 w-8 rounded-full overflow-hidden">
                    <Avatar className="h-full w-full">
                        <AvatarImage src={profile?.photo_url || undefined} data-ai-hint="user avatar" />
                        <AvatarFallback>{profile?.display_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                </button>
            </SidebarTrigger>
            
            <Link href="/home" aria-label="Home" className="absolute left-1/2 -translate-x-1/2 h-8">
                 <Image src="/bholo_logo.png" alt="BHOLO Logo" width={80} height={32} className="h-full w-auto" />
            </Link>

            <div className="flex items-center gap-1">
                <Link href="/notifications" passHref>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Bell className="h-5 w-5" />
                        <span className="sr-only">Notifications</span>
                    </Button>
                </Link>
                <Link href="/messages" passHref>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-5 w-5" />
                        <span className="sr-only">Messages</span>
                    </Button>
                </Link>
            </div>
        </header>
    );
}
