// lib/lens/offline/queue-store.ts
// IndexedDB persistence for the moment queue.
//
// Ported from lib/potato/offline/queue-store.ts. IndexedDB for the same reasons
// it was chosen there: it exists in every browser and in the installed PWA, it
// stores Blobs without base64, it needs no native plugin, and it survives an app
// restart.
//
// Every hard-won detail from that file is kept:
//   • normalizeIDBError — WebKit hands you a bare `null` on an aborted
//     transaction, which produced the useless "could not save: null" toast.
//   • saveEntryAndBlob — ONE transaction for the row and the bytes, so a crash
//     can never leave an orphaned blob or a row pointing at nothing.
//   • read-modify-write inside a single readwrite transaction, never across two.
//
// Changed for Lens: an entry may carry NO BLOB (a voice note, a typed line, a
// chip), so the blob store is written only when there are bytes and every read
// tolerates its absence.
//
// Zero imports from lib/montree/* or lib/potato/*.

import type { QueueEntry, QueueStats, QueueStatus } from './types';
import { MAX_QUEUE_SIZE } from './types';

const DB_NAME = 'montree-lens-queue';
const DB_VERSION = 1;
const STORE_ENTRIES = 'entries';
const STORE_BLOBS = 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * On WebKit/iOS an aborted IndexedDB request can leave `error` as literal
 * `null` (storage pressure, private browsing, quota). Rejecting that bare null
 * loses the trail entirely, so always reject a real Error naming the operation.
 */
function normalizeIDBError(err: unknown, context: string): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object' && 'message' in err && (err as { message?: unknown }).message) {
    const e = new Error(String((err as { message: unknown }).message));
    if ('name' in err && (err as { name?: unknown }).name) e.name = String((err as { name: unknown }).name);
    return e;
  }
  return new Error(
    `Saving to this device failed (${context}) — the browser gave no detail ` +
      '(possibly out of space, or private browsing).',
  );
}

export function isQueueAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      dbPromise = null;
      reject(new Error('This browser can’t save moments on the device.'));
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      // Firefox private browsing throws synchronously here.
      console.error('[lens/queue] indexedDB.open threw:', err);
      dbPromise = null;
      reject(new Error('Device storage unavailable — are you in private browsing?'));
      return;
    }

    request.onerror = () => {
      console.error('[lens/queue] open failed:', request.error);
      dbPromise = null;
      reject(normalizeIDBError(request.error, 'openDB'));
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const store = db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('visitId', 'visitId', { unique: false });
        store.createIndex('contentHash', 'contentHash', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

// ----------------------------------------------------------------- writes ---

/**
 * The row and the bytes in ONE transaction. If either half fails, neither is
 * written — there is no window in which a crash leaves a blob nobody
 * references, or a row whose photo is missing.
 *
 * `blob` is null for the three kinds that have no bytes; the transaction still
 * spans both stores so the code path is identical and there is no second,
 * subtly-different write for the common case.
 */
export async function saveEntryAndBlob(entry: QueueEntry, blob: Blob | null): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ENTRIES, STORE_BLOBS], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(normalizeIDBError(tx.error, 'saveEntryAndBlob'));
    tx.onabort = () => reject(normalizeIDBError(tx.error, 'saveEntryAndBlob:abort'));
    if (blob) tx.objectStore(STORE_BLOBS).put({ id: entry.id, blob });
    tx.objectStore(STORE_ENTRIES).put(entry);
  });
}

/**
 * Read-modify-write inside ONE transaction. Doing it across two transactions
 * loses concurrent writes — a bug Montree hit and fixed.
 */
export async function updateEntry(
  id: string,
  status: QueueStatus,
  updates?: Partial<QueueEntry>,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readwrite');
    const store = tx.objectStore(STORE_ENTRIES);
    const getReq = store.get(id);
    getReq.onerror = () => reject(normalizeIDBError(getReq.error, 'updateEntry:get'));
    getReq.onsuccess = () => {
      const current = getReq.result as QueueEntry | undefined;
      if (!current) {
        resolve(); // already gone — nothing to do
        return;
      }
      const putReq = store.put({ ...current, ...updates, status });
      putReq.onerror = () => reject(normalizeIDBError(putReq.error, 'updateEntry:put'));
      putReq.onsuccess = () => resolve();
    };
  });
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ENTRIES, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_ENTRIES).delete(id);
    tx.objectStore(STORE_BLOBS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(normalizeIDBError(tx.error, 'deleteEntry'));
  });
}

export async function deleteBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    const request = tx.objectStore(STORE_BLOBS).delete(id);
    request.onerror = () => reject(normalizeIDBError(request.error, 'deleteBlob'));
    request.onsuccess = () => resolve();
  });
}

// ------------------------------------------------------------------ reads ---

export async function getEntry(id: string): Promise<QueueEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const request = tx.objectStore(STORE_ENTRIES).get(id);
    request.onerror = () => reject(normalizeIDBError(request.error, 'getEntry'));
    request.onsuccess = () => resolve((request.result as QueueEntry) ?? null);
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const request = tx.objectStore(STORE_BLOBS).get(id);
    request.onerror = () => reject(normalizeIDBError(request.error, 'getBlob'));
    request.onsuccess = () => resolve(request.result?.blob ?? null);
  });
}

