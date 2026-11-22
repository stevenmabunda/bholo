'use client';

import { useEffect, useState } from 'react';
import {
  TWA_COOKIE,
  TWA_COOKIE_VALUE,
  TWA_QUERY_PARAM,
  TWA_REFERRER_PREFIX,
  buildTwaCookieString,
  hasTwaCookie,
  isTwaQuery,
} from '@/lib/twa';

function hasSessionFlag(): boolean {
  try {
    return sessionStorage.getItem(TWA_COOKIE) === TWA_COOKIE_VALUE;
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  // iOS home-screen apps: not a TWA, but the same "don't show a website
  // download prompt" rule applies.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return media || iosStandalone;
}

function hasAndroidReferrer(): boolean {
  return typeof document !== 'undefined' && document.referrer.startsWith(TWA_REFERRER_PREFIX);
}

/** Writes both the server-readable cookie and the session-only flag. */
export function persistTwaMode(): void {
  if (typeof document === 'undefined') return;
  document.cookie = buildTwaCookieString();
  try {
    sessionStorage.setItem(TWA_COOKIE, TWA_COOKIE_VALUE);
  } catch {
    // Private mode / blocked storage: the cookie is enough.
  }
}

/**
 * Detects in-app mode from every signal available in the browser and persists
 * it. Call from an effect or an event handler, never during render.
 */
export function detectAndPersistTwaMode(): boolean {
  if (typeof window === 'undefined') return false;

  const fromQuery = isTwaQuery(
    new URLSearchParams(window.location.search).get(TWA_QUERY_PARAM)
  );
  const fromCookie = hasTwaCookie(document.cookie);
  const fromSession = hasSessionFlag();
  const detected = fromQuery || fromCookie || fromSession || isStandalone() || hasAndroidReferrer();

  if (detected && !(fromCookie && fromSession)) {
    persistTwaMode();
  }

  return detected;
}

/**
 * True when this page is running inside the installed app. Starts false so
 * server and client agree on the first paint; the effect flips it after mount.
 */
export function useTwaMode(): boolean {
  const [isTwa, setIsTwa] = useState(false);

  useEffect(() => {
    setIsTwa(detectAndPersistTwaMode());
  }, []);

  return isTwa;
}
