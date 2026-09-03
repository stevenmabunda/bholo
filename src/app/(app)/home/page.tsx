import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { makeServerQueryClient } from '@/lib/query-client-server';
import { queryKeys } from '@/lib/query-keys';
import { createClient } from '@/lib/supabase/server';
import { getRecentPosts } from './actions';
import { HomeView } from './home-view';

// The feed is fetched during the request and shipped in the HTML.
// This is the screen you land on every time, so it's the one where a
// post-mount fetch was most expensive: the whole timeline used to be a
// column of skeletons until a round trip to the database region came
// back. PostProvider's feed query reads the same key, so it hydrates
// from this instead of refetching, and its realtime/pagination
// behaviour is untouched.
export default async function HomePage() {
  const queryClient = makeServerQueryClient();

  // Must match PostProvider's feedUserId exactly, or this prefetch hydrates
  // a cache entry the client query never reads and fetches again anyway.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const feedUserId = user?.id ?? 'anonymous';

  await queryClient.prefetchQuery({
    queryKey: queryKeys.feed(feedUserId),
    queryFn: () => getRecentPosts({ limit: 20 }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeView />
    </HydrationBoundary>
  );
}
