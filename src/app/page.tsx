import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { LandingPage } from '@/components/landing-page';
import { siteUrl } from '@/lib/site';
import {
  TWA_COOKIE,
  TWA_QUERY_PARAM,
  isTwaCookieValue,
  isTwaQuery,
} from '@/lib/twa';

// Overrides the root layout's title template for just this one page — every
// other page gets "X | BHOLO", but the homepage itself should read as the
// plain brand name search results actually get typed against.
export const metadata: Metadata = {
  title: "BHOLO — South Africa's Football-Exclusive Social Network",
  description:
    "Join Mzansi's official football timeline. BHOLO is South Africa's football-exclusive social network — Betway Premiership banter, PSL fixtures and standings, and the clubs, players and fans who make the game what it is.",
  alternates: { canonical: siteUrl },
};

type RootPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RootPage({ searchParams }: RootPageProps) {
  const params = await searchParams;
  const source = params[TWA_QUERY_PARAM];
  const cookieStore = await cookies();

  // The installed app sends ?source=twa on its start URL, and middleware
  // persists that as a cookie. Either signal means this request must not
  // render the marketing page — a browser visitor and every crawler still see
  // LandingPage exactly as before.
  const isTwa =
    isTwaQuery(Array.isArray(source) ? source[0] : source) ||
    isTwaCookieValue(cookieStore.get(TWA_COOKIE)?.value);

  // A signed-in visitor still goes straight to the feed — this page exists
  // for the logged-out case, which used to redirect to /login before ever
  // rendering anything. See public-paths.ts and landing-page.tsx for why.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  }

  if (isTwa) {
    redirect('/welcome');
  }

  return <LandingPage />;
}
