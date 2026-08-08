// lib/potato/offline/usePotatoQueue.ts
// The one hook a screen needs: how many photos are still owed to the server,
// which ones were refused, and a way to try again now.
//
// Registers the sync triggers for the signed-in class and keeps live stats by
// subscribing to the engine's events — no polling.

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QueueEntry, QueueStats } from './types';
import {
  addSyncListener,
  setActiveClass,
  syncQueue,
  retryNow,
  retryRejected,
  discardRejected,
  queueStats,
  listRejected,
  isSyncing,
} from './sync-manager';
import { registerPotatoSyncTriggers } from './triggers';
import { isQueueAvailable } from './queue-store';

const EMPTY: QueueStats = { total: 0, waiting: 0, uploading: 0, rejected: 0, bytesWaiting: 0 };

export interface PotatoQueueState {
  /** photos on the device still owed to the server (pending + failed + in flight) */
  waiting: number;
  /** photos the server refused for good — the teacher must decide */
  rejected: QueueEntry[];
  syncing: boolean;
  /** false when the browser has no IndexedDB at all (private mode, ancient) */
  available: boolean;
  retry: () => void;
  retryOne: (id: string) => void;
  discardOne: (id: string) => void;
}

export function usePotatoQueue(classId: string | null): PotatoQueueState {
  const [stats, setStats] = useState<QueueStats>(EMPTY);
  const [rejected, setRejected] = useState<QueueEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const available = isQueueAvailable();

  const refresh = useCallback(async (id: string) => {
    try {
      const [s, r] = await Promise.all([queueStats(id), listRejected(id)]);
      setStats(s);
      setRejected(r);
      setSyncing(isSyncing());
    } catch (e) {
      console.error('[potato/queue] refresh failed:', e);
    }
  }, []);

  useEffect(() => {
    if (!classId || !available) {
      setActiveClass(null);
      setStats(EMPTY);
      setRejected([]);
      return;
    }
    setActiveClass(classId);
    refresh(classId);

    const off = addSyncListener((event) => {
      if (event.type === 'stats') setStats(event.stats);
      if (event.type === 'sync_start') setSyncing(true);
      if (event.type === 'sync_complete') setSyncing(false);
      // A rejection changes a list the stats alone can't describe.
      if (event.type === 'rejected' || event.type === 'uploaded' || event.type === 'enqueued') {
        refresh(classId);
      }
    });
    const unregister = registerPotatoSyncTriggers(classId);

    return () => {
      off();
      unregister();
    };
  }, [classId, available, refresh]);

  const retry = useCallback(() => {
    if (!classId) return;
    retryNow(classId)
      .catch((e) => console.error('[potato/queue] manual retry failed:', e))
      .finally(() => refresh(classId));
  }, [classId, refresh]);

  const retryOne = useCallback(
    (id: string) => {
      retryRejected(id)
        .catch((e) => console.error('[potato/queue] retry one failed:', e))
        .finally(() => classId && refresh(classId));
    },
    [classId, refresh],
  );

  const discardOne = useCallback(
    (id: string) => {
      discardRejected(id)
        .catch((e) => console.error('[potato/queue] discard failed:', e))
        .finally(() => classId && refresh(classId));
    },
    [classId, refresh],
  );

  return { waiting: stats.waiting, rejected, syncing, available, retry, retryOne, discardOne };
}

export { syncQueue };
