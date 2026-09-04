
'use client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export default function LegalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const getTitle = () => {
    switch (pathname) {
      case '/terms':
        return 'Terms of Service';
      case '/privacy':
        return 'Privacy Policy';
      case '/help':
        return 'Help Center';
      case '/feedback':
        return 'Feedback';
      case '/delete-account':
        return 'Delete Account';
      default:
        return 'BHOLO';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-background/80 p-4 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 -ml-2"
          onClick={() => router.back()}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-xl font-bold">{getTitle()}</h1>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
