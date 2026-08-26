// lib/lens/offline/types.ts
// The offline capture queue — shared types.
//
// Ported from lib/potato/offline/types.ts (itself ported from the Montree
// implementation that has been carrying real classroom capture since March
// 2026) and adapted to Lens:
//
//   • Tenancy is the VISIT, not a class or a school.
//   • An entry may have NO BLOB. Potato queues photos; Lens queues MOMENTS, and
//     three of the four kinds (voice, text, chip) are pure fields. The blob
//     store is therefore optional per entry rather than mandatory, and every
//     read path must tolerate an entry with no bytes behind it.
//   • The whole moment payload travels with the entry, because a chip tapped in
//     a dead spot must arrive with its area, subject, staff and rating intact —
//     re-deriving them at sync time from a screen she has since left is not
//     possible.
//
// Zero imports from lib/montree/* or lib/potato/*.

import type { MomentArea, MomentKind, MomentSubject } from '../types';

/** Where an entry is in its life. */
export type QueueStatus =
  | 'pending'   // on the device, waiting for a network attempt
  | 'uploading' // an attempt is in flight right now
  | 'uploaded'  // the server said 2xx; kept briefly, then swept
  | 'failed'    // a TRANSIENT failure — will be retried, forever if need be
  | 'rejected'; // the server refused it permanently (too big, wrong type…)

/** Everything the server needs to build the lens_moments row. */
export interface MomentPayload {
  kind: MomentKind;
  classroomId: string | null;
  transcript: string | null;
  body: string | null;
  caption: string | null;
  area: MomentArea | null;
  subject: MomentSubject | null;
  staffId: string | null;
  childAlias: string | null;
  /** 1..4, the pip. Null when she did not rate it. */
  rating: number | null;
}

export interface QueueEntry {
  /**
   * Client-generated, stable for the life of the capture. It is ALSO the
   * server's idempotency key and the storage object name, which is what makes a
   * re-upload safe: the same id means the same moment, so a lost response
   * cannot produce a second row.
   */
  id: string;
  /** tenancy: the visit this moment belongs to */
  visitId: string;

  payload: MomentPayload;

  /** Photo entries only. Everything else has no bytes at all. */
  hasBlob: boolean;
  contentHash?: string;
  filename?: string;
  sizeBytes: number;
  mimeType?: string;
  width?: number;
  height?: number;

  status: QueueStatus;
  attemptCount: number;
  /** ISO — when the next attempt becomes due (exponential backoff) */
  nextAttemptAt: string;
  lastAttemptAt?: string;
  /** the last thing that went wrong, shown to her on a rejection */
  errorMessage?: string;

  /**
   * 🚨 THE WHOLE POINT OF THIS FIELD.
   * The instant the moment happened, stamped on the device. A note taken at
   * 09:42 in a dead spot and synced at 16:00 must sit at 09:42 on the timeline,
   * because the timeline IS the evidence — a report whose chronology drifted
   * with the wifi is not a report anybody can rely on.
   */
  capturedAt: string;
  createdAt: string;
  uploadedAt?: string;

  /** not persisted — a blob: URL for optimistic display */
  _localUrl?: string;
  /** not persisted — the server row id, once it lands */
  _serverId?: string;
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
export const MAX_QUEUE_SIZE = 500;
/** Parallel upload slots. Three is what Montree settled on for classroom wifi. */
export const MAX_CONCURRENT_UPLOADS = 3;
/** Backoff: 2s, 4s, 8s, 16s, 32s, 64s … capped. */
export const RETRY_BASE_DELAY_MS = 2_000;
export const RETRY_MAX_DELAY_MS = 10 * 60 * 1000;
/** A whole sync pass may not run longer than this before the lock force-resets. */
export const SYNC_TIMEOUT_MS = 120_000;
/** An uploaded entry is swept this long after it landed. */
export const UPLOADED_TTL_MS = 60 * 60 * 1000;
/** Matches the server's own window; anything older is refused there anyway. */
export const MAX_CAPTURE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
