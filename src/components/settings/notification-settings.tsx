'use client';

import { Bell, CalendarClock, Flag, Goal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { usePushNotifications, type PushPreferences } from '@/hooks/use-push-notifications';
import { useToast } from '@/hooks/use-toast';

const CHANNELS: { key: keyof PushPreferences; title: string; body: string; icon: typeof Bell }[] = [
  { key: 'goals', title: 'Goals', body: 'When either club in your match scores.', icon: Goal },
  { key: 'kickoff', title: 'Kick-off', body: 'When a match involving your club starts.', icon: CalendarClock },
  { key: 'fulltime', title: 'Final whistle', body: 'The result as soon as the match ends.', icon: Flag },
];

export function NotificationSettings() {
  const { toast } = useToast();
  const {
    supported,
    permission,
    subscribed,
    busy,
    loading,
    preferences,
    enable,
    disable,
    setPreference,
  } = usePushNotifications();

  const handleToggle = async (next: boolean) => {
    try {
      if (next) {
        await enable();
        toast({ description: 'Match notifications are on for this device.' });
      } else {
        await disable();
        toast({ description: 'Match notifications are off for this device.' });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Could not change notifications.',
      });
    }
  };

  const handlePreference = async (key: keyof PushPreferences, value: boolean) => {
    try {
      await setPreference(key, value);
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Could not save that preference.',
      });
    }
  };

  if (loading) return null;

  return (
    <section className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold">Match notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Goals, kick-off and the final whistle for your club, on this device.
          </p>
        </div>
        <Switch
          checked={subscribed}
          disabled={!supported || busy || loading}
          onCheckedChange={handleToggle}
          aria-label="Enable match notifications on this device"
        />
      </div>

      {!supported && (
        <p className="mt-3 text-sm text-muted-foreground">
          This browser does not support push notifications. Install BHOLO to your home screen and try again.
        </p>
      )}

      {supported && permission === 'denied' && (
        <p className="mt-3 text-sm text-muted-foreground">
          Notifications are blocked for this site. Allow them in your browser’s site settings, then reload.
        </p>
      )}

      {supported && subscribed && (
        <div className="mt-4 space-y-4 border-t pt-4">
          {CHANNELS.map(({ key, title, body, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{body}</p>
                </div>
              </div>
              <Switch
                checked={preferences[key]}
                disabled={busy}
                onCheckedChange={(value) => handlePreference(key, value)}
                aria-label={`Notify me about ${title.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      )}

      {!subscribed && supported && (
        <Button className="mt-4 rounded-full" onClick={() => handleToggle(true)} disabled={busy}>
          {busy ? 'Turning on…' : 'Turn on notifications'}
        </Button>
      )}
    </section>
  );
}
