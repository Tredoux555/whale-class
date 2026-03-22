// lib/montree/offline/types.ts
// Type definitions for the offline photo queue system

export type PhotoQueueStatus =
  | 'pending'           // Saved locally, waiting to upload
  | 'uploading'         // Currently uploading
  | 'uploaded'          // Successfully uploaded to server
  | 'failed'            // Upload failed, will retry
  | 'permanent_failure' // Failed after max retries, needs manual action
  ;

export interface PhotoQueueEntry {
  // Identifiers
  id: string;
  child_id: string;
  child_ids?: string[];        // For group photos (multiple children)
  classroom_id: string;
  school_id: string;

  // Blob metadata
  content_hash: string;        // SHA-256 hex for deduplication
  filename: string;            // photo_{timestamp}_{random}.jpg
  blob_path: string;           // Filesystem path (native) or IndexedDB key (web)
  blob_size_bytes: number;
  width: number;
  height: number;
  mime_type: string;

  // Queue status
  status: PhotoQueueStatus;
  attempt_count: number;       // 0 to MAX_RETRIES
  last_attempt_at?: string;    // ISO timestamp
  error_message?: string;      // Last error for UI display

  // Server response (populated after upload)
  media_id?: string;           // montree_media.id from server
  server_url?: string;         // Supabase storage URL

  // Work context (from capture page)
  work_id?: string;
  work_name?: string;
  work_area?: string;
  is_class_photo?: boolean;
  event_id?: string;           // Special event link

  // Timestamps
  created_at: string;          // ISO timestamp — when photo was captured
  synced_at?: string;          // ISO timestamp — when successfully uploaded

  // Client-side only (not persisted)
  _local_url?: string;         // blob: or file:// URL for gallery display
  _upload_progress?: number;   // 0-100 (future: for progress bar)
}

export interface PhotoQueueStats {
  total: number;
  pending: number;
  uploading: number;
  uploaded: number;
  failed: number;
  permanent_failure: number;
  total_bytes_pending: number;
}

export interface SyncResult {
  uploaded: number;
  failed: number;
  skipped: boolean;
  reason?: string;
  needs_auth?: boolean;
}

export type SyncEventType =
  | 'sync_start'
  | 'sync_complete'
  | 'photo_uploading'   // NEW: upload started for a specific photo
  | 'photo_uploaded'
  | 'photo_failed'
  | 'photo_enqueued'
  | 'upload_progress';  // NEW: batch progress update

export interface UploadProgress {
  /** Total photos in this sync batch */
  total: number;
  /** Photos finished (uploaded + failed) */
  completed: number;
  /** Currently uploading (in flight) */
  inFlight: number;
  /** Successfully uploaded this batch */
  uploaded: number;
  /** Failed this batch */
  failed: number;
  /** Estimated seconds remaining (null if unknown) */
  etaSeconds: number | null;
  /** Upload speed in bytes/sec (rolling average) */
  bytesPerSecond: number;
}

export const MAX_RETRIES = 5;
export const MAX_QUEUE_SIZE = 200;
export const RETRY_BASE_DELAY_MS = 2000; // 2s, 4s, 8s, 16s, 32s
