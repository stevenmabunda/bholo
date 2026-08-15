import { QueryClient } from '@tanstack/react-query';

// A fresh QueryClient per request. Never share one across requests on
// the server — that would leak one user's data into another's cache.
export function makeServerQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
      },
    },
  });
}
