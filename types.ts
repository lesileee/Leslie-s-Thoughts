export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export interface Thought {
  id: string;
  content: string;
  timestamp: number;
  tags?: string[];
  aiEnhanced?: boolean;
  image?: string;
}

export interface AIResponse {
  polished: string;
  tags: string[];
}