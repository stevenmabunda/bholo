'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function AppQueryProvider({ children }: { children: ReactNode }) {
  // useState (not module scope) so each browser tab/session gets its own
  // client, matching TanStack Query's recommended App Router setup.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Generous by design. Every screen in this app previously
            // refetched from scratch on mount, so each navigation cost
            // a full round trip to the database region before anything
            // rendered. Within this window a revisit renders straight
            // from cache (instantly) and revalidates in the background,
            // which is what makes navigation feel immediate rather than
            // "loading…" every time. Individual queries shorten this
            // where freshness genuinely matters (notifications,
            // messages), and mutations/realtime invalidate explicitly
            // rather than relying on time-based expiry.
            staleTime: 5 * 60_000,
            // Keep data around well beyond staleTime so returning to a
            // screen later in the session still paints instantly while
            // it refreshes behind the scenes.
            gcTime: 30 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
