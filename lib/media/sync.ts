// lib/media/sync.ts
// Background sync service - uploads queued media when online
// Session 54: Never lose a photo, sync silently in background

import type { MediaRecord, MediaQueueItem, SyncState } from './types';
import * as db from './db';

// Sync state
let syncState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
};

// Listeners for state changes
type SyncListener = (state: SyncState) => void;
const listeners: Set<SyncListener> = new Set();

// Retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m

/**
 * Subscribe to sync state changes
 */
export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(syncState); // Immediately notify current state
  return () => listeners.delete(listener);
}

/**
 * Get current sync state
 */
export function getSyncState(): SyncState {
  return { ...syncState };
}

/**
 * Update and broadcast sync state
 */
function updateSyncState(updates: Partial<SyncState>) {
  syncState = { ...syncState, ...updates };
  listeners.forEach(listener => listener(syncState));
}

/**
 * Initialize sync system - call once on app start
 */
export function initSync() {
  if (typeof window === 'undefined') return;
  
  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Check initial state
  updateSyncState({ isOnline: navigator.onLine });
  
  // Start sync if online
  if (navigator.onLine) {
    processQueue();
  }
  
  // Periodic sync check every 30 seconds
  setInterval(() => {
    if (syncState.isOnline && !syncState.isSyncing) {
      processQueue();
    }
  }, 30000);
  
  // Update pending count
  updatePendingCount();
}

async function handleOnline() {
  console.log('📶 Online - starting sync');
  updateSyncState({ isOnline: true });
  processQueue();
}

function handleOffline() {
  console.log('📴 Offline - pausing sync');
  updateSyncState({ isOnline: false });
}

async function updatePendingCount() {
  const count = await db.getQueueLength();
  const pending = await db.getPendingMedia();
  const failed = pending.filter(m => m.syncStatus === 'failed').length;
  updateSyncState({ 
    pendingCount: count,
    failedCount: failed
  });
}

/**
 * Queue a media item for upload
 */
export async function queueUpload(
  media: MediaRecord, 
  blob: Blob,
  priority: number = 3
): Promise<void> {
  // Save to local DB first (instant)
  await db.saveMedia(media);
  await db.saveBlob(media.id, blob);
  
  // Add to upload queue
  const queueItem: MediaQueueItem = {
    id: media.id,
    media,
    blob,
    priority,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  
  await db.addToQueue(queueItem);
  await updatePendingCount();
  
  // Trigger sync if online
  if (syncState.isOnline && !syncState.isSyncing) {
    processQueue();
  }
}

/**
 * Process upload queue
 */
async function processQueue() {
  if (syncState.isSyncing || !syncState.isOnline) return;
  
  updateSyncState({ isSyncing: true });
  
  try {
    let item = await db.getNextQueueItem();
    
    while (item && syncState.isOnline) {
      const success = await uploadItem(item);
      
      if (success) {
        // Remove from queue on success
        await db.removeFromQueue(item.id);
      } else {
        // Update retry count and reschedule
        item.attempts++;
        item.lastAttempt = new Date().toISOString();
        
        if (item.attempts >= MAX_RETRIES) {
          // Mark as failed after max retries
          const media = await db.getMedia(item.id);
          if (media) {
            media.syncStatus = 'failed';
            media.syncError = item.error || 'Max retries exceeded';
            await db.saveMedia(media);
          }
          await db.removeFromQueue(item.id);
        } else {
          // Increase priority (lower number = higher priority becomes lower)
          item.priority = Math.min(5, item.priority + 1);
          await db.addToQueue(item);
          
          // Wait before retry
          const delay = RETRY_DELAYS[Math.min(item.attempts, RETRY_DELAYS.length - 1)];
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      await updatePendingCount();
      item = await db.getNextQueueItem();
    }
  } finally {
    updateSyncState({ 
      isSyncing: false,
      lastSyncAt: new Date().toISOString()
    });
  }
}

/**
 * Upload a single item to server
 */
async function uploadItem(item: MediaQueueItem): Promise<boolean> {
  const { media, blob } = item;
  
  try {
    // Update status to uploading
    media.syncStatus = 'uploading';
    await db.saveMedia(media);
    
    // Build form data
    const formData = new FormData();
    formData.append('file', blob, `capture-${Date.now()}.jpg`);
    
    // Build metadata
    const metadata = {
      school_id: 'default-school', // TODO: Get from context
      child_id: media.childId,
      media_type: media.mediaType,
      captured_at: media.capturedAt,
      work_id: media.workId,
      caption: media.caption || media.workName || 'Quick Capture',
      tags: media.tags || [],
      width: media.width,
      height: media.height,
    };
    formData.append('metadata', JSON.stringify(metadata));
    
    // Upload to unified API
    const response = await fetch('/api/montree/media/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    
    // Update media record with server data
    media.syncStatus = 'synced';
    media.remotePath = result.media?.storage_path;
    media.remoteUrl = result.media?.public_url;
    media.uploadedAt = new Date().toISOString();
    media.syncError = undefined;
    await db.saveMedia(media);
    
    // Clean up local blob (keep for 24h for offline viewing)
    // We'll do this in a separate cleanup job
    
    console.log(`✅ Uploaded: ${media.id}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Upload failed: ${media.id}`, error);
    
    item.error = error instanceof Error ? error.message : 'Unknown error';
    media.syncStatus = 'pending';
    media.syncError = item.error;
    media.syncAttempts = (media.syncAttempts || 0) + 1;
    media.lastSyncAttempt = new Date().toISOString();
    await db.saveMedia(media);
    
    return false;
  }
}

/**
 * Retry all failed uploads
 */
export async function retryFailedUploads(): Promise<void> {
  const allMedia = await db.getAllMedia();
  const failed = allMedia.filter(m => m.syncStatus === 'failed');
  
  for (const media of failed) {
    const blob = await db.getBlob(media.id);
    if (blob) {
      media.syncStatus = 'pending';
      media.syncAttempts = 0;
      await queueUpload(media, blob, 1); // High priority
    }
  }
}

/**
 * Force sync now
 */
export async function syncNow(): Promise<void> {
  if (!syncState.isOnline) {
    console.log('Cannot sync - offline');
    return;
  }
  
  await processQueue();
}