export async function getAllEntries(): Promise<QueueEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const request = tx.objectStore(STORE_ENTRIES).getAll();
    request.onerror = () => reject(normalizeIDBError(request.error, 'getAllEntries'));
    request.onsuccess = () => resolve((request.result || []) as QueueEntry[]);
  });
}

/** Everything still on the device for one visit, oldest capture first. */
export async function getVisitEntries(visitId: string): Promise<QueueEntry[]> {
  const all = await getAllEntries();
  return all
    .filter((e) => e.visitId === visitId)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

/**
 * Entries due for an attempt right now, oldest capture first.
 * `nextAttemptAt` is what implements the exponential backoff: a failed entry
 * simply is not due yet.
 */
export async function getDueEntries(visitId: string, now = Date.now()): Promise<QueueEntry[]> {
  const all = await getAllEntries();
  return all
    .filter(
      (e) =>
        (e.status === 'pending' || e.status === 'failed') &&
        e.visitId === visitId &&
        new Date(e.nextAttemptAt).getTime() <= now,
    )
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

/** The soonest moment any waiting entry becomes due, or null if none wait. */
export async function nextDueAt(visitId: string): Promise<number | null> {
  const all = await getAllEntries();
  const times = all
    .filter((e) => (e.status === 'pending' || e.status === 'failed') && e.visitId === visitId)
    .map((e) => new Date(e.nextAttemptAt).getTime())
    .filter((t) => Number.isFinite(t));
  return times.length > 0 ? Math.min(...times) : null;
}

export async function findByContentHash(
  contentHash: string,
  visitId: string,
): Promise<QueueEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ENTRIES, 'readonly');
    const index = tx.objectStore(STORE_ENTRIES).index('contentHash');
    const request = index.getAll(IDBKeyRange.only(contentHash));
    request.onerror = () => reject(normalizeIDBError(request.error, 'findByContentHash'));
    request.onsuccess = () => {
      const matches = (request.result || []) as QueueEntry[];
      resolve(matches.find((e) => e.visitId === visitId) ?? null);
    };
  });
}

export async function getStats(visitId?: string): Promise<QueueStats> {
  const all = await getAllEntries();
  const mine = visitId ? all.filter((e) => e.visitId === visitId) : all;
  const stats: QueueStats = { total: mine.length, waiting: 0, uploading: 0, rejected: 0, bytesWaiting: 0 };
  for (const e of mine) {
    if (e.status === 'pending' || e.status === 'failed') {
      stats.waiting++;
      stats.bytesWaiting += e.sizeBytes;
    } else if (e.status === 'uploading') {
      stats.waiting++;
      stats.uploading++;
      stats.bytesWaiting += e.sizeBytes;
    } else if (e.status === 'rejected') {
      stats.rejected++;
    }
  }
  return stats;
}

export async function getQueueSize(): Promise<number> {
  return (await getAllEntries()).length;
}

export async function isQueueFull(): Promise<boolean> {
  return (await getQueueSize()) >= MAX_QUEUE_SIZE;
}

// ---------------------------------------------------------------- cleanup ---

function revoke(entry: QueueEntry): void {
  if (entry._localUrl) {
    try {
      URL.revokeObjectURL(entry._localUrl);
    } catch {
      /* non-fatal */
    }
  }
}

/** Sweep entries the server already has. Never touches anything still owed. */
export async function sweepUploaded(olderThanMs: number): Promise<number> {
  const entries = await getAllEntries();
  const cutoff = Date.now() - olderThanMs;
  let swept = 0;
  for (const entry of entries) {
    if (entry.status === 'uploaded' && new Date(entry.uploadedAt || 0).getTime() < cutoff) {
      revoke(entry);
      await deleteEntry(entry.id);
      swept++;
    }
  }
  return swept;
}

/**
 * Make room under storage pressure.
 *
 * 🚨 DELIBERATELY WEAKER THAN MONTREE'S, for the same reason Potato Snaps's is:
 * Montree's aggressiveCleanup will, as a last resort, delete pending entries
 * older than 7 days. Lens must not. An observation captured in somebody's
 * classroom is not reproducible — she cannot go back and take it again — so
 * only entries the server already has, or has permanently refused (and which
 * she can see and dismiss), are ever removed here. If that is not enough room,
 * enqueue fails loudly instead.
 */
export async function makeRoom(): Promise<number> {
  const entries = await getAllEntries();
  let freed = 0;

  const uploaded = entries
    .filter((e) => e.status === 'uploaded')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const entry of uploaded) {
    revoke(entry);
    await deleteEntry(entry.id);
    freed++;
  }

  // Rejections older than a week: she has had every chance to see them.
  const staleCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const rejected = entries
    .filter((e) => e.status === 'rejected' && new Date(e.createdAt).getTime() < staleCutoff)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const entry of rejected) {
    revoke(entry);
    await deleteEntry(entry.id);
    freed++;
  }

  return freed;
}

/** Drop a rejected entry she has chosen to give up on. */
export async function discardEntry(id: string): Promise<void> {
  const entry = await getEntry(id);
  if (entry) revoke(entry);
  await deleteEntry(id);
}
