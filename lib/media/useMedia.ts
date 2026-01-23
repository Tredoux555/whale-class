// lib/media/useMedia.ts
// React hook for media capture and sync
// Session 54: Simple hook for components

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MediaRecord, SyncState, CaptureOptions } from './types';
import { 
  captureMedia, 
  getChildMedia, 
  getRecentCaptures,
  deleteCapture,
  initSync,
  subscribeSyncState,
  syncNow,
  retryFailedUploads,
  isReady
} from './index';

// Initialize sync once
let syncInitialized = false;

/**
 * Hook for media capture and management
 */
export function useMedia() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
  });
  const [ready, setReady] = useState(false);

  // Initialize sync system once
  useEffect(() => {
    if (!syncInitialized && typeof window !== 'undefined') {
      syncInitialized = true;
      initSync();
    }
    
    setReady(isReady());
    
    // Subscribe to sync state changes
    const unsubscribe = subscribeSyncState(setSyncState);
    return unsubscribe;
  }, []);

  /**
   * Capture a photo - returns immediately with local record
   */
  const capture = useCallback(async (
    blob: Blob,
    options: CaptureOptions
  ): Promise<MediaRecord> => {
    return captureMedia(blob, options);
  }, []);

  /**
   * Force sync now
   */
  const sync = useCallback(async () => {
    await syncNow();
  }, []);

  /**
   * Retry failed uploads
   */
  const retryFailed = useCallback(async () => {
    await retryFailedUploads();
  }, []);

  return {
    // State
    ready,
    syncState,
    isOnline: syncState.isOnline,
    isSyncing: syncState.isSyncing,
    pendingCount: syncState.pendingCount,
    failedCount: syncState.failedCount,
    
    // Actions
    capture,
    sync,
    retryFailed,
  };
}

/**
 * Hook for child-specific media
 */
export function useChildMedia(childId: string | null) {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!childId) {
      setMedia([]);
      setLoading(false);
      return;
    }
    
    try {
      const childMedia = await getChildMedia(childId);
      setMedia(childMedia);
    } catch (error) {
      console.error('Failed to load child media:', error);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await deleteCapture(id);
    setMedia(prev => prev.filter(m => m.id !== id));
  }, []);

  return {
    media,
    loading,
    refresh,
    remove,
  };
}

/**
 * Hook for recent captures (all children)
 */
export function useRecentCaptures(limit = 20) {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const recent = await getRecentCaptures(limit);
      setMedia(recent);
    } catch (error) {
      console.error('Failed to load recent captures:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    media,
    loading,
    refresh,
  };
}
