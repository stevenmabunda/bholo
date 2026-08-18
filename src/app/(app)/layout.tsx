
'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarNav } from '@/components/sidebar-nav';
import { RightSidebar } from '@/components/right-sidebar';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
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
    // One tree, shaped by breakpoint. It used to be two — a desktop block and
    // a mobile block, each containing {children} — which mounted the entire
    // page twice and hid one with CSS. Every query, effect and subscription in
    // the app ran in duplicate, and a hidden copy still does all the work.
    <>
      <div className="flex justify-center md:h-screen md:overflow-hidden">
        <div className="relative mx-auto flex w-full max-w-7xl">
          <header className="hidden md:block w-[275px] shrink-0 h-screen">
            <SidebarNav />
          </header>

          {/* The scroller on desktop; on a phone the page itself scrolls and
              this is just the column. getFeedScroller() resolves whichever it
              is for anything saving a scroll position. */}
          <main
            id="desktop-scroll-area"
            className="no-scrollbar w-full pb-[calc(4rem+env(safe-area-inset-bottom))] md:max-w-[624px] md:border-x md:h-screen md:overflow-y-auto md:pb-0"
          >
            {children}
          </main>

          <aside className="no-scrollbar hidden xl:block w-[350px] shrink-0 h-screen overflow-y-auto">
            <RightSidebar />
          </aside>
        </div>
      </div>

      {/* Already md:hidden internally. */}
      <MobileBottomNav />
    </>
  );
}
