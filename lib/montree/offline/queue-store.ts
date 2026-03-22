// lib/montree/offline/queue-store.ts
// Persistent photo queue using IndexedDB (works in both web and Capacitor webview)
//
// We use IndexedDB instead of SQLite because:
// 1. Available in ALL environments (web browser + Capacitor webview)
// 2. No native plugin dependency (SQLite requires @capacitor-community/sqlite)
// 3. Supports storing Blobs directly (no base64 conversion needed)
// 4. Simpler setup — zero native configuration
// 5. Capacitor webview IndexedDB persists across app restarts
//
// Trade-off: Less queryable than SQLite, but for a queue of <200 items it's perfect.

import type { PhotoQueueEntry, PhotoQueueStats, PhotoQueueStatus } from './types';
import { MAX_QUEUE_SIZE } from './types';

const DB_NAME = 'montree-photo-queue';
const DB_VERSION = 1;
const STORE_ENTRIES = 'entries';
const STORE_BLOBS = 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

// ============================================
// DATABASE INIT
// ============================================

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    // Guard: IndexedDB may not be available (private browsing, disabled, old browser)
    if (typeof indexedDB === 'undefined') {
      dbPromise = null;
      reject(new Error('Photo storage unavailable — IndexedDB not supported'));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      // Synchronous exception (Firefox private browsing throws here)
      console.error('[PHOTO_QUEUE] IndexedDB.open() threw:', err);
      dbPromise = null;
      reject(new Error('Photo storage unavailable — are you in private browsing mode?'));
      return;
    }

    request.onerror = () => {
      console.error('[PHOTO_QUEUE] IndexedDB open failed:', request.error);
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Queue metadata store
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const store = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('child_id', 'child_id', { unique: false });
        store.createIndex('school_id', 'school_id', { unique: false });
        store.createIndex('content_hash', 'content_hash', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }

      // Blob store (photo data)
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

// ============================================
// ENTRY OPERATIONS
// ============================================

export async function saveEntry(entry: PhotoQueueEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTRIES);
    const request = store.put(entry);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getEntry(id: string): Promise<PhotoQueueEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const request = tx.objectStore(STORE_ENTRIES).get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ENTRIES, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_ENTRIES).delete(id);
    tx.objectStore(STORE_BLOBS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Update entry status atomically in a single IndexedDB transaction.
 * FIX: Previous implementation used read-then-write across 2 separate transactions,
 * which could lose data if another write happened between the read and write.
 * Now performs read + modify + write within the SAME readwrite transaction.
 */
export async function updateEntryStatus(
  id: string,
  status: PhotoQueueStatus,
  updates?: Partial<PhotoQueueEntry>
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTRIES);
    const getReq = store.get(id);
    getReq.onerror = () => reject(getReq.error);
    getReq.onsuccess = () => {
      const entry = getReq.result as PhotoQueueEntry | undefined;
      if (!entry) {
        resolve(); // Entry already deleted — nothing to update
        return;
      }
      const updated: PhotoQueueEntry = {
        ...entry,
        ...updates,
        status,
      };
      const putReq = store.put(updated);
      putReq.onerror = () => reject(putReq.error);
      putReq.onsuccess = () => resolve();
    };
  });
}

// ============================================
// QUERY OPERATIONS
// ============================================

export async function getPendingEntries(): Promise<PhotoQueueEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const store = tx.objectStore(STORE_ENTRIES);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const all = (request.result || []) as PhotoQueueEntry[];
      // Return entries that should be retried, ordered by creation time
      const pending = all
        .filter(e => e.status === 'pending' || e.status === 'failed')
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      resolve(pending);
    };
  });
}

export async function getEntriesForChild(childId: string): Promise<PhotoQueueEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const index = tx.objectStore(STORE_ENTRIES).index('child_id');
    const request = index.getAll(IDBKeyRange.only(childId));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const entries = (request.result || []) as PhotoQueueEntry[];
      resolve(entries.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    };
  });
}

export async function getAllEntries(): Promise<PhotoQueueEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const request = tx.objectStore(STORE_ENTRIES).getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result || []) as PhotoQueueEntry[]);
  });
}

export async function findByContentHash(
  contentHash: string,
  childId: string
): Promise<PhotoQueueEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const index = tx.objectStore(STORE_ENTRIES).index('content_hash');
    const request = index.getAll(IDBKeyRange.only(contentHash));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const matches = (request.result || []) as PhotoQueueEntry[];
      const match = matches.find(e => e.child_id === childId);
      resolve(match ?? null);
    };
  });
}

export async function getQueueStats(): Promise<PhotoQueueStats> {
  const entries = await getAllEntries();
  // Single-pass: O(N) instead of O(6N) from 6 separate .filter() calls
  const stats: PhotoQueueStats = {
    total: entries.length,
    pending: 0, uploading: 0, uploaded: 0, failed: 0, permanent_failure: 0,
    total_bytes_pending: 0,
  };
  for (const e of entries) {
    if (e.status === 'pending') { stats.pending++; stats.total_bytes_pending += e.blob_size_bytes; }
    else if (e.status === 'uploading') { stats.uploading++; stats.total_bytes_pending += e.blob_size_bytes; }
    else if (e.status === 'uploaded') stats.uploaded++;
    else if (e.status === 'failed') { stats.failed++; stats.total_bytes_pending += e.blob_size_bytes; }
    else if (e.status === 'permanent_failure') stats.permanent_failure++;
  }
  return stats;
}

export async function getQueueSize(): Promise<number> {
  const entries = await getAllEntries();
  return entries.length;
}

export async function isQueueFull(): Promise<boolean> {
  const size = await getQueueSize();
  return size >= MAX_QUEUE_SIZE;
}

// ============================================
// ATOMIC OPERATIONS (blob + entry in single transaction)
// ============================================

/**
 * Save both blob and entry atomically in a single IndexedDB transaction.
 * If either fails, both are rolled back. Prevents orphaned blobs.
 * FIX: CRITICAL-001 — crash between separate saves could orphan blob.
 */
export async function saveEntryAndBlob(entry: PhotoQueueEntry, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ENTRIES, STORE_BLOBS], 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    // Both writes in same transaction — atomic
    tx.objectStore(STORE_BLOBS).put({ id: entry.id, blob });
    tx.objectStore(STORE_ENTRIES).put(entry);
  });
}

// ============================================
// BLOB OPERATIONS
// ============================================

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    const request = tx.objectStore(STORE_BLOBS).put({ id, blob });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const request = tx.objectStore(STORE_BLOBS).get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result?.blob ?? null);
    };
  });
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    const request = tx.objectStore(STORE_BLOBS).delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================
// CLEANUP
// ============================================

/**
 * Remove uploaded entries older than 24 hours
 * (keeps recently uploaded for gallery merge dedup)
 */
export async function cleanupOldEntries(): Promise<number> {
  const entries = await getAllEntries();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let cleaned = 0;

  for (const entry of entries) {
    if (entry.status === 'uploaded' && new Date(entry.synced_at || 0).getTime() < cutoff) {
      await deleteEntry(entry.id);
      cleaned++;
    }
  }

  return cleaned;
}
