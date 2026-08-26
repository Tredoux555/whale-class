// lib/lens/offline/useLensQueue.ts
// The one hook the capture screen needs: how many moments are still owed to the
// server, which ones were refused, the ones not yet uploaded (so the timeline
// can show them straight away), and a way to try again now.
//
// Registers the sync triggers for the open visit and keeps live stats by
// subscribing to the engine's events — no polling.

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QueueEntry, QueueStats } from './types';
import {
  addSyncListener,
  setActiveVisit,
  syncQueue,
  retryNow,
  retryRejected,
  discardRejected,
  queueStats,
  listRejected,
  listPending,
  isSyncing,
} from './sync-manager';
import { registerLensSyncTriggers } from './triggers';
import { isQueueAvailable } from './queue-store';

const EMPTY: QueueStats = { total: 0, waiting: 0, uploading: 0, rejected: 0, bytesWaiting: 0 };

export interface LensQueueState {
  /** moments on the device still owed to the server */
  waiting: number;
  /** not yet uploaded — rendered optimistically at the end of the timeline */
  pending: QueueEntry[];
  /** the server refused these for good — she must decide */
  rejected: QueueEntry[];
  syncing: boolean;
  /** false when the browser has no IndexedDB at all (private mode, ancient) */
  available: boolean;
  retry: () => void;
  retryOne: (id: string) => void;
  discardOne: (id: string) => void;
  /** call after enqueueing so the pill and the optimistic list update at once */
  refresh: () => void;
}

export function useLensQueue(visitId: string | null): LensQueueState {
  const [stats, setStats] = useState<QueueStats>(EMPTY);
  const [rejected, setRejected] = useState<QueueEntry[]>([]);
  const [pending, setPending] = useState<QueueEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const available = isQueueAvailable();

  const reload = useCallback(async (id: string) => {
    try {
      const [s, r, p] = await Promise.all([queueStats(id), listRejected(id), listPending(id)]);
      setStats(s);
      setRejected(r);
      setPending(p);
      setSyncing(isSyncing());
    } catch (e) {
      console.error('[lens/queue] refresh failed:', e);
    }
  }, []);

  useEffect(() => {
    if (!visitId || !available) {
      setActiveVisit(null);
      setStats(EMPTY);
      setRejected([]);
      setPending([]);
      return;
    }
    setActiveVisit(visitId);
    reload(visitId);

    const off = addSyncListener((event) => {
      if (event.type === 'stats') setStats(event.stats);
      if (event.type === 'sync_start') setSyncing(true);
      if (event.type === 'sync_complete') setSyncing(false);
      // Anything that changes WHICH entries exist needs the full reload; a
      // stats event alone cannot describe the optimistic list.
      if (
        event.type === 'rejected' ||
        event.type === 'uploaded' ||
        event.type === 'enqueued' ||
        event.type === 'failed'
      ) {
        reload(visitId);
      }
    });
    const unregister = registerLensSyncTriggers(visitId);

    return () => {
      off();
      unregister();
    };
  }, [visitId, available, reload]);

  const retry = useCallback(() => {
    if (!visitId) return;
    retryNow(visitId)
      .catch((e) => console.error('[lens/queue] manual retry failed:', e))
      .finally(() => reload(visitId));
  }, [visitId, reload]);

  const retryOne = useCallback(
    (id: string) => {
      retryRejected(id)
        .catch((e) => console.error('[lens/queue] retry one failed:', e))
        .finally(() => visitId && reload(visitId));
    },
    [visitId, reload],
  );

  const discardOne = useCallback(
    (id: string) => {
      discardRejected(id)
        .catch((e) => console.error('[lens/queue] discard failed:', e))
        .finally(() => visitId && reload(visitId));
    },
    [visitId, reload],
  );

  const refresh = useCallback(() => {
    if (visitId) reload(visitId);
  }, [visitId, reload]);

  return {
    waiting: stats.waiting,
    pending,
    rejected,
    syncing,
    available,
    retry,
    retryOne,
    discardOne,
    refresh,
  };
}

export { syncQueue };
