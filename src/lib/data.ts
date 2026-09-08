export type PostType = {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  content: string;
  timestamp: string;
  comments: number;
  reposts: number;
  likes: number;
  views?: number;
  location?: string;
  createdAt?: string; // Changed to string to be serializable
  media?: Array<{
    url: string;
    type: 'image' | 'video' | 'gif' | 'sticker' | 'link';
    width?: number;
    height?: number;
    hint?: string;
    /** Still frame grabbed at upload, used as the video's poster and as the
     *  link-preview thumbnail — a video URL is not something a crawler can
     *  render. Absent on videos posted before this existed. */
    posterUrl?: string;
    /** 'link' only — the article/page this card points to. `url` above
     *  holds the card's own preview image, same as every other media type. */
    linkUrl?: string;
    title?: string;
    description?: string;
    siteName?: string;
  }>;
  poll?: {
    choices: { text: string; votes: number }[];
  };
  /** Set only on the /home feed's first page, only for posts in the
   *  reserved "Following your team" block — see getRecentPosts. Never
   *  present on paginated, realtime, or any other post. */
  isTeamHighlight?: boolean;
};

export type MatchType = {
  id: number;
  team1: { name: string; logo?: string };
  team2: { name: string; logo?: string };
  score?: string;
  time: string;
  league: string;
  isLive: boolean;
  isUpcoming: boolean;
};

    
