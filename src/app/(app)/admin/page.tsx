import Link from 'next/link';
import { listAdvertisers } from './actions';

export default async function AdminHome() {
  const advertisers = await listAdvertisers();
  const active = advertisers.filter((a) => a.status === 'active').length;
  const campaigns = advertisers.reduce((total, a) => total + a.campaignCount, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Back office</h1>
      <p className="mt-1 text-muted-foreground">
        Advertisers, campaigns and delivery.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-bold tabular-nums">{advertisers.length}</p>
          <p className="text-sm text-muted-foreground">Advertisers</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-bold tabular-nums">{active}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-2xl font-bold tabular-nums">{campaigns}</p>
          <p className="text-sm text-muted-foreground">Campaigns</p>
        </div>
      </div>

      <Link
        href="/admin/advertisers"
        className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
      >
        Manage advertisers →
      </Link>
    </div>
  );
}
