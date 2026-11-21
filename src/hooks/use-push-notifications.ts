'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export type PushPreferences = {
  goals: boolean;
  kickoff: boolean;
  fulltime: boolean;
};

const DEFAULT_PREFERENCES: PushPreferences = { goals: true, kickoff: true, fulltime: true };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

/**
 * Web Push opt-in for match notifications.
 *
 * Nothing here runs on first load: the browser permission prompt only appears
 * after the person flips the switch, which is both the Chrome installability
 * requirement and the only version of this that isn't spam.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<PushPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canUse =
      typeof window !== 'undefined'
      && 'Notification' in window
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    setSupported(canUse);
    if (!canUse) {
      setLoading(false);
      return;
    }

    setPermission(Notification.permission);

    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!cancelled) setSubscribed(!!subscription && Notification.permission === 'granted');
      } catch (error) {
        console.error('[push] could not read subscription', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    supabase
      .from('push_preferences')
      .select('goals, kickoff, fulltime')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setPreferences({ goals: data.goals, kickoff: data.kickoff, fulltime: data.fulltime });
      });

    return () => { cancelled = true; };
  }, [user]);

  const enable = useCallback(async () => {
    if (!user) throw new Error('Sign in first.');
    if (!supported) throw new Error('This browser does not support push notifications.');

    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') throw new Error('Notifications were blocked for this site.');

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        throw new Error((await response.json().catch(() => ({}))).error ?? 'Could not save this device.');
      }

      setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }, [supported, user]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE',
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  const setPreference = useCallback(
    async (key: keyof PushPreferences, value: boolean) => {
      if (!user) return;
      const next = { ...preferences, [key]: value };
      setPreferences(next);

      const { error } = await supabase.from('push_preferences').upsert(
        { user_id: user.id, ...next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) {
        // Put the switch back if the write failed, rather than leaving the UI
        // claiming a preference that the cron will never honour.
        setPreferences(preferences);
        throw error;
      }
    },
    [preferences, user]
  );

  return {
    supported,
    permission,
    subscribed,
    busy,
    loading,
    preferences,
    enable,
    disable,
    setPreference,
  };
}
