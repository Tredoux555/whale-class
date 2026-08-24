// lib/potato/offline/types.ts
// The offline capture queue — shared types.
//
// Ported from lib/montree/offline/types.ts (the implementation that has been
// carrying Montree's capture in real classrooms since March 2026) and trimmed
// to Potato Snaps: no work/event/AI concepts, tenancy is the CLASS rather than
// the school, and every entry carries the instant the shutter actually fired.
//
// Zero imports from lib/montree/*.

/** Where an entry is in its life. */
export type QueueStatus =
  | 'pending'   // on the device, waiting for a network attempt
  | 'uploading' // an attempt is in flight right now
  | 'uploaded'  // the server said 2xx; kept briefly, then swept
  | 'failed'    // a TRANSIENT failure — will be retried, forever if need be
  | 'rejected'; // the server refused it permanently (too big, wrong type…)

export interface QueueEntry {
  /** client-generated, stable for the life of the capture — also the storage
   *  object name, which is what makes a re-upload idempotent server-side */
  id: string;
  /** tenancy: the class this photo belongs to, from the teacher's session */
  classId: string;
  /** who is in the photo */
  childIds: string[];

  /**
   * OPTIONAL — the event the teacher picked ("Outdoor time"), or null for
   * "Just class time". Absent on entries written before events existed, which
   * is why every reader must tolerate `undefined` and upload them unchanged.
   */
  sceneId?: string | null;
  /**
   * OPTIONAL — a photo of the whole room, deliberately tagged with nobody.
   * The ONLY thing that makes an empty `childIds` legal at the server; without
   * it, zero children is still a slip of the thumb and still refused.
   */
  isGroup?: boolean;

  /** SHA-256 hex of the blob, for duplicate-shutter detection */
  contentHash: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  width: number;
  height: number;

  status: QueueStatus;
  attemptCount: number;
  /** ISO — when the next attempt becomes due (exponential backoff) */
  nextAttemptAt: string;
  lastAttemptAt?: string;
  /** the last thing that went wrong, shown to the teacher on a rejection */
  errorMessage?: string;

  /**
   * 🚨 THE WHOLE POINT OF THIS FIELD
   * The instant the shutter fired, stamped on the device. A photo taken on
   * Friday afternoon in a dead spot and uploaded on Monday morning must land in
   * FRIDAY's week, or the board's counts and the film it feeds are both wrong.
   * The server trusts this (within limits — see the upload route).
   */
  capturedAt: string;
  /** when the entry was written to IndexedDB */
  createdAt: string;
  uploadedAt?: string;

  /** not persisted — a blob: URL for optimistic display */
  _localUrl?: string;
}

export interface QueueStats {
  total: number;
  /** pending + failed + uploading — everything still owed to the server */
  waiting: number;
  uploading: number;
  rejected: number;
  bytesWaiting: number;
}

export interface SyncResult {
  uploaded: number;
  failed: number;
  skipped: boolean;
  reason?: string;
  needsAuth?: boolean;
}

export type SyncEvent =
  | { type: 'enqueued'; entry: QueueEntry }
  | { type: 'sync_start' }
  | { type: 'uploading'; entry: QueueEntry }
  | { type: 'uploaded'; entry: QueueEntry }
  | { type: 'failed'; entry: QueueEntry }
  | { type: 'rejected'; entry: QueueEntry }
  | { type: 'sync_complete'; result: SyncResult }
  | { type: 'stats'; stats: QueueStats };

/** A queue this deep means something is badly wrong; refuse rather than thrash. */
export const MAX_QUEUE_SIZE = 300;
/** Parallel upload slots. Three is what Montree settled on for classroom wifi. */
export const MAX_CONCURRENT_UPLOADS = 3;
/** Backoff: 2s, 4s, 8s, 16s, 32s, 64s … capped. */
export const RETRY_BASE_DELAY_MS = 2_000;
export const RETRY_MAX_DELAY_MS = 10 * 60 * 1000;
/** A whole sync pass may not run longer than this before the lock force-resets. */
export const SYNC_TIMEOUT_MS = 120_000;
/** An uploaded entry is swept this long after it landed. */
export const UPLOADED_TTL_MS = 60 * 60 * 1000;

/**
 * How long after the shutter a capture may still be uploaded.
 * Matches the server's own window — anything older is refused there, so there
 * is no point carrying it.
 */
export const MAX_CAPTURE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
