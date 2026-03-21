// hooks/usePhotoQueue.ts
// React hook for the offline photo queue
//
// Usage:
//   const { stats, entries, enqueue, sync, retry, syncing, progress } = usePhotoQueue(childId);
//   // stats.pending = number of photos waiting to upload
//   // entries = queue entries for this child (for gallery merge)
//   // enqueue(blob, opts) = save photo locally
//   // sync() = trigger upload of all pending
//   // retry(id) = retry a permanently failed photo
//   // progress = real-time upload progress (ETA, speed, counts)

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PhotoQueueEntry, PhotoQueueStats, UploadProgress } from '@/lib/montree/offline';
import type { SyncEvent } from '@/lib/montree/offline';
import {
  enqueuePhoto,
  syncQueue,
  retryEntry,
  addSyncListener,
  getQueueStats,
  getEntriesForChild,
} from '@/lib/montree/offline';
import type { EnqueueOptions } from '@/lib/montree/offline';

interface UsePhotoQueueReturn {
  /** Queue statistics (pending, uploading, failed counts) */
  stats: PhotoQueueStats | null;
  /** Queue entries for the specified child (for gallery merge) */
  entries: PhotoQueueEntry[];
  /** Enqueue a photo for offline-safe upload */
  enqueue: (blob: Blob, opts: EnqueueOptions) => Promise<PhotoQueueEntry>;
  /** Trigger sync of all pending photos */
  sync: () => Promise<void>;
  /** Retry a permanently failed photo */
  retry: (id: string) => Promise<void>;
  /** Whether a sync is currently in progress */
  syncing: boolean;
  /** Real-time upload progress (null when not syncing) */
  progress: UploadProgress | null;
}

export function usePhotoQueue(childId?: string): UsePhotoQueueReturn {
  const [stats, setStats] = useState<PhotoQueueStats | null>(null);
  const [entries, setEntries] = useState<PhotoQueueEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  // Load initial stats and entries
  const refresh = useCallback(async () => {
    try {
      const [newStats, newEntries] = await Promise.all([
        getQueueStats(),
        childId ? getEntriesForChild(childId) : Promise.resolve([]),
      ]);
      setStats(newStats);
      setEntries(newEntries);
    } catch (e) {
      console.error('[usePhotoQueue] Refresh error:', e);
    }
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for sync events to update UI
  useEffect(() => {
    const unsubscribe = addSyncListener((event: SyncEvent) => {
      if (event.type === 'sync_start') {
        setSyncing(true);
        setProgress(null);
      } else if (event.type === 'sync_complete') {
        setSyncing(false);
        setProgress(null);
        refresh();
      } else if (event.type === 'upload_progress' && event.progress) {
        // Real-time progress updates — no full refresh needed
        setProgress(event.progress);
      } else if (event.type === 'photo_uploaded' || event.type === 'photo_failed') {
        refresh();
      }
      // Skip refresh for 'photo_enqueued' — the enqueue() call below handles that
      // Skip refresh for 'photo_uploading' — progress events handle counts
    });
    return unsubscribe;
  }, [refresh]);

  const enqueue = useCallback(async (blob: Blob, opts: EnqueueOptions) => {
    const entry = await enqueuePhoto(blob, opts);
    await refresh();
    return entry;
  }, [refresh]);

  const sync = useCallback(async () => {
    await syncQueue();
    await refresh();
  }, [refresh]);

  const retry = useCallback(async (id: string) => {
    await retryEntry(id);
    await refresh();
  }, [refresh]);

  return { stats, entries, enqueue, sync, retry, syncing, progress };
}
