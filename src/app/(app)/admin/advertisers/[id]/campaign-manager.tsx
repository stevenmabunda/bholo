'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Plus } from 'lucide-react';
import { createCampaign, setCampaignStatus, type Campaign } from '../../actions';

const STATUS_STYLES: Record<Campaign['status'], string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_review: 'bg-yellow-500/15 text-yellow-500',
  scheduled: 'bg-blue-500/15 text-blue-400',
  live: 'bg-green-500/15 text-green-500',
  paused: 'bg-muted text-muted-foreground',
  ended: 'bg-muted text-muted-foreground',
};

/** Datetime-local wants the user's wall clock, not a UTC string. */
function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const rands = (cents: number) =>
  `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function CampaignManager({
  advertiser,
  initialCampaigns,
}: {
  advertiser: { id: string; name: string; contactName: string | null; contactEmail: string | null };
  initialCampaigns: Campaign[];
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const tomorrow = new Date(Date.now() + 86400000);
  const inTwoWeeks = new Date(Date.now() + 15 * 86400000);

  const [form, setForm] = useState({
    name: '',
    objective: 'awareness' as Campaign['objective'],
    startsAt: toLocalInput(tomorrow),
    endsAt: toLocalInput(inTwoWeeks),
    rateRands: '',
    rateModel: 'flat' as Campaign['rateModel'],
    frequencyCap: '',
  });

  const handleCreate = async () => {
    setSaving(true);
    const result = await createCampaign({
      advertiserId: advertiser.id,
      name: form.name,
      objective: form.objective,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      rateRands: Number(form.rateRands) || 0,
      rateModel: form.rateModel,
      frequencyCapPerDay: form.frequencyCap ? Number(form.frequencyCap) : null,
    });
    setSaving(false);

    if ('error' in result) {
      toast({ variant: 'destructive', description: result.error });
      return;
    }
    toast({ description: 'Campaign created. Add a creative next.' });
    setShowForm(false);
    router.refresh();
    router.push(`/admin/campaigns/${result.id}`);
  };

  const changeStatus = async (id: string, status: Campaign['status']) => {
    const previous = campaigns;
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    const result = await setCampaignStatus(id, status);
    if ('error' in result) {
      setCampaigns(previous);
      toast({ variant: 'destructive', description: result.error });
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/advertisers" className="text-sm text-muted-foreground hover:text-foreground">
        ← Advertisers
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{advertiser.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {advertiser.contactName || 'No contact'}
            {advertiser.contactEmail ? ` · ${advertiser.contactEmail}` : ''}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="mr-1 h-4 w-4" />
          New campaign
        </Button>
      </div>

      {showForm && (
        <div className="mt-5 space-y-3 rounded-lg border p-4">
          <Input
            placeholder="Campaign name — Derby weekend push"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Starts</span>
              <Input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Ends</span>
              <Input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Objective</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.objective}
                onChange={(e) => setForm({ ...form, objective: e.target.value as Campaign['objective'] })}
              >
                <option value="awareness">Awareness</option>
                <option value="traffic">Traffic</option>
                <option value="engagement">Engagement</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Rate (R)</span>
              <Input
                type="number"
                min="0"
                placeholder="8000"
                value={form.rateRands}
                onChange={(e) => setForm({ ...form, rateRands: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Model</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.rateModel}
                onChange={(e) => setForm({ ...form, rateModel: e.target.value as Campaign['rateModel'] })}
              >
                <option value="flat">Flat fee</option>
                <option value="cpm">Per 1,000 impressions</option>
                <option value="cpc">Per click</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">
              Frequency cap — times one person sees this per day. Blank for no limit.
            </span>
            <Input
              type="number"
              min="1"
              placeholder="3"
              value={form.frequencyCap}
              onChange={(e) => setForm({ ...form, frequencyCap: e.target.value })}
            />
          </label>

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create campaign
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 divide-y rounded-lg border">
        {campaigns.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No campaigns yet for {advertiser.name}.
          </p>
        ) : (
          campaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/campaigns/${campaign.id}`}
                    className="truncate font-semibold hover:underline"
                  >
                    {campaign.name}
                  </Link>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      STATUS_STYLES[campaign.status]
                    )}
                  >
                    {campaign.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {format(new Date(campaign.startsAt), 'd MMM')} –{' '}
                  {format(new Date(campaign.endsAt), 'd MMM yyyy')} ·{' '}
                  {rands(campaign.rateCents)} {campaign.rateModel} ·{' '}
                  {campaign.creativeCount} {campaign.creativeCount === 1 ? 'creative' : 'creatives'}
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                  {campaign.impressions.toLocaleString()} impressions ·{' '}
                  {campaign.clicks.toLocaleString()} clicks
                  {campaign.frequencyCapPerDay ? ` · capped at ${campaign.frequencyCapPerDay}/day` : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  changeStatus(campaign.id, campaign.status === 'live' ? 'paused' : 'live')
                }
              >
                {campaign.status === 'live' ? 'Pause' : 'Go live'}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
