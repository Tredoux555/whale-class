// lib/media/db.ts
// IndexedDB wrapper for offline media storage
// Session 54: Never lose a photo

const DB_NAME = 'whale-media';
const DB_VERSION = 1;

// Store names
const STORES = {
  MEDIA: 'media',      // MediaRecord objects
  BLOBS: 'blobs',      // Raw image/video blobs
  QUEUE: 'queue',      // Upload queue
} as const;

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize or get IndexedDB instance
 */
export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Media records store
      if (!db.objectStoreNames.contains(STORES.MEDIA)) {
        const mediaStore = db.createObjectStore(STORES.MEDIA, { keyPath: 'id' });
        mediaStore.createIndex('childId', 'childId', { unique: false });
        mediaStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        mediaStore.createIndex('capturedAt', 'capturedAt', { unique: false });
      }
      
      // Blob store (raw files)
      if (!db.objectStoreNames.contains(STORES.BLOBS)) {
        db.createObjectStore(STORES.BLOBS, { keyPath: 'id' });
      }
      
      // Upload queue
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id' });
        queueStore.createIndex('priority', 'priority', { unique: false });
        queueStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Generic store operation wrapper
 */
async function storeOperation<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// MEDIA RECORDS
// ============================================

import type { MediaRecord } from './types';

export async function saveMedia(media: MediaRecord): Promise<void> {
  await storeOperation(STORES.MEDIA, 'readwrite', (store) => store.put(media));
}

export async function getMedia(id: string): Promise<MediaRecord | undefined> {
  return storeOperation(STORES.MEDIA, 'readonly', (store) => store.get(id));
}

export async function getAllMedia(): Promise<MediaRecord[]> {
  return storeOperation(STORES.MEDIA, 'readonly', (store) => store.getAll());
}

export async function getMediaByChild(childId: string): Promise<MediaRecord[]> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MEDIA, 'readonly');
    const store = tx.objectStore(STORES.MEDIA);
    const index = store.index('childId');
    const request = index.getAll(childId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingMedia(): Promise<MediaRecord[]> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MEDIA, 'readonly');
    const store = tx.objectStore(STORES.MEDIA);
    const index = store.index('syncStatus');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMedia(id: string): Promise<void> {
  await storeOperation(STORES.MEDIA, 'readwrite', (store) => store.delete(id));
  // Also delete associated blob
  await storeOperation(STORES.BLOBS, 'readwrite', (store) => store.delete(id));
}

// ============================================
// BLOB STORAGE
// ============================================

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  await storeOperation(STORES.BLOBS, 'readwrite', (store) => 
    store.put({ id, blob, savedAt: new Date().toISOString() })
  );
}

export async function getBlob(id: string): Promise<Blob | undefined> {
  const result = await storeOperation<{ id: string; blob: Blob } | undefined>(
    STORES.BLOBS, 
    'readonly', 
    (store) => store.get(id)
  );
  return result?.blob;
}

export async function deleteBlob(id: string): Promise<void> {
  await storeOperation(STORES.BLOBS, 'readwrite', (store) => store.delete(id));
}

// ============================================
// UPLOAD QUEUE
// ============================================

import type { MediaQueueItem } from './types';

export async function addToQueue(item: MediaQueueItem): Promise<void> {
  await storeOperation(STORES.QUEUE, 'readwrite', (store) => store.put(item));
}

export async function getQueueItem(id: string): Promise<MediaQueueItem | undefined> {
  return storeOperation(STORES.QUEUE, 'readonly', (store) => store.get(id));
}

export async function getNextQueueItem(): Promise<MediaQueueItem | undefined> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.QUEUE, 'readonly');
    const store = tx.objectStore(STORES.QUEUE);
    const index = store.index('priority');
    const request = index.openCursor();
    
    request.onsuccess = () => {
      const cursor = request.result;
      resolve(cursor?.value);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getQueueLength(): Promise<number> {
  return storeOperation(STORES.QUEUE, 'readonly', (store) => store.count());
}

export async function removeFromQueue(id: string): Promise<void> {
  await storeOperation(STORES.QUEUE, 'readwrite', (store) => store.delete(id));
}

export async function clearQueue(): Promise<void> {
  await storeOperation(STORES.QUEUE, 'readwrite', (store) => store.clear());
}

// ============================================
// CLEANUP UTILITIES
// ============================================

/**
 * Remove synced media older than specified days to free up storage
 */
export async function cleanupOldMedia(daysOld: number = 30): Promise<number> {
  const allMedia = await getAllMedia();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  
  let deletedCount = 0;
  
  for (const media of allMedia) {
    if (
      media.syncStatus === 'synced' && 
      new Date(media.capturedAt) < cutoff
    ) {
      await deleteMedia(media.id);
      deletedCount++;
    }
  }
  
  return deletedCount;
}

/**
 * Get storage usage estimate
 */
export async function getStorageUsage(): Promise<{ used: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { used: 0, quota: 0 };
}
