'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Check, X, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { AD_FORMATS, checkCreative, type SpecCheck } from '@/lib/ad-specs';
import {
  createCreative,
  updateCreative,
  reviewCreative,
  deleteCreative,
  type Creative,
  type Campaign,
} from '../../actions';

const CLUBS = ['Chiefs', 'Pirates', 'Sundowns', 'Wits', 'Arrows', 'Celtic'];

const PLACEMENTS: { value: Creative['placement']; label: string; note: string }[] = [
  { value: 'feed', label: 'In feed', note: 'Renders as a promoted post' },
  { value: 'sidebar', label: 'Sidebar', note: 'Desktop only' },
  { value: 'trend', label: 'Trending slot', note: 'Inside Join the conversation' },
  { value: 'video', label: 'Video feed', note: 'Immersive vertical feed' },
];

const REVIEW_STYLES: Record<Creative['reviewStatus'], string> = {
  pending: 'bg-yellow-500/15 text-yellow-500',
  approved: 'bg-green-500/15 text-green-500',
  rejected: 'bg-destructive/15 text-destructive',
};

export function CreativeManager({
  campaign,
  initialCreatives,
}: {
  campaign: Awaited<ReturnType<typeof import('../../actions').getCampaign>> & object;
  initialCreatives: Creative[];
}) {
  const [creatives, setCreatives] = useState(initialCreatives);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState({
    placement: 'feed' as Creative['placement'],
    mediaUrl: '',
    headline: '',
    body: '',
    ctaLabel: '',
    destinationUrl: '',
    targetClubs: [] as string[],
    mediaWidth: null as number | null,
    mediaHeight: null as number | null,
  });
  const [spec, setSpec] = useState<SpecCheck | null>(null);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);

    // Measure first, so the shape is known before it is ever served and the
    // person uploading hears about a problem now rather than in a week.
    const dimensions = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });

    if (dimensions) setSpec(checkCreative(dimensions.w, dimensions.h));
    // Same bucket and owner-folder convention as post media, so the existing
    // storage policy covers it without a new one.
    const path = `${user.id}/ads/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('post-media').upload(path, file);
    if (error) {
      setUploading(false);
      toast({ variant: 'destructive', description: `Upload failed — ${error.message}` });
      return;
    }
    const { data } = supabase.storage.from('post-media').getPublicUrl(path);
    setForm((f) => ({
      ...f,
      mediaUrl: data.publicUrl,
      mediaWidth: dimensions?.w ?? null,
      mediaHeight: dimensions?.h ?? null,
    }));
    setUploading(false);
  };

  const openEdit = (creative: Creative) => {
    setForm({
      placement: creative.placement,
      mediaUrl: creative.mediaUrl ?? '',
      headline: creative.headline ?? '',
      body: creative.body ?? '',
      ctaLabel: creative.ctaLabel ?? '',
      destinationUrl: creative.destinationUrl ?? '',
      targetClubs: creative.targetClubs ?? [],
      mediaWidth: creative.mediaWidth,
      mediaHeight: creative.mediaHeight,
    });
    setSpec(
      creative.mediaWidth && creative.mediaHeight
        ? checkCreative(creative.mediaWidth, creative.mediaHeight)
        : null
    );
    setEditingId(creative.id);
    setShowForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const result = await updateCreative(editingId, form);
    setSaving(false);

    if ('error' in result) {
      toast({ variant: 'destructive', description: result.error });
      return;
    }

    setCreatives((prev) => prev.map((c) => c.id === editingId ? {
      ...c,
      placement: form.placement,
      mediaUrl: form.mediaUrl || null,
      mediaWidth: form.mediaWidth,
      mediaHeight: form.mediaHeight,
      headline: form.headline || null,
      body: form.body || null,
      ctaLabel: form.ctaLabel || null,
      destinationUrl: form.destinationUrl || null,
      targetClubs: form.targetClubs.length ? form.targetClubs : null,
      reviewStatus: 'pending' as const,
      reviewNote: null,
    } : c));
    setShowForm(false);
    setEditingId(null);
    setSpec(null);
    toast({ description: 'Creative updated — it needs approving again before it serves.' });
  };

  const handleCreate = async () => {
    setSaving(true);
    const result = await createCreative({ campaignId: campaign.id, ...form });
    setSaving(false);

    if ('error' in result) {
      toast({ variant: 'destructive', description: result.error });
      return;
    }

    setCreatives((prev) => [
      {
        id: result.id,
        campaignId: campaign.id,
        placement: form.placement,
        mediaUrl: form.mediaUrl || null,
        mediaWidth: form.mediaWidth,
        mediaHeight: form.mediaHeight,
        headline: form.headline || null,
        body: form.body || null,
        ctaLabel: form.ctaLabel || null,
        destinationUrl: form.destinationUrl || null,
        targetClubs: form.targetClubs.length ? form.targetClubs : null,
        reviewStatus: 'pending',
        reviewNote: null,
        reviewedAt: null,
        impressions: 0,
        clicks: 0,
      },
      ...prev,
    ]);
    setForm({ placement: 'feed', mediaUrl: '', headline: '', body: '', ctaLabel: '', destinationUrl: '', targetClubs: [], mediaWidth: null, mediaHeight: null });
    setSpec(null);
    setShowForm(false);
    toast({ description: 'Creative added. It needs approval before it can serve.' });
  };

  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    let note: string | undefined;
    if (decision === 'rejected') {
      note = window.prompt('Why is this rejected? The advertiser sees this.') ?? undefined;
      if (!note?.trim()) return;
    }
    const previous = creatives;
    setCreatives((prev) =>
      prev.map((c) => (c.id === id ? { ...c, reviewStatus: decision, reviewNote: note ?? null } : c))
    );
    const result = await reviewCreative(id, decision, note);
    if ('error' in result) {
      setCreatives(previous);
      toast({ variant: 'destructive', description: result.error });
    }
  };

  const remove = async (id: string) => {
    const previous = creatives;
    setCreatives((prev) => prev.filter((c) => c.id !== id));
    const result = await deleteCreative(id);
    if ('error' in result) {
      setCreatives(previous);
      toast({ variant: 'destructive', description: result.error });
    }
  };

  const toggleClub = (club: string) =>
    setForm((f) => ({
      ...f,
      targetClubs: f.targetClubs.includes(club)
        ? f.targetClubs.filter((c) => c !== club)
        : [...f.targetClubs, club],
    }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/admin/advertisers/${campaign.advertiserId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {campaign.advertiserName}
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(campaign.startsAt), 'd MMM')} –{' '}
            {format(new Date(campaign.endsAt), 'd MMM yyyy')} · R
            {(campaign.rateCents / 100).toLocaleString('en-ZA')} {campaign.rateModel}
            {campaign.frequencyCapPerDay ? ` · ${campaign.frequencyCapPerDay} per person per day` : ' · uncapped'}
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditingId(null); setShowForm((v) => !v); }}>
          <Plus className="mr-1 h-4 w-4" />
          Creative
        </Button>
      </div>

      {showForm && (
        <div className="mt-5 space-y-3 rounded-lg border p-4">
          <div>
            <p className="mb-1.5 text-sm text-muted-foreground">Placement</p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEMENTS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  variant={form.placement === p.value ? 'default' : 'outline'}
                  className="h-8 rounded-full text-xs"
                  title={p.note}
                  onClick={() => setForm({ ...form, placement: p.value })}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <Input
            placeholder="Headline — Back the Buccaneers this weekend"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
          />
          <Textarea
            placeholder="Body copy"
            rows={2}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Button label — Bet now"
              value={form.ctaLabel}
              onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
            />
            <Input
              type="url"
              placeholder="https://betway.co.za/..."
              value={form.destinationUrl}
              onChange={(e) => setForm({ ...form, destinationUrl: e.target.value })}
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm text-muted-foreground">
              Show to supporters of — none selected means everyone
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CLUBS.map((club) => (
                <Button
                  key={club}
                  type="button"
                  size="sm"
                  variant={form.targetClubs.includes(club) ? 'default' : 'outline'}
                  className="h-8 rounded-full text-xs"
                  onClick={() => toggleClub(club)}
                >
                  {club}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm text-muted-foreground">Image</p>
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {AD_FORMATS.map((f) => `${f.ratio} (${f.pixels})`).join(' · ')}
            </p>
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Measuring and uploading…</p>}
            {spec && !uploading && (
              <div className="mt-1 text-xs">
                <p className={spec.ok ? 'text-green-500' : 'text-yellow-500'}>
                  {form.mediaWidth}×{form.mediaHeight} — {spec.closest}
                  {spec.ok ? ' · within spec' : ''}
                </p>
                {spec.problems.map((problem) => (
                  <p key={problem} className="text-yellow-500">{problem}</p>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={editingId ? handleSaveEdit : handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Save changes' : 'Add creative'}
            </Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>
              Cancel
            </Button>
            {editingId && (
              <p className="self-center text-xs text-yellow-500">
                Saving sends this back for approval.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {creatives.length === 0 ? (
          <p className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No creatives yet. A campaign cannot go live without an approved one.
          </p>
        ) : (
          creatives.map((creative) => (
            <div key={creative.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {creative.placement}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        REVIEW_STYLES[creative.reviewStatus]
                      )}
                    >
                      {creative.reviewStatus}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold">{creative.headline || '(no headline)'}</p>
                  {creative.body && (
                    <p className="text-sm text-muted-foreground">{creative.body}</p>
                  )}
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {creative.impressions.toLocaleString()} impressions ·{' '}
                    {creative.clicks.toLocaleString()} clicks
                    {creative.targetClubs?.length ? ` · ${creative.targetClubs.join(', ')}` : ' · everyone'}
                  </p>
                  {creative.reviewNote && (
                    <p className="mt-1 text-xs text-destructive">Rejected: {creative.reviewNote}</p>
                  )}
                </div>

                {creative.mediaUrl && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border">
                    <Image
                      src={creative.mediaUrl}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(creative)}>
                  Edit
                </Button>
                {creative.reviewStatus !== 'approved' && (
                  <Button size="sm" variant="outline" onClick={() => decide(creative.id, 'approved')}>
                    <Check className="mr-1 h-3.5 w-3.5" />
                    Approve
                  </Button>
                )}
                {creative.reviewStatus !== 'rejected' && (
                  <Button size="sm" variant="outline" onClick={() => decide(creative.id, 'rejected')}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(creative.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
