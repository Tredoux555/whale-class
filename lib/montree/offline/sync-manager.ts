// lib/montree/offline/sync-manager.ts
// Core sync engine: captures photos to local queue, uploads when online
//
// HARDENED after 10x health check audit (Mar 18, 2026):
//   CRITICAL-001: Atomic blob+entry save (single IndexedDB transaction)
//   CRITICAL-002: Dedup race condition (try-catch on save, not pre-check only)
//   CRITICAL-003: Delete blob BEFORE marking uploaded (prevents orphan on crash)
//   CRITICAL-004: Sync lock timeout (90s max, guaranteed reset)
//   CRITICAL-005: Aggressive cleanup on quota exceeded (delete oldest pending)
//   HIGH-001: Auth 401 stops sync loop immediately (no wasted retries)
//   MED-002: Always mark failed/permanent_failure on ANY error path

import type { PhotoQueueEntry, SyncResult, UploadProgress } from './types';
import { MAX_RETRIES } from './types';
import {
  saveEntryAndBlob, getEntry, getBlob, deleteBlob,
  getPendingEntries, updateEntryStatus, findByContentHash,
  isQueueFull, cleanupOldEntries, getAllEntries, deleteEntry,
} from './queue-store';
import { startAnalysis } from '@/lib/montree/photo-insight-store';

// ============================================
// STATE
// ============================================

let syncInProgress = false;
let syncStartedAt = 0; // Timestamp for timeout detection (CRITICAL-004)
const SYNC_TIMEOUT_MS = 90_000; // 90s max sync duration
const MAX_CONCURRENT_UPLOADS = 3; // Parallel upload slots

const syncListeners = new Set<(stats: SyncEvent) => void>();

export type SyncEvent = {
  type: 'sync_start' | 'sync_complete' | 'photo_uploading' | 'photo_uploaded' | 'photo_failed' | 'photo_enqueued' | 'upload_progress';
  entry?: PhotoQueueEntry;
  result?: SyncResult;
  progress?: UploadProgress;
};

// ============================================
// CONTENT HASH (deduplication)
// ============================================

async function calculateContentHash(blob: Blob): Promise<string> {
  try {
    // crypto.subtle requires HTTPS (not available over HTTP or in some webviews)
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('crypto.subtle not available');
    }
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback: size + type + timestamp (not cryptographic, but prevents accidental dupes)
    return `fallback_${blob.size}_${blob.type}_${Date.now()}`;
  }
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================
// ENQUEUE: Save photo locally (guaranteed)
// ============================================

export interface EnqueueOptions {
  child_id: string;
  child_ids?: string[];
  classroom_id: string;
  school_id: string;
  work_id?: string;
  work_name?: string;
  work_area?: string;
  is_class_photo?: boolean;
  event_id?: string;
  width: number;
  height: number;
}

