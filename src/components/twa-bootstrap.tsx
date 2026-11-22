'use client';

import { useEffect } from 'react';
import { detectAndPersistTwaMode } from '@/hooks/use-twa';

/**
 * Persists the installed-app flag in the cookie and sessionStorage on every
 * page, including the ones that never mount the app shell (welcome, shop).
 * Detection is a no-op for ordinary browser visitors.
 */
export function TwaBootstrap() {
  useEffect(() => {
    detectAndPersistTwaMode();
  }, []);

  return null;
}
