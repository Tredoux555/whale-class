// lib/media/types.ts
// Unified media system types
// Session 54: Rock-solid offline-first architecture

export interface MediaRecord {
  id: string;
  localId?: string;  // For offline-created items
  
  // Required
  childId: string;
  childName?: string;
  mediaType: 'photo' | 'video';
  
  // Content
  dataUrl?: string;      // Local preview (base64)
  localPath?: string;    // IndexedDB key
  remotePath?: string;   // Supabase storage path
  remoteUrl?: string;    // Public URL after upload
  thumbnailUrl?: string;
  
  // Metadata
  workId?: string;
  workName?: string;
  caption?: string;
  tags?: string[];
  
  // Timing
  capturedAt: string;    // ISO timestamp
  uploadedAt?: string;
  
  // File info
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;  // For video
  
  // Sync status
  syncStatus: 'pending' | 'uploading' | 'synced' | 'failed';
  syncError?: string;
  syncAttempts?: number;
  lastSyncAttempt?: string;
}

export interface MediaQueueItem {
  id: string;
  media: MediaRecord;
  blob: Blob;
  priority: number;      // 1 = high, 5 = low
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt?: string;
}

export interface CaptureOptions {
  childId: string;
  childName?: string;
  workId?: string;
  workName?: string;
  caption?: string;
  tags?: string[];
}

export interface UploadResult {
  success: boolean;
  media?: MediaRecord;
  error?: string;
}