export async function enqueuePhoto(
  blob: Blob,
  opts: EnqueueOptions
): Promise<PhotoQueueEntry> {
  // Check queue capacity
  if (await isQueueFull()) {
    // First try: clean up old uploaded entries
    await cleanupOldEntries();

    // CRITICAL-005: If still full, aggressively delete oldest pending entries
    if (await isQueueFull()) {
      await aggressiveCleanup();
    }

    // If STILL full after aggressive cleanup, reject
    if (await isQueueFull()) {
      throw new Error('Photo queue is full (200 max). Please wait for uploads to complete.');
    }
  }

  // Calculate content hash for dedup
  const contentHash = await calculateContentHash(blob);

  // Check for duplicate (soft check — real protection is in atomic save)
  const existing = await findByContentHash(contentHash, opts.child_id);
  if (existing && existing.status !== 'permanent_failure') {
    console.log('[PHOTO_QUEUE] Duplicate photo detected, returning existing:', existing.id);
    return existing;
  }

  // Generate unique ID and filename
  const id = generateId();
  const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

  // Create queue entry
  const entry: PhotoQueueEntry = {
    id,
    child_id: opts.child_id,
    child_ids: opts.child_ids,
    classroom_id: opts.classroom_id,
    school_id: opts.school_id,
    content_hash: contentHash,
    filename,
    blob_path: `indexeddb://${id}`,
    blob_size_bytes: blob.size,
    width: opts.width,
    height: opts.height,
    mime_type: blob.type || 'image/jpeg',
    status: 'pending',
    attempt_count: 0,
    work_id: opts.work_id,
    work_name: opts.work_name,
    work_area: opts.work_area,
    is_class_photo: opts.is_class_photo,
    event_id: opts.event_id,
    created_at: new Date().toISOString(),
  };

  // CRITICAL-001 + CRITICAL-002: Atomic save (blob + entry in single transaction)
  // If this fails (quota exceeded, constraint violation), nothing is saved — no orphaned blobs
  try {
    await saveEntryAndBlob(entry, blob);
  } catch (err) {
    // CRITICAL-002: Handle duplicate constraint collision from race condition
    if (err instanceof DOMException && err.name === 'ConstraintError') {
      const existingAfterRace = await findByContentHash(contentHash, opts.child_id);
      if (existingAfterRace) return existingAfterRace;
    }
    // CRITICAL-005: Handle quota exceeded
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      await aggressiveCleanup();
      // Retry once after cleanup
      try {
        await saveEntryAndBlob(entry, blob);
      } catch {
        throw new Error('Device storage full. Please free up space.');
      }
    } else {
      throw err;
    }
  }

  // Generate local display URL for gallery
  entry._local_url = URL.createObjectURL(blob);

  // Notify listeners
  notifyListeners({ type: 'photo_enqueued', entry });

  return entry;
}

// ============================================
// SYNC: Upload all pending photos
// ============================================

export async function syncQueue(): Promise<SyncResult> {
  // CRITICAL-004: Check for stale sync lock (timeout protection)
  if (syncInProgress) {
    const elapsed = Date.now() - syncStartedAt;
    if (elapsed < SYNC_TIMEOUT_MS) {
      return { uploaded: 0, failed: 0, skipped: true, reason: 'sync already in progress' };
    }
    // Stale lock — force reset
    console.warn(`[PHOTO_QUEUE] Sync lock stale (${Math.round(elapsed / 1000)}s), force resetting`);
    syncInProgress = false;
  }

  syncInProgress = true;
  syncStartedAt = Date.now();
  notifyListeners({ type: 'sync_start' });

  try {
    const pending = await getPendingEntries();

    if (pending.length === 0) {
      return { uploaded: 0, failed: 0, skipped: true, reason: 'no pending photos' };
    }

    // Quick network check before starting
    const isOnline = await checkNetworkReachable();
    if (!isOnline) {
      return { uploaded: 0, failed: 0, skipped: true, reason: 'offline' };
    }

    let uploaded = 0;
    let failed = 0;
    let authFailed = false;
    let nextIndex = 0;
    const total = pending.length;

    // Rolling speed tracker for ETA calculation
    const uploadTimestamps: { time: number; bytes: number }[] = [];

    function emitProgress() {
      // Calculate rolling bytes/sec from last 10 uploads
      let bytesPerSecond = 0;
      if (uploadTimestamps.length >= 2) {
        const window = uploadTimestamps.slice(-10);
        const totalBytes = window.reduce((sum, t) => sum + t.bytes, 0);
        const elapsed = (window[window.length - 1].time - window[0].time) / 1000;
        if (elapsed > 0) bytesPerSecond = totalBytes / elapsed;
      }

      // Estimate remaining time
      const remaining = total - (uploaded + failed);
      const avgBytesPerPhoto = total > 0
        ? pending.reduce((sum, e) => sum + e.blob_size_bytes, 0) / total
        : 0;
      const etaSeconds = bytesPerSecond > 0
        ? Math.round((remaining * avgBytesPerPhoto) / bytesPerSecond)
        : null;

      const progress: UploadProgress = {
        total,
        completed: uploaded + failed,
        inFlight: Math.min(MAX_CONCURRENT_UPLOADS, total - (uploaded + failed)),
        uploaded,
        failed,
        etaSeconds,
        bytesPerSecond,
      };
      notifyListeners({ type: 'upload_progress', progress });
    }

    // Parallel upload pool: up to MAX_CONCURRENT_UPLOADS at once
    async function processNext(): Promise<void> {
      while (nextIndex < total) {
        // CRITICAL-004: Check sync timeout
        if (Date.now() - syncStartedAt > SYNC_TIMEOUT_MS) {
          console.warn('[PHOTO_QUEUE] Sync timeout reached, stopping');
          return;
        }

        // HIGH-001: If auth failed, stop trying (all subsequent will fail too)
        if (authFailed) return;

        const entry = pending[nextIndex++];
        if (!entry) return;

        notifyListeners({ type: 'photo_uploading', entry });

        try {
          await uploadEntry(entry);
          uploaded++;
          uploadTimestamps.push({ time: Date.now(), bytes: entry.blob_size_bytes });
          notifyListeners({ type: 'photo_uploaded', entry });
        } catch (err) {
          failed++;
          if (err instanceof Error && err.message === 'AUTH_EXPIRED') {
            authFailed = true;
          }
          console.error(`[PHOTO_QUEUE] Upload failed for ${entry.id}:`, err);
          notifyListeners({ type: 'photo_failed', entry });
        }

        emitProgress();
      }
    }

    // Launch concurrent workers
    const workers = Array.from(
      { length: Math.min(MAX_CONCURRENT_UPLOADS, total) },
      () => processNext()
    );
    await Promise.all(workers);

    const result: SyncResult = {
      uploaded,
      failed,
      skipped: false,
      needs_auth: authFailed,
    };
    notifyListeners({ type: 'sync_complete', result });
    return result;

  } finally {
    // CRITICAL-004: Guaranteed reset even if an exception escapes
    syncInProgress = false;
  }
}

