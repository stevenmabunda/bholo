import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { checkIsAdmin } from './actions';

export const metadata = {
  title: 'Back office',
};

/**
 * The gate for everything under /admin.
 *
 * RLS is the real boundary — a non-admin who reached these pages would see
 * nothing regardless. This stops them arriving at all, and returns not-found
 * rather than a refusal so the existence of the area is not advertised.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) notFound();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="flex items-center gap-6 px-4 py-3">
          <Link href="/admin" className="font-bold tracking-tight">
            Back office
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/admin/advertisers" className="hover:text-foreground">
              Advertisers
            </Link>
            <Link href="/home" className="hover:text-foreground">
              Back to BHOLO
            </Link>
          </nav>
        </div>
      </header>
      <main className="px-4 py-6">{children}</main>
    </div>
  );
}
