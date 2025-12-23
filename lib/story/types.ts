// Story System Types

export interface Story {
  id: number;
  week_start_date: string;
  theme: string;
  story_title: string;
  story_content: { paragraphs: string[] };
  hidden_message: string | null;
  message_author: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface StoryAdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  last_login: string | null;
}

export interface LoginLog {
  id: number;
  username: string;
  login_time: string;
  session_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface MessageHistory {
  id: number;
  week_start_date: string;
  message_type: 'text' | 'image' | 'video' | 'audio';
  message_content: string | null;
  media_url: string | null;
  media_filename: string | null;
  author: string;
  created_at: string;
  expires_at: string | null;
  is_expired: boolean;
}

export interface MediaItem {
  id: number;
  type: 'image' | 'video' | 'audio';
  url: string;
  filename: string | null;
  author: string;
  created_at: string;
  expires_at: string | null;
}

export interface OnlineUser {
  username: string;
  last_login: string;
  seconds_ago: number;
}

export interface StoryResponse {
  title: string;
  paragraphs: string[];
  hiddenMessage: string | null;
  messageAuthor: string | null;
}

export interface JWTPayload {
  username: string;
  role?: 'admin';
  iat?: number;
  exp?: number;
}

export interface GeneratedStory {
  theme: string;
  title: string;
  paragraphs: string[];
}
