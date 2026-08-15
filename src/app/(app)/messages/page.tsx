import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/server';
import { makeServerQueryClient } from '@/lib/query-client-server';
import { queryKeys } from '@/lib/query-keys';
import { getConversations } from './actions';
import { MessagesView } from './messages-view';

// Data fetched server-side and shipped in the HTML — see the bookmarks
// page for the reasoning.
export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const queryClient = makeServerQueryClient();

  if (user) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.conversations(user.id),
      queryFn: () => getConversations(user.id),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MessagesView />
    </HydrationBoundary>
  );
}
