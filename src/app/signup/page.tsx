import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TWA_COOKIE, isTwaCookieValue } from '@/lib/twa';
import { SignupView } from './signup-view';

/**
 * Browser visitors get the existing split layout. The installed app gets the
 * chromeless hero + form, so /welcome and this screen look like the same app.
 * The cookie is read on the server to avoid a flash of the desktop layout
 * before a client-side detector runs.
 */
export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/home');
  }

  const cookieStore = await cookies();
  const chromeless = isTwaCookieValue(cookieStore.get(TWA_COOKIE)?.value);

  return <SignupView chromeless={chromeless} />;
}
