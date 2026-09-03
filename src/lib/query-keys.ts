// Single source of truth for query keys, so caches can be read/written
// consistently from anywhere (e.g. seeding a post-detail query from the
// feed's already-cached data, or invalidating bookmarks after a mutation).
export const queryKeys = {
  // Keyed by viewer: the feed's first page now depends on their favourite
  // club (see getRecentPosts's team-first-with-fallback), so two different
  // viewers in the same browser session must not share a cache entry.
  feed: (userId: string) => ['posts', 'feed', userId] as const,
  post: (id: string) => ['posts', 'detail', id] as const,
  bookmarks: (userId: string) => ['bookmarks', userId] as const,
  notifications: (userId: string) => ['notifications', userId] as const,
  unreadNotificationCount: (userId: string) => ['notifications', userId, 'unread-count'] as const,
  conversations: (userId: string) => ['conversations', userId] as const,
  conversation: (id: string) => ['conversations', 'detail', id] as const,
  search: (query: string) => ['search', query] as const,
  interactions: (userId: string) => ['interactions', userId] as const,

  // Profiles
  //
  // Two different shapes describe a profile: the raw snake_case row the
  // signed-in user's own hooks read, and the camelCase ProfileData the profile
  // page builds for display. They must not share a key — when they did, opening
  // or even hovering a profile overwrote the row with the display shape, and
  // every field that is spelled differently (display_name, photo_url) silently
  // became undefined. Posts were then written as "Anonymous User".
  profile: (id: string) => ['profile', id] as const,
  /** The signed-in user's own profile row, snake_case, as stored. */
  myProfile: (id: string) => ['profile', id, 'self'] as const,
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
