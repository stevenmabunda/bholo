'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';
import { createAdvertiser, setAdvertiserStatus, type Advertiser } from '../actions';

const STATUS_STYLES: Record<Advertiser['status'], string> = {
  active: 'bg-primary/15 text-primary',
  paused: 'bg-muted text-muted-foreground',
  archived: 'bg-muted text-muted-foreground line-through',
};

export function AdvertiserList({ initialAdvertisers }: { initialAdvertisers: Advertiser[] }) {
  const [advertisers, setAdvertisers] = useState(initialAdvertisers);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const [form, setForm] = useState({ name: '', contactName: '', contactEmail: '', notes: '' });

  const handleCreate = async () => {
    setSaving(true);
    const result = await createAdvertiser(form);
    setSaving(false);

    if ('error' in result) {
      toast({ variant: 'destructive', description: result.error });
      return;
    }

    setAdvertisers((prev) => [
      {
        id: result.id,
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        status: 'active',
        notes: form.notes.trim() || null,
        createdAt: new Date().toISOString(),
        campaignCount: 0,
      },
      ...prev,
    ]);
    setForm({ name: '', contactName: '', contactEmail: '', notes: '' });
    setShowForm(false);
    toast({ description: `${result.id ? form.name.trim() : 'Advertiser'} added.` });
  };

  const handleStatus = (id: string, status: Advertiser['status']) => {
    const previous = advertisers;
    setAdvertisers((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));

    startTransition(async () => {
      const result = await setAdvertiserStatus(id, status);
      if ('error' in result) {
        setAdvertisers(previous);
        toast({ variant: 'destructive', description: result.error });
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advertisers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The companies buying inventory. Campaigns hang off these.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((open) => !open)}>
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      {showForm && (
        <div className="mt-5 space-y-3 rounded-lg border p-4">
          <Input
            placeholder="Company name — Betway"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Contact name"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
            <Input
              type="email"
              placeholder="Contact email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Notes — agency, rate agreed, anything worth remembering"
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save advertiser
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 divide-y rounded-lg border">
        {advertisers.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No advertisers yet. Add the first one when a deal is agreed.
          </p>
        ) : (
          advertisers.map((advertiser) => (
            <div key={advertiser.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/advertisers/${advertiser.id}`}
                    className="truncate font-semibold hover:underline"
                  >
                    {advertiser.name}
                  </Link>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      STATUS_STYLES[advertiser.status]
                    )}
                  >
                    {advertiser.status}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {advertiser.contactName || advertiser.contactEmail || 'No contact yet'}
                  {' · '}
                  {advertiser.campaignCount}{' '}
                  {advertiser.campaignCount === 1 ? 'campaign' : 'campaigns'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  handleStatus(advertiser.id, advertiser.status === 'active' ? 'paused' : 'active')
                }
              >
                {advertiser.status === 'active' ? 'Pause' : 'Activate'}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
