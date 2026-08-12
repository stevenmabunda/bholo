
'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarNav } from '@/components/sidebar-nav';
import { RightSidebar } from '@/components/right-sidebar';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return null; // The global loader in AuthProvider handles this.
  }
  
  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:flex justify-center h-screen overflow-hidden">
        <div className="flex max-w-7xl mx-auto w-full relative">
          <header className="w-[275px] shrink-0 h-screen">
              <SidebarNav />
          </header>

          <main className="w-full max-w-[624px] border-x">
             <ScrollArea className="h-screen" id="desktop-scroll-area">
                {children}
             </ScrollArea>
          </main>

          <aside className="hidden xl:block w-[350px] shrink-0 h-screen">
            <ScrollArea className="h-full">
                <RightSidebar />
            </ScrollArea>
          </aside>
        </div>
      </div>
      
      {/* Mobile Layout */}
      <div className="md:hidden w-full">
            <main className="w-full pb-16">
              {children}
            </main>
          <MobileBottomNav />
      </div>
    </>
  );
}
