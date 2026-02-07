export interface OnlineUser {
  username: string;
  lastLogin: string;
  secondsAgo: number;
}

export interface LoginLog {
  id: number;
  username: string;
  login_time: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface Message {
  id: number;
  week_start_date: string;
  message_type: 'text' | 'image' | 'video' | 'audio';
  message_content: string | null;
  media_url: string | null;
  media_filename: string | null;
  author: string;
  created_at: string;
  is_expired: boolean;
}

export interface Statistics {
  message_type: string;
  count: string;
}

export interface VaultFile {
  id: number;
  filename: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface SharedFile {
  id: number;
  original_filename: string;
  file_size: number;
  mime_type: string;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  public_url: string;
}

export type TabType = 'online' | 'logs' | 'messages' | 'vault' | 'files' | 'controls';

export interface SystemStats {
  messages: number;
  users: number;
  loginLogs: number;
  vaultFiles: number;
}
