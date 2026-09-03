import { MatchThreadView } from '@/components/match-thread-view';

// Next 15: params is a Promise and must be awaited.
type Props = {
  params: Promise<{ fixtureId: string }>;
};

export default async function MatchThreadPage({ params }: Props) {
  const { fixtureId } = await params;
  return <MatchThreadView fixtureId={fixtureId} />;
}
