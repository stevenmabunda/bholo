// Single source of truth for query keys, so caches can be read/written
// consistently from anywhere (e.g. seeding a post-detail query from the
// feed's already-cached data, or invalidating bookmarks after a mutation).
export const queryKeys = {
  feed: () => ['posts', 'feed'] as const,
  post: (id: string) => ['posts', 'detail', id] as const,
  bookmarks: (userId: string) => ['bookmarks', userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  conversations: (userId: string) => ['conversations', userId] as const,
  search: (query: string) => ['search', query] as const,
  interactions: (userId: string) => ['interactions', userId] as const,
};
