export interface OnlineUser {
  username: string;
  lastSeen: string;
  secondsAgo: number;
}

export interface LoginLog {
  id: number;
  username: string;
  login_at: string;
  logout_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface Visit {
  id: number;
  username: string;
  visited_at: string;
  last_active_at: string;
  duration_seconds: number;
  ip_address: string | null;
}

// A single read receipt — a Story user who opened a message, and when.
export interface MessageRead {
  username: string;
  read_at: string;
}

export interface Message {
  id: number;
  week_start_date: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document';
  message_content: string | null;
  media_url: string | null;
  media_filename: string | null;
  author: string;
  created_at: string;
  is_expired: boolean;
  // Read receipts (admin-side only). is_from_admin marks a message the
  // admin sent; read_by lists the Story users who have opened it.
  is_from_admin?: boolean;
  read_by?: MessageRead[];
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
  // Session 153 — false for unencrypted direct (large-media) uploads, which
  // download via the signed-url endpoint instead of the decrypt-proxy route.
  encrypted?: boolean;
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