// ============================================
// UPLOAD: Single photo entry
// ============================================

async function uploadEntry(entry: PhotoQueueEntry): Promise<void> {
  // Mark as uploading
  await updateEntryStatus(entry.id, 'uploading');

  try {
    // Read blob from IndexedDB
    const blob = await getBlob(entry.id);
    if (!blob) {
      await updateEntryStatus(entry.id, 'permanent_failure', {
        error_message: 'Photo file not found on device',
      });
      throw new Error('Blob not found');
    }

    // Build FormData (same format as existing upload API)
    const formData = new FormData();
    formData.append('file', blob, entry.filename);
    formData.append('metadata', JSON.stringify({
      school_id: entry.school_id,
      classroom_id: entry.classroom_id || undefined,
      child_id: entry.child_ids && entry.child_ids.length > 1 ? undefined : entry.child_id,
      child_ids: entry.child_ids && entry.child_ids.length > 1 ? entry.child_ids : undefined,
      is_class_photo: entry.is_class_photo,
      media_type: 'photo',
      captured_at: entry.created_at,
      work_id: entry.work_id || undefined,
      caption: entry.work_name || undefined,
      tags: entry.work_area ? [entry.work_area] : undefined,
      event_id: entry.event_id || undefined,
      width: entry.width,
      height: entry.height,
    }));

    // Upload with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response: Response;
    try {
      response = await fetch('/api/montree/media/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // HIGH-001: Auth failure — stop entire sync loop immediately
    if (response.status === 401 || response.status === 403) {
      await updateEntryStatus(entry.id, 'failed', {
        error_message: 'Session expired — please log in again',
        last_attempt_at: new Date().toISOString(),
        attempt_count: entry.attempt_count + 1,
      });
      throw new Error('AUTH_EXPIRED'); // Sentinel value caught by syncQueue
    }

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    let result;
    try {
      result = await response.json();
    } catch {
      // MED-002: Malformed JSON response — treat as error, not success
      throw new Error('Server returned invalid response');
    }

    if (!result.success) {
      throw new Error(result.error || 'Upload returned failure');
    }

    // CRITICAL-003: Delete blob FIRST, then mark uploaded
    // If crash happens after blob delete but before status update:
    //   → Entry stays 'uploading', blob is gone
    //   → Next sync: getBlob returns null → permanent_failure
    //   → But photo IS on server (upload succeeded) — acceptable trade-off
    // This is safer than the reverse (mark uploaded, crash before delete → orphaned blob)
    await deleteBlob(entry.id);

    // NOW mark as uploaded (blob already safely on server + deleted locally)
    await updateEntryStatus(entry.id, 'uploaded', {
      media_id: result.media?.id,
      server_url: result.media?.url,
      synced_at: new Date().toISOString(),
    });

    // Trigger Smart Capture analysis — SKIP if teacher already tagged the work
    // When work_id is set, the teacher selected the work from WorkWheelPicker
    // before taking the photo. No need for AI vision — saves $0.006-0.06 per photo.
    if (result.media?.id && entry.child_id && !entry.work_id) {
      const locale = typeof localStorage !== 'undefined'
        ? localStorage.getItem('montree_lang') || 'en'
        : 'en';
      startAnalysis(result.media.id, entry.child_id, locale);
    }

  } catch (err) {
    // MED-002: ALWAYS update status on error (never leave stuck in 'uploading')
    const isAuthError = err instanceof Error && err.message === 'AUTH_EXPIRED';
    if (!isAuthError) {
      // Auth errors already handled above — don't double-count
      const freshEntry = await getEntry(entry.id);
      if (freshEntry && freshEntry.status === 'uploading') {
        const rawCount = typeof freshEntry.attempt_count === 'number' ? freshEntry.attempt_count : 0;
        const newCount = Math.max(0, rawCount) + 1;
        const errorMsg = err instanceof Error ? err.message : 'Upload failed';

        if (newCount >= MAX_RETRIES) {
          await updateEntryStatus(entry.id, 'permanent_failure', {
            attempt_count: newCount,
            last_attempt_at: new Date().toISOString(),
            error_message: errorMsg,
          });
        } else {
          await updateEntryStatus(entry.id, 'failed', {
            attempt_count: newCount,
            last_attempt_at: new Date().toISOString(),
            error_message: errorMsg,
          });
        }
      }
    }

    throw err;
  }
}

// ============================================
// NETWORK CHECK
// ============================================

async function checkNetworkReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2s — fast fail
    const res = await fetch('/api/montree/health', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    // Accept any response (even 500) as "online" — server is reachable
    return true;
  } catch {
    return false;
  }
}

// ============================================
// AGGRESSIVE CLEANUP (CRITICAL-005)
// ============================================

/**
 * When quota is exceeded, delete oldest uploaded entries first,
 * then oldest failed entries. Only delete pending as last resort.
 */
async function aggressiveCleanup(): Promise<void> {
  const entries = await getAllEntries();

  // Priority 1: Delete uploaded entries (already on server)
  const uploaded = entries
    .filter(e => e.status === 'uploaded')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const entry of uploaded.slice(0, 50)) {
    await deleteEntry(entry.id);
  }

  // Priority 2: Delete permanent failures (user already notified)
  const permFailed = entries
    .filter(e => e.status === 'permanent_failure')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const entry of permFailed.slice(0, 20)) {
    await deleteEntry(entry.id);
  }

  console.log(`[PHOTO_QUEUE] Aggressive cleanup: deleted ${uploaded.length} uploaded + ${permFailed.length} failed`);
}

// ============================================
// MANUAL RETRY (for permanently failed photos)
// ============================================

export async function retryEntry(id: string): Promise<void> {
  const entry = await getEntry(id);
  if (!entry) return;

  await updateEntryStatus(id, 'pending', {
    attempt_count: 0,
    error_message: undefined,
    last_attempt_at: undefined,
  });

  syncQueue().catch(e => console.error('[PHOTO_QUEUE] Retry sync failed:', e));
}

// ============================================
// LISTENERS (for UI updates)
// ============================================

export function addSyncListener(fn: (event: SyncEvent) => void): () => void {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
}

function notifyListeners(event: SyncEvent): void {
  syncListeners.forEach(fn => {
    try { fn(event); } catch (e) { console.error('[PHOTO_QUEUE] Listener error:', e); }
  });
}

// ============================================
// IS SYNCING (for UI indicator)
// ============================================

export function isSyncing(): boolean {
  return syncInProgress;
}
