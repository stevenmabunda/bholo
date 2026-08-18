import { notFound } from 'next/navigation';
import { getAdvertiser, listCampaigns } from '../../actions';
import { CampaignManager } from './campaign-manager';

export default async function AdvertiserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const advertiser = await getAdvertiser(id);
  if (!advertiser) notFound();

  const campaigns = await listCampaigns(id);
  return <CampaignManager advertiser={advertiser} initialCampaigns={campaigns} />;
}
