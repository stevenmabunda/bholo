import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { LandingPage } from '@/components/landing-page';
import { siteUrl } from '@/lib/site';

// Overrides the root layout's title template for just this one page — every
// other page gets "X | BHOLO", but the homepage itself should read as the
// plain brand name search results actually get typed against.
export const metadata: Metadata = {
  title: 'BHOLO — South African Football Banter',
  alternates: { canonical: siteUrl },
};

export default async function RootPage() {
  // A signed-in visitor still goes straight to the feed — this page exists
  // for the logged-out case, which used to redirect to /login before ever
  // rendering anything. See public-paths.ts and landing-page.tsx for why.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  }

  return <LandingPage />;
}
