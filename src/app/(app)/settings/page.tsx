import { NotificationSettings } from '@/components/settings/notification-settings';

export const metadata = {
  title: 'Settings',
};

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 p-4 backdrop-blur-sm">
        <h1 className="text-xl font-bold">Settings</h1>
      </header>
      <main className="flex-1 space-y-4 p-4">
        <NotificationSettings />
      </main>
    </div>
  );
}
