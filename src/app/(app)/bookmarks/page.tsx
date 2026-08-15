import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/server';
import { makeServerQueryClient } from '@/lib/query-client-server';
import { queryKeys } from '@/lib/query-keys';
import { getBookmarkedPosts } from './actions';
import { BookmarksView } from './bookmarks-view';

// Server component: the data is fetched here, during the request, and
// shipped inside the HTML. Previously the browser had to mount the page
// and only then start a round trip to the database region before it
// could show anything — so first paint was always a skeleton followed
// by a wait. Now the list is already there on arrival, and the client
// cache picks it up rather than refetching.
export default async function BookmarksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const queryClient = makeServerQueryClient();

  if (user) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.bookmarks(user.id),
      queryFn: () => getBookmarkedPosts(user.id),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BookmarksView />
    </HydrationBoundary>
  );
}
