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

    
