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
            // Data doesn't refetch just because a component remounted
            // within this window - this is the whole point: repeat
            // navigations render from cache instead of showing a
            // skeleton every time. Individual queries override this
            // where a shorter/longer window makes sense.
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
