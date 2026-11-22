import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AuthLayout } from '@/components/auth/auth-layout';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Welcome | BHOLO',
  // This screen exists for the installed app, not for search results.
  robots: { index: false, follow: false },
};

/**
 * Logged-out screen for the installed Android app.
 *
 * The app's start URL carries ?source=twa, so a logged-out launch lands here
 * instead of the marketing homepage. It is deliberately just the hero, logo,
 * tagline and login form: no feature nav, no store badges, no browser-style
 * header or footer, and no marketing collage. Creating an account still works
 * through the link in LoginForm.
 */
export default async function WelcomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  }

  return (
    <AuthLayout chromeless>
      {/* AuthLayout renders the logo and tagline once; the form's own intro
          would repeat both directly underneath. */}
      <LoginForm showIntro={false} />
    </AuthLayout>
  );
}
