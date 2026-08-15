import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { makeServerQueryClient } from '@/lib/query-client-server';
import { queryKeys } from '@/lib/query-keys';
import { getUserProfile, getUserPosts } from '@/app/(app)/profile/actions';
import { ProfileView } from './profile-view';

// Next 15: params is a Promise and must be awaited.
type Props = {
  params: Promise<{ id: string }>;
};

// Profile and its posts are fetched server-side, in parallel, and
// shipped in the HTML. The client view reads the same two cache keys,
// so arriving at a profile shows the header and timeline immediately
// rather than two skeletons.
export default async function ProfilePage({ params }: Props) {
  const { id: profileId } = await params;
  const queryClient = makeServerQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.profile(profileId),
      queryFn: () => getUserProfile(profileId),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.profilePosts(profileId, 'posts'),
      queryFn: () => getUserPosts(profileId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfileView />
    </HydrationBoundary>
  );
}
