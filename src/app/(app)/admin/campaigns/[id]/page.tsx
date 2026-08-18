import { notFound } from 'next/navigation';
import { getCampaign, listCreatives } from '../../actions';
import { CreativeManager } from './creative-manager';

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const creatives = await listCreatives(id);
  return <CreativeManager campaign={campaign} initialCreatives={creatives} />;
}
