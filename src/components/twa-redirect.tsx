'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { detectAndPersistTwaMode } from '@/hooks/use-twa';

/**
 * Last-resort client signal for an installed app launch that did not carry
 * ?source=twa (an existing install, or a standalone PWA). The server cannot
 * see display-mode or the Android referrer, so if either says "installed",
 * persist the flag and leave the marketing page.
 */
export function TwaRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!detectAndPersistTwaMode()) return;
    router.replace(user ? '/home' : '/welcome');
  }, [loading, user, router]);

  return null;
}
