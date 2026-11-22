import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { WelcomeHero } from '@/components/welcome-hero';

export const metadata: Metadata = {
  title: 'Welcome | BHOLO',
  // This screen exists for the installed app, not for search results.
  robots: { index: false, follow: false },
};

/**
 * Logged-out screen for the installed Android app.
 *
 * The app's start URL carries ?source=twa, so a logged-out launch lands here
 * instead of the marketing homepage. It is the website hero with only Create
 * account and Log in; both open the existing auth dialog. No store badges,
 * Shop links, feature nav, header or footer.
 */
export default async function WelcomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  }

  return <WelcomeHero />;
}
