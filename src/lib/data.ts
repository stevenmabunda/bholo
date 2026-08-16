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
    type: 'image' | 'video' | 'gif' | 'sticker';
    width?: number;
    height?: number;
    hint?: string;
    /** Still frame grabbed at upload, used as the video's poster and as the
     *  link-preview thumbnail — a video URL is not something a crawler can
     *  render. Absent on videos posted before this existed. */
    posterUrl?: string;
  }>;
  poll?: {
    choices: { text: string; votes: number }[];
  };
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

    
