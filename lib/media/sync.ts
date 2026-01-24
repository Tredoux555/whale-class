// lib/media/sync.ts
// Background sync service - uploads queued media when online
// Session 54: Deep audit - better error handling

import type { MediaRecord, MediaQueueItem, SyncState } from './types';
import * as db from './db';

// ==========================================
// STATE MANAGEMENT
// ==========================================

let syncState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
};

type SyncListener = (state: SyncState) => void;
const listeners: Set<SyncListener> = new Set();

let initialized = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;

// Retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 15000, 60000, 300000];

// ==========================================
// PUBLIC API
// ==========================================

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(syncState);
  return () => listeners.delete(listener);
}

export function getSyncState(): SyncState {
  return { ...syncState };
}

export function initSync() {
  if (typeof window === 'undefined') return;
  if (initialized) return;
  
  initialized = true;
  
  // Listen for online/offline
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Set initial online state
  updateSyncState({ isOnline: navigator.onLine });
  
  // Start sync if online
  if (navigator.onLine) {
    setTimeout(processQueue, 1000); // Delay to let app settle
  }
  
  // Periodic sync every 30 seconds
  syncInterval = setInterval(() => {
    if (syncState.isOnline && !syncState.isSyncing) {
      processQueue();
    }
  }, 30000);
  
  // Initial count update
  updatePendingCount();
}

export async function queueUpload(
  media: MediaRecord, 
  blob: Blob,
  priority: number = 3
): Promise<void> {
  try {
    // Save to local DB first
    await db.saveMedia(media);
    await db.saveBlob(media.id, blob);
    
    // Add to queue
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
  } catch (error) {
    console.error('Failed to queue upload:', error);
    throw error;
  }
}

export async function syncNow(): Promise<void> {
  if (!syncState.isOnline) return;
  await processQueue();
}

export async function retryFailedUploads(): Promise<void> {
  try {
    const allMedia = await db.getAllMedia();
    const failed = allMedia.filter(m => m.syncStatus === 'failed');
    
    for (const media of failed) {
      const blob = await db.getBlob(media.id);
      if (blob) {
        media.syncStatus = 'pending';
        media.syncAttempts = 0;
        media.syncError = undefined;
        await queueUpload(media, blob, 1);
      }
    }
  } catch (error) {
    console.error('Failed to retry uploads:', error);
  }
}

// ==========================================
// INTERNAL FUNCTIONS
// ==========================================

function updateSyncState(updates: Partial<SyncState>) {
  syncState = { ...syncState, ...updates };
  listeners.forEach(listener => {
    try {
      listener(syncState);
    } catch (e) {
      console.error('Sync listener error:', e);
    }
  });
}

async function handleOnline() {
  console.log('📶 Online');
  updateSyncState({ isOnline: true });
  processQueue();
}

function handleOffline() {
  console.log('📴 Offline');
  updateSyncState({ isOnline: false });
}

async function updatePendingCount() {
  try {
    const count = await db.getQueueLength();
    const allMedia = await db.getAllMedia();
    const failed = allMedia.filter(m => m.syncStatus === 'failed').length;
    updateSyncState({ pendingCount: count, failedCount: failed });
  } catch (error) {
    console.error('Failed to update pending count:', error);
  }
}

async function processQueue() {
  if (syncState.isSyncing || !syncState.isOnline) return;
  
  updateSyncState({ isSyncing: true });
  
  try {
    let item = await db.getNextQueueItem();
    
    while (item && syncState.isOnline) {
      const success = await uploadItem(item);
      
      if (success) {
        await db.removeFromQueue(item.id);
      } else {
        item.attempts++;
        item.lastAttempt = new Date().toISOString();
        
        if (item.attempts >= MAX_RETRIES) {
          // Mark as failed
          const media = await db.getMedia(item.id);
          if (media) {
            media.syncStatus = 'failed';
            media.syncError = item.error || 'Max retries exceeded';
            await db.saveMedia(media);
          }
          await db.removeFromQueue(item.id);
        } else {
          // Re-queue with lower priority
          item.priority = Math.min(5, item.priority + 1);
          await db.addToQueue(item);
          
          // Brief delay before next attempt
          await sleep(RETRY_DELAYS[Math.min(item.attempts - 1, RETRY_DELAYS.length - 1)]);
        }
      }
      
      await updatePendingCount();
      item = await db.getNextQueueItem();
    }
  } catch (error) {
    console.error('Queue processing error:', error);
  } finally {
    updateSyncState({ 
      isSyncing: false,
      lastSyncAt: new Date().toISOString()
    });
  }
}

async function uploadItem(item: MediaQueueItem): Promise<boolean> {
  const { media, blob } = item;
  
  try {
    // Update status
    media.syncStatus = 'uploading';
    await db.saveMedia(media);
    
    // Determine file extension based on media type
    let filename: string;
    if (media.mediaType === 'document' && media.fileName) {
      filename = media.fileName;
    } else {
      const ext = media.mediaType === 'video' ? 'mp4' : 'jpg';
      filename = `capture-${Date.now()}.${ext}`;
    }
    
    // Build form data
    const formData = new FormData();
    formData.append('file', blob, filename);
    
    const metadata = {
      child_id: media.childId,
      media_type: media.mediaType,
      captured_at: media.capturedAt,
      work_id: media.workId,
      caption: media.caption || media.workName || (media.mediaType === 'document' ? 'Document' : 'Quick Capture'),
      tags: media.tags || [],
      width: media.width,
      height: media.height,
      file_name: media.fileName,
      mime_type: media.mimeType,
    };
    formData.append('metadata', JSON.stringify(metadata));
    
    // Upload
    const response = await fetch('/api/montree/media/upload', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Upload failed');
    }
    
    // Success - update record
    media.syncStatus = 'synced';
    media.remotePath = result.media?.storage_path;
    media.remoteUrl = result.media?.public_url;
    media.uploadedAt = new Date().toISOString();
    media.syncError = undefined;
    await db.saveMedia(media);
    
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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
