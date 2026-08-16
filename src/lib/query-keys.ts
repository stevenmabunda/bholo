// Single source of truth for query keys, so caches can be read/written
// consistently from anywhere (e.g. seeding a post-detail query from the
// feed's already-cached data, or invalidating bookmarks after a mutation).
export const queryKeys = {
  feed: () => ['posts', 'feed'] as const,
  post: (id: string) => ['posts', 'detail', id] as const,
  bookmarks: (userId: string) => ['bookmarks', userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  unreadNotificationCount: (userId: string) => ['notifications', userId, 'unread-count'] as const,
  conversations: (userId: string) => ['conversations', userId] as const,
  conversation: (id: string) => ['conversations', 'detail', id] as const,
  search: (query: string) => ['search', query] as const,
  interactions: (userId: string) => ['interactions', userId] as const,

  // Profiles
  profile: (id: string) => ['profile', id] as const,
  profilePosts: (id: string, tab: string) => ['profile', id, 'posts', tab] as const,
  followList: (id: string, type: string) => ['profile', id, 'follows', type] as const,

  // Discovery / explore
  trendingKeywords: () => ['trending', 'keywords'] as const,
  trendingTopics: () => ['trending', 'topics'] as const,
  explorePosts: () => ['explore', 'posts'] as const,
  creators: () => ['creators'] as const,
  whoToFollow: (userId: string) => ['who-to-follow', userId] as const,
  videoPosts: () => ['posts', 'video'] as const,

  // Sports data (external API, already cached server-side)
  fixtures: () => ['sports', 'fixtures'] as const,
  standings: () => ['sports', 'standings'] as const,
};
