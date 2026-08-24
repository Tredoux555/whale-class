// lib/potato/offline/sync-manager.ts
// The capture queue's engine: save first, upload later, never lose a photo.
//
// Ported from lib/montree/offline/sync-manager.ts, keeping the hardening that
// file earned in production:
//   • atomic blob+row write, so a crash orphans nothing
//   • content-hash dedup with a race-safe retry after the write
//   • delete the blob BEFORE marking uploaded (a crash then costs a local copy
//     of a photo that IS on the server — the safe direction to fail)
//   • a sync lock with a timeout that force-resets, so one wedged pass cannot
//     brick capture for the rest of the day
//   • 401 halts the whole pass immediately rather than burning every entry
//   • every error path writes a terminal-or-retryable status; nothing is ever
//     left stuck in 'uploading'
//
// Changed for Potato Snaps, deliberately:
//   • Tenancy is the CLASS, not the school.
//   • TRANSIENT failures retry FOREVER with capped exponential backoff. Montree
//     gives up after 5 attempts and marks permanent_failure; the founder's rule
//     here is that a photo on the device is never silently dropped, so only the
//     server saying "no, permanently" ends an entry's life.
//   • Permanent 4xx (413 too big, 415 wrong type, 400, 403, 404, 422…) mark the
//     entry `rejected` on the FIRST response — retrying a 413 forever is just
//     noise. 401 / 408 / 429 are explicitly NOT permanent.
//   • capturedAt travels with the entry and is sent to the server.
//   • No AI, no progress-update side effects.
//
// Zero imports from lib/montree/*.

import type { QueueEntry, QueueStats, SyncEvent, SyncResult } from './types';
import {
  MAX_CONCURRENT_UPLOADS,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  SYNC_TIMEOUT_MS,
  UPLOADED_TTL_MS,
} from './types';
import {
  saveEntryAndBlob,
  updateEntry,
  deleteEntry,
  deleteBlob,
  getEntry,
  getBlob,
  getAllEntries,
  getDueEntries,
  findByContentHash,
  isQueueFull,
  makeRoom,
  sweepUploaded,
  getStats,
} from './queue-store';

const UPLOAD_URL = '/api/potato/photos/upload';
const UPLOAD_TIMEOUT_MS = 60_000;

let syncInProgress = false;
let syncStartedAt = 0;
let activeClassId: string | null = null;

const listeners = new Set<(event: SyncEvent) => void>();

export function addSyncListener(fn: (event: SyncEvent) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(event: SyncEvent): void {
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (e) {
      console.error('[potato/queue] listener threw:', e);
    }
  });
}

async function emitStats(classId: string): Promise<void> {
  try {
    emit({ type: 'stats', stats: await getStats(classId) });
  } catch (e) {
    console.error('[potato/queue] stats failed:', e);
  }
}

/** Which class this device is currently signed in as. Set by the board. */
export function setActiveClass(classId: string | null): void {
  activeClassId = classId;
}

export function getActiveClass(): string | null {
  return activeClassId;
}

export function isSyncing(): boolean {
  return syncInProgress;
}

// ------------------------------------------------------------------ ids ----

/**
 * A stable id per capture. It doubles as the storage object name, which is what
 * makes a retry idempotent on the server: the second attempt writes to the same
 * path and the route recognises the row it already inserted.
 */
function newCaptureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Non-secure fallback for old webviews; still collision-safe enough here.
  const rand = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${rand()}-${rand()}-${rand()}`;
}

async function contentHashOf(blob: Blob): Promise<string> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) throw new Error('no subtle crypto');
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // crypto.subtle needs a secure context. Not cryptographic, but it still
    // catches the double-tap-the-shutter case, which is all dedup is for.
    return `fallback_${blob.size}_${blob.type}_${Date.now()}`;
  }
}

/**
 * 🚨 AUDIT FIX (v1.2, HIGH): reclaim rows abandoned mid-upload.
 *
 * If the browser/tab is killed while a request is in flight, its entry is
 * left at status 'uploading' forever — `getDueEntries` only ever selects
 * 'pending' | 'failed', so none of the automatic triggers (visibilitychange,
 * the `online` event, the backoff-due timer, or the 800ms startup pass) would
 * ever look at it again. Only a teacher manually tapping "try again" on the
 * pending pill (`retryNow`) used to reclaim it. That contradicts the "retries
 * forever, nothing silently dropped" promise this queue exists to keep: a
 * photo that survived the crash could still sit unsynced indefinitely if the
 * teacher trusted the background sync and never tapped anything.
 *
 * Called at the top of every `syncQueue` pass — i.e. every automatic trigger
 * too — so a genuinely abandoned upload heals itself on the very next
 * app-open or reconnect, the same as a 'failed' entry would.
 */
async function reclaimStaleUploads(classId: string): Promise<void> {
  const all = await getAllEntries();
  const now = Date.now();
  for (const entry of all) {
    if (entry.classId !== classId || entry.status !== 'uploading') continue;
    const lastAttemptMs = entry.lastAttemptAt ? new Date(entry.lastAttemptAt).getTime() : 0;
    if (now - lastAttemptMs > SYNC_TIMEOUT_MS) {
      await updateEntry(entry.id, 'pending', { nextAttemptAt: new Date(now).toISOString() });
    }
  }
}

function backoffFor(attemptCount: number): number {
  const delay = RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attemptCount - 1));
  // Jitter so twenty queued photos do not all retry on the same tick.
  const jittered = delay * (0.8 + Math.random() * 0.4);
  return Math.min(jittered, RETRY_MAX_DELAY_MS);
}

/**
 * Is this HTTP status a permanent refusal?
 *
 * 401 — the session expired; a fresh login fixes it, the photo is fine.
 * 408 / 429 — explicitly temporary.
 * Everything else in 4xx means the server looked at this exact photo and said
 * no: too big, wrong type, child not in the class. Retrying cannot change it.
 */
function isPermanentRejection(status: number): boolean {
  if (status === 401 || status === 408 || status === 429) return false;
  return status >= 400 && status < 500;
}

// -------------------------------------------------------------- enqueue ----

export interface EnqueueOptions {
  classId: string;
  childIds: string[];
  /** the instant the shutter fired — NOT the moment of upload */
  capturedAt: Date;
  width: number;
  height: number;
  /** the event she picked, or null/omitted for "Just class time" */
  sceneId?: string | null;
  /** true when this is a whole-room photo tagged with nobody on purpose */
  isGroup?: boolean;
}

/**
 * Write the photo to the device, then return. No network is touched here.
 *
 * This is the founder's rule in one function: by the time the teacher sees
 * "Saved", the photo is on the device and will survive a dead spot, a closed
 * lid, a flat battery and a browser restart.
 */
export async function enqueuePhoto(blob: Blob, opts: EnqueueOptions): Promise<QueueEntry> {
  if (await isQueueFull()) {
    await makeRoom();
    if (await isQueueFull()) {
      throw new Error(
        'The device is holding too many photos that haven’t uploaded yet. ' +
          'Connect to wi-fi and let them finish.',
      );
    }
  }

  const contentHash = await contentHashOf(blob);

  // Same shutter pressed twice? Hand back the entry we already have.
  const existing = await findByContentHash(contentHash, opts.classId);
  if (existing && existing.status !== 'rejected') return existing;

  const now = new Date();
  const id = newCaptureId();
  const entry: QueueEntry = {
    id,
    classId: opts.classId,
    childIds: opts.childIds,
    sceneId: opts.sceneId ?? null,
    isGroup: opts.isGroup ?? false,
    contentHash,
    filename: `snap-${id}.jpg`,
    sizeBytes: blob.size,
    mimeType: blob.type || 'image/jpeg',
    width: opts.width,
    height: opts.height,
    status: 'pending',
    attemptCount: 0,
    nextAttemptAt: now.toISOString(), // due immediately
    capturedAt: opts.capturedAt.toISOString(),
    createdAt: now.toISOString(),
  };

  try {
    await saveEntryAndBlob(entry, blob);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'ConstraintError') {
      const winner = await findByContentHash(contentHash, opts.classId);
      if (winner) return winner;
    }
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      await makeRoom();
      try {
        await saveEntryAndBlob(entry, blob);
      } catch {
        throw new Error('This device is out of storage. Free up some space and try again.');
      }
    } else {
      throw err;
    }
  }

  try {
    entry._localUrl = URL.createObjectURL(blob);
  } catch {
    /* non-fatal — only used for optimistic display */
  }

  emit({ type: 'enqueued', entry });
  await emitStats(opts.classId);
  return entry;
}

// ----------------------------------------------------------------- sync ----

export async function syncQueue(classIdArg?: string): Promise<SyncResult> {
  const classId = classIdArg ?? activeClassId;
  if (!classId) return { uploaded: 0, failed: 0, skipped: true, reason: 'no class' };

  if (syncInProgress) {
    const elapsed = Date.now() - syncStartedAt;
    if (elapsed < SYNC_TIMEOUT_MS) {
      return { uploaded: 0, failed: 0, skipped: true, reason: 'already syncing' };
    }
    console.warn(`[potato/queue] sync lock stale after ${Math.round(elapsed / 1000)}s — resetting`);
    syncInProgress = false;
  }

  // navigator.onLine false is reliable (it means no interface at all).
  // navigator.onLine true is NOT reliable, so we simply try — a captive portal
  // or dead uplink shows up as a fetch failure and becomes a normal retry.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { uploaded: 0, failed: 0, skipped: true, reason: 'offline' };
  }

  syncInProgress = true;
  syncStartedAt = Date.now();
  emit({ type: 'sync_start' });

  try {
    await reclaimStaleUploads(classId);
    const due = await getDueEntries(classId);
    if (due.length === 0) {
      return { uploaded: 0, failed: 0, skipped: true, reason: 'nothing due' };
    }

    let uploaded = 0;
    let failed = 0;
    let authFailed = false;
    let next = 0;

    const worker = async (): Promise<void> => {
      while (next < due.length) {
        if (Date.now() - syncStartedAt > SYNC_TIMEOUT_MS) return;
        if (authFailed) return; // every other entry would fail the same way
        const entry = due[next++];
        if (!entry) return;

        emit({ type: 'uploading', entry });
        try {
          await uploadEntry(entry);
          uploaded++;
          emit({ type: 'uploaded', entry });
        } catch (err) {
          failed++;
          if (err instanceof Error && err.message === 'AUTH_EXPIRED') authFailed = true;
          const fresh = await getEntry(entry.id);
          emit(fresh?.status === 'rejected' ? { type: 'rejected', entry: fresh } : { type: 'failed', entry });
        }
        await emitStats(classId);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, due.length) }, () => worker()),
    );

    const result: SyncResult = { uploaded, failed, skipped: false, needsAuth: authFailed };
    emit({ type: 'sync_complete', result });

    // Housekeeping: forget what the server already has.
    sweepUploaded(UPLOADED_TTL_MS).catch((e) => console.error('[potato/queue] sweep failed:', e));
    return result;
  } finally {
    syncInProgress = false;
    await emitStats(classId);
  }
}

async function uploadEntry(entry: QueueEntry): Promise<void> {
  await updateEntry(entry.id, 'uploading', { lastAttemptAt: new Date().toISOString() });

  try {
    const blob = await getBlob(entry.id);
    if (!blob) {
      // The row outlived its bytes — nothing to send, ever.
      await updateEntry(entry.id, 'rejected', {
        errorMessage: 'The photo file is missing from this device.',
      });
      throw new Error('BLOB_MISSING');
    }

    const form = new FormData();
    form.append('file', blob, entry.filename);
    form.append('childIds', JSON.stringify(entry.childIds));
    // Both optional and both OMITTED when absent, so an entry queued before
    // events existed uploads exactly the request it would have uploaded then.
    if (entry.sceneId) form.append('sceneId', entry.sceneId);
    if (entry.isGroup) form.append('group', '1');
    // 🚨 The whole reason this queue is safe to have: the server files the
    // photo under the day it was TAKEN, not the day it happened to arrive.
    form.append('capturedAt', entry.capturedAt);
    // Stable per capture — lets the server recognise a retry it already stored.
    form.append('clientId', entry.id);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: form,
        credentials: 'same-origin',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401) {
      await bumpFailure(entry, 'You’ve been signed out. Sign in again and the photos will upload.');
      throw new Error('AUTH_EXPIRED');
    }

    if (!response.ok) {
      // Read the server's own sentence so the teacher sees "too big", not "400".
      let message = '';
      try {
        const body = (await response.json()) as { error?: string } | null;
        if (typeof body?.error === 'string') message = body.error;
      } catch {
        /* not JSON — fall back to the status */
      }

      if (isPermanentRejection(response.status)) {
        await updateEntry(entry.id, 'rejected', {
          attemptCount: entry.attemptCount + 1,
          lastAttemptAt: new Date().toISOString(),
          errorMessage: message || `The server refused this photo (${response.status}).`,
        });
        throw new Error('REJECTED');
      }

      await bumpFailure(entry, message || `The server had a problem (${response.status}).`);
      throw new Error(`HTTP_${response.status}`);
    }

    // 🚨 Blob first, status second. If we crash between the two, the entry is
    // left 'uploading' with no bytes and is later marked rejected — but the
    // photo IS on the server. The reverse order would leave an orphaned blob
    // and re-upload a duplicate.
    if (entry._localUrl) {
      try {
        URL.revokeObjectURL(entry._localUrl);
      } catch {
        /* non-fatal */
      }
    }
    await deleteBlob(entry.id);
    await updateEntry(entry.id, 'uploaded', { uploadedAt: new Date().toISOString() });
  } catch (err) {
    // Nothing may be left stuck in 'uploading'.
    const message = err instanceof Error ? err.message : 'Upload failed';
    if (message !== 'AUTH_EXPIRED' && message !== 'REJECTED' && message !== 'BLOB_MISSING') {
      const fresh = await getEntry(entry.id);
      if (fresh && fresh.status === 'uploading') {
        await bumpFailure(fresh, message === 'Failed to fetch' ? 'No connection.' : message);
      }
    }
    throw err;
  }
}

/** A transient failure: count it, back off, stay in the queue. Forever if need be. */
async function bumpFailure(entry: QueueEntry, message: string): Promise<void> {
  const attemptCount = Math.max(0, entry.attemptCount) + 1;
  await updateEntry(entry.id, 'failed', {
    attemptCount,
    lastAttemptAt: new Date().toISOString(),
    nextAttemptAt: new Date(Date.now() + backoffFor(attemptCount)).toISOString(),
    errorMessage: message,
  });
}

// ---------------------------------------------------------------- manual ----

/** "Try now" from the pending pill: make everything due and sync immediately. */
export async function retryNow(classId: string): Promise<SyncResult> {
  // 🚨 AUDIT FIX (v1.2, HIGH): this used to reset ANY 'uploading' row back to
  // 'pending' unconditionally, on the theory that 'uploading' here always
  // means "stale from a crash or a killed tab". It doesn't — a teacher can tap
  // "try now" while a real upload is still genuinely in flight (a large
  // backlog on slow classroom wifi easily takes longer than a few seconds per
  // photo), and flipping that row back to 'pending' mid-request opens the door
  // to a second pass sending the same clientId a second time — the "3 parallel
  // uploads of the same entry" race this queue must not allow. Only reclaim
  // rows that are ACTUALLY stale, via the same shared, time-gated check
  // `syncQueue` itself now runs on every automatic trigger.
  await reclaimStaleUploads(classId);

  const all = await getAllEntries();
  const now = new Date().toISOString();
  for (const entry of all) {
    if (entry.classId !== classId) continue;
    if (entry.status === 'failed' || entry.status === 'pending') {
      await updateEntry(entry.id, entry.status, { nextAttemptAt: now });
    }
  }
  return syncQueue(classId);
}

/** Give a rejected photo one more chance (e.g. after the bucket was fixed). */
export async function retryRejected(id: string): Promise<void> {
  const entry = await getEntry(id);
  if (!entry) return;
  await updateEntry(id, 'pending', {
    attemptCount: 0,
    errorMessage: undefined,
    nextAttemptAt: new Date().toISOString(),
  });
  syncQueue(entry.classId).catch((e) => console.error('[potato/queue] retry sync failed:', e));
}

/** The teacher gives up on a rejected photo. The only path that drops a photo. */
export async function discardRejected(id: string): Promise<void> {
  const entry = await getEntry(id);
  await deleteEntry(id);
  if (entry) await emitStats(entry.classId);
}

export async function queueStats(classId: string): Promise<QueueStats> {
  return getStats(classId);
}

export async function listRejected(classId: string): Promise<QueueEntry[]> {
  const all = await getAllEntries();
  return all
    .filter((e) => e.classId === classId && e.status === 'rejected')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
