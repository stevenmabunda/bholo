import { listAdvertisers } from '../actions';
import { AdvertiserList } from './advertiser-list';

export default async function AdvertisersPage() {
  const advertisers = await listAdvertisers();
  return <AdvertiserList initialAdvertisers={advertisers} />;
}
