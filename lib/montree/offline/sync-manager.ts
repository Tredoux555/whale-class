// lib/montree/offline/sync-manager.ts
// Core sync engine: captures photos to local queue, uploads when online
//
// Usage:
//   import { enqueuePhoto, syncQueue, getQueueStats } from '@/lib/montree/offline/sync-manager';
//
//   // Capture: save photo locally (guaranteed persistence)
//   const entry = await enqueuePhoto(blob, { child_id, school_id, classroom_id, ... });
//
//   // Sync: upload all pending photos (call on app resume, network change)
//   const result = await syncQueue();

import type { PhotoQueueEntry, SyncResult } from './types';
import { MAX_RETRIES, RETRY_BASE_DELAY_MS } from './types';
import {
  saveEntry, getEntry, saveBlob, getBlob, deleteBlob,
  getPendingEntries, updateEntryStatus, findByContentHash,
  isQueueFull, cleanupOldEntries,
} from './queue-store';
import { startAnalysis } from '@/lib/montree/photo-insight-store';

// ============================================
// STATE
// ============================================

let syncInProgress = false;
const syncListeners = new Set<(stats: SyncEvent) => void>();

export type SyncEvent = {
  type: 'sync_start' | 'sync_complete' | 'photo_uploaded' | 'photo_failed' | 'photo_enqueued';
  entry?: PhotoQueueEntry;
  result?: SyncResult;
};

// ============================================
// CONTENT HASH (deduplication)
// ============================================

async function calculateContentHash(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
  width: number;
  height: number;
}

export async function enqueuePhoto(
  blob: Blob,
  opts: EnqueueOptions
): Promise<PhotoQueueEntry> {
  // Check queue capacity
  if (await isQueueFull()) {
    // Clean up old uploaded entries to make room
    await cleanupOldEntries();
    if (await isQueueFull()) {
      throw new Error('Photo queue is full (200 max). Please wait for uploads to complete.');
    }
  }

  // Calculate content hash for dedup
  const contentHash = await calculateContentHash(blob);

  // Check for duplicate
  const existing = await findByContentHash(contentHash, opts.child_id);
  if (existing && existing.status !== 'permanent_failure') {
    console.log('[PHOTO_QUEUE] Duplicate photo detected, returning existing:', existing.id);
    return existing;
  }

  // Generate unique ID and filename
  const id = generateId();
  const filename = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

  // Save blob to IndexedDB
  await saveBlob(id, blob);

  // Create and save queue entry
  const entry: PhotoQueueEntry = {
    id,
    child_id: opts.child_id,
    child_ids: opts.child_ids,
    classroom_id: opts.classroom_id,
    school_id: opts.school_id,
    content_hash: contentHash,
    filename,
    blob_path: `indexeddb://${id}`, // Reference for IndexedDB blob store
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
    created_at: new Date().toISOString(),
  };

  await saveEntry(entry);

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
  if (syncInProgress) {
    return { uploaded: 0, failed: 0, skipped: true, reason: 'sync already in progress' };
  }

  syncInProgress = true;
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

    // Sequential upload (preserves order, easier debugging, avoids overwhelming server)
    for (const entry of pending) {
      try {
        await uploadEntry(entry);
        uploaded++;
        notifyListeners({ type: 'photo_uploaded', entry });
      } catch (err) {
        failed++;
        console.error(`[PHOTO_QUEUE] Upload failed for ${entry.id}:`, err);
        notifyListeners({ type: 'photo_failed', entry });
      }
    }

    const result: SyncResult = { uploaded, failed, skipped: false };
    notifyListeners({ type: 'sync_complete', result });
    return result;

  } finally {
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
      // Blob was deleted (user cleared storage, or corruption)
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
      width: entry.width,
      height: entry.height,
    }));

    // Upload with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s

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

    // Handle auth failures (don't retry)
    if (response.status === 401 || response.status === 403) {
      await updateEntryStatus(entry.id, 'failed', {
        error_message: 'Session expired — please log in again',
        last_attempt_at: new Date().toISOString(),
        attempt_count: entry.attempt_count + 1,
      });
      throw new Error('Auth expired');
    }

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Upload returned failure');
    }

    // SUCCESS — mark as uploaded
    await updateEntryStatus(entry.id, 'uploaded', {
      media_id: result.media?.id,
      server_url: result.media?.url,
      synced_at: new Date().toISOString(),
    });

    // Delete local blob (photo is now on server)
    await deleteBlob(entry.id);

    // Trigger Smart Capture analysis (same as existing flow)
    if (result.media?.id && entry.child_id) {
      const locale = typeof localStorage !== 'undefined'
        ? localStorage.getItem('montree_lang') || 'en'
        : 'en';
      startAnalysis(result.media.id, entry.child_id, locale);
    }

  } catch (err) {
    const newCount = entry.attempt_count + 1;
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

    throw err;
  }
}

// ============================================
// NETWORK CHECK
// ============================================

async function checkNetworkReachable(): Promise<boolean> {
  // Don't rely solely on navigator.onLine (unreliable, especially on iOS)
  // Do a real HTTP ping to our server
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('/api/montree/health', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

// ============================================
// MANUAL RETRY (for permanently failed photos)
// ============================================

export async function retryEntry(id: string): Promise<void> {
  const entry = await getEntry(id);
  if (!entry) return;

  // Reset status to pending so sync picks it up
  await updateEntryStatus(id, 'pending', {
    attempt_count: 0,
    error_message: undefined,
    last_attempt_at: undefined,
  });

  // Attempt sync immediately
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
