export interface Article {
  publisher: string;
  url: string;
  snippet?: string;
}

export interface EventComment {
  text: string;
  timestamp: string;
}

export interface Event {
  id: string;
  title: string;
  summary: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  articles: Article[];
  image?: string;
  score: number;
  rank: number;
  likes: number;
  comments: EventComment[];
  tags?: string[];
  sourceTier?: 'international' | 'national' | 'local';
}

// Helper type for event creation
export type EventInput = Omit<Event, 'score' | 'rank' | 'likes' | 'comments'> & {
  score?: number;
  rank?: number;
  likes?: number;
  comments?: EventComment[];
}; 