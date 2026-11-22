import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TWA_COOKIE, isTwaCookieValue } from '@/lib/twa';
import { AuthLayout } from '@/components/auth/auth-layout';
import { SignupForm } from '@/components/auth/signup-form';
import { WelcomeHero } from '@/components/welcome-hero';

/**
 * Browser visitors get the existing split layout. The installed app gets the
 * same hero as /welcome with the sign-up dialog already open. The cookie is
 * read on the server so there is no flash of the desktop layout first.
 */
export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  }

  const cookieStore = await cookies();
  const inApp = isTwaCookieValue(cookieStore.get(TWA_COOKIE)?.value);

  if (inApp) {
    return <WelcomeHero initialMode="signup" initialOpen />;
  }

  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
