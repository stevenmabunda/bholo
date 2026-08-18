
'use client';
import { TrendingTopics } from "@/components/trending-topics";
import { SidebarAd } from "@/components/sidebar-ad";
import { WhoToFollow } from "./who-to-follow";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FixturesWidget } from "./fixtures-widget";

// Layout note: (app)/layout.tsx already wraps this in a sized <aside>
// and a ScrollArea. This used to render a second <aside> with its own
// h-screen, sticky and overflow-y-auto, which put a scroll container
// inside a scroll container — the inner scrollbar ate width off the
// right edge, clipping the card borders and the search field. This is
// now plain content that fills whatever the parent gives it.
export function RightSidebar() {
  const router = useRouter();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = e.currentTarget.value;
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 pb-4">
      {/* Stays pinned while the rest of the column scrolls, as on X. */}
      <div className="sticky top-0 z-10 bg-background pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
              placeholder="Search BHOLO"
              className="pl-11 h-11 rounded-full bg-secondary border-transparent focus-visible:border-primary"
              onKeyDown={handleSearch}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-border overflow-hidden">
        <div className="p-4">
          <FixturesWidget />
        </div>
      </section>

      <section className="rounded-2xl border border-border overflow-hidden">
        <div className="p-4">
          <TrendingTopics />
        </div>
      </section>

      {/* Renders nothing when there is no sidebar creative, rather than an
          empty bordered box labelled Sponsored. */}
      <SidebarAd />

      <section className="rounded-2xl border border-border overflow-hidden">
        <div className="p-4">
          <WhoToFollow />
        </div>
      </section>

      <footer className="mt-auto pt-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
                <Link href="/terms" className="hover:underline">Terms</Link>
                <Link href="/privacy" className="hover:underline">Privacy</Link>
                <Link href="/help" className="hover:underline">Help</Link>
                <Link href="/feedback" className="hover:underline">Feedback</Link>
            </div>
            <p className="mt-1">© 2025 BHOLO Sports.</p>
        </footer>
    </div>
  );
}
