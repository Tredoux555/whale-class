// lib/lens/offline/sync-manager.ts
// The capture queue's engine: save first, upload later, never lose a moment.
//
// Ported from lib/potato/offline/sync-manager.ts, keeping the hardening that
// implementation earned in production:
//   • atomic row+bytes write, so a crash orphans nothing
//   • content-hash dedup with a race-safe retry after the write
//   • delete the blob BEFORE marking uploaded (a crash then costs a local copy
//     of a photo that IS on the server — the safe direction to fail)
//   • a sync lock with a timeout that force-resets, so one wedged pass cannot
//     brick capture for the rest of the visit
//   • 401 halts the whole pass immediately rather than burning every entry
//   • every error path writes a terminal-or-retryable status; nothing is ever
//     left stuck in 'uploading'
//   • reclaimStaleUploads on every pass, so an upload killed with the tab heals
//     itself on the next app-open rather than waiting for a manual tap
//
// Changed for Lens, deliberately:
//   • Tenancy is the VISIT.
//   • An entry may have no blob; a text/voice/chip moment is sent as JSON and a
//     photo as multipart, through the SAME endpoint (see the route's header for
//     why there is one door).
//   • TRANSIENT failures retry FOREVER with capped exponential backoff. Only the
//     server saying "no, permanently" ends an entry's life — an observation in
//     somebody's classroom cannot be re-taken.
//
// Zero imports from lib/montree/* or lib/potato/*.

import type { QueueEntry, MomentPayload, QueueStats, SyncEvent, SyncResult } from './types';
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

const UPLOAD_TIMEOUT_MS = 90_000;

let syncInProgress = false;
let syncStartedAt = 0;
let activeVisitId: string | null = null;

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
      console.error('[lens/queue] listener threw:', e);
    }
  });
}

async function emitStats(visitId: string): Promise<void> {
  try {
    emit({ type: 'stats', stats: await getStats(visitId) });
  } catch (e) {
    console.error('[lens/queue] stats failed:', e);
  }
}

/** Which visit this device is currently capturing into. Set by the screen. */
export function setActiveVisit(visitId: string | null): void {
  activeVisitId = visitId;
}

export function getActiveVisit(): string | null {
  return activeVisitId;
}

export function isSyncing(): boolean {
  return syncInProgress;
}

// ------------------------------------------------------------------ ids ----

/**
 * A stable id per capture. It doubles as the server's idempotency key and, for
 * a photo, the storage object name — so a retry writes to the same path and the
 * route recognises the row it already inserted.
 *
 * Constrained to the server's CLIENT_ID_RE (alphanumerics and hyphens, 8–64
 * chars) because it becomes part of a storage path. crypto.randomUUID already
 * satisfies it; the fallback is shaped to match.
 */
function newCaptureId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const rand = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${rand()}-${rand()}-${rand()}`;
}

/**
 * 🚨 A BIG BLOB IS NOT HASHED WHOLE.
 * `blob.arrayBuffer()` materialises the entire file in memory before the digest
 * runs. At 3MB that is invisible; on the four-year-old iPad in the corner of a
 * classroom a large image can crash the tab, and the crash lands between her
 * tapping the shutter and the bytes reaching IndexedDB — i.e. it eats the
 * capture, which is the one thing this queue exists to prevent.
 *
 * Dedup here is not a security property: it catches the same shutter pressed
 * twice. For anything over the threshold the fingerprint is the first and last
 * 2MB plus the exact byte length, which no two different photos in one session
 * will collide on.
 */
const WHOLE_HASH_MAX_BYTES = 8 * 1024 * 1024;
const HASH_SAMPLE_BYTES = 2 * 1024 * 1024;

async function contentHashOf(blob: Blob): Promise<string> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) throw new Error('no subtle crypto');
    const payload =
      blob.size <= WHOLE_HASH_MAX_BYTES
        ? await blob.arrayBuffer()
        : await new Blob([
            await blob.slice(0, HASH_SAMPLE_BYTES).arrayBuffer(),
            await blob.slice(Math.max(0, blob.size - HASH_SAMPLE_BYTES)).arrayBuffer(),
            new TextEncoder().encode(`|${blob.size}|${blob.type}`),
          ]).arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', payload);
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
 * 🚨 Reclaim rows abandoned mid-upload.
 *
 * If the browser or tab is killed while a request is in flight, its entry is
 * left at status 'uploading' forever — getDueEntries only ever selects
 * 'pending' | 'failed', so none of the automatic triggers would look at it
 * again and only a manual "try again" would reclaim it. That contradicts the
 * "retries forever, nothing silently dropped" promise this queue exists to keep.
 *
 * Called at the top of every syncQueue pass — i.e. every automatic trigger too
 * — so a genuinely abandoned upload heals itself on the next app-open or
 * reconnect. The time gate is what stops it flipping a LIVE request's row back
 * to 'pending' and sending the same id twice in parallel.
 */
async function reclaimStaleUploads(visitId: string): Promise<void> {
  const all = await getAllEntries();
  const now = Date.now();
  for (const entry of all) {
    if (entry.visitId !== visitId || entry.status !== 'uploading') continue;
    const lastAttemptMs = entry.lastAttemptAt ? new Date(entry.lastAttemptAt).getTime() : 0;
    if (now - lastAttemptMs > SYNC_TIMEOUT_MS) {
      await updateEntry(entry.id, 'pending', { nextAttemptAt: new Date(now).toISOString() });
    }
  }
}

function backoffFor(attemptCount: number): number {
  const delay = RETRY_BASE_DELAY_MS * Math.pow(2, Math.max(0, attemptCount - 1));
  // Jitter so twenty queued moments do not all retry on the same tick.
  const jittered = delay * (0.8 + Math.random() * 0.4);
  return Math.min(jittered, RETRY_MAX_DELAY_MS);
}

/**
 * Is this HTTP status a permanent refusal?
 *
 * 401 — the session expired; a fresh sign-in fixes it, the moment is fine.
 * 408 / 429 — explicitly temporary.
 * Everything else in 4xx means the server looked at this exact moment and said
 * no: too big, wrong type, not this visit's classroom. Retrying cannot change it.
 */
function isPermanentRejection(status: number): boolean {
  if (status === 401 || status === 408 || status === 429) return false;
  return status >= 400 && status < 500;
}

// -------------------------------------------------------------- enqueue ----

export interface EnqueueOptions {
  visitId: string;
  payload: MomentPayload;
  /** the instant the moment happened — NOT the moment of upload */
  capturedAt?: Date;
  /** photo only */
  blob?: Blob | null;
  width?: number;
  height?: number;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * Write the moment to the device, then return. No network is touched here.
 *
 * This is the founder's rule in one function: by the time she sees "Saved", the
 * moment is on the device and will survive a dead spot, a locked screen, a flat
 * battery and a browser restart.
 */
export async function enqueueMoment(opts: EnqueueOptions): Promise<QueueEntry> {
  if (await isQueueFull()) {
    await makeRoom();
    if (await isQueueFull()) {
      throw new Error(
        'This device is holding too many moments that haven’t uploaded yet. ' +
          'Find a signal and let them finish.',
      );
    }
  }

  const blob = opts.blob ?? null;
  const contentHash = blob ? await contentHashOf(blob) : undefined;

  // Same shutter pressed twice? Hand back the entry we already have. Only ever
  // applies to photos — two identical typed notes a minute apart are two real
  // observations, and collapsing them would lose one.
  if (contentHash) {
    const existing = await findByContentHash(contentHash, opts.visitId);
    if (existing && existing.status !== 'rejected') return existing;
  }

  const now = new Date();
  const id = newCaptureId();
  const mimeType = blob?.type || undefined;
  const ext = mimeType ? EXT_BY_MIME[mimeType.toLowerCase()] ?? 'jpg' : undefined;

  const entry: QueueEntry = {
    id,
    visitId: opts.visitId,
    payload: opts.payload,
    hasBlob: !!blob,
    contentHash,
    filename: ext ? `moment-${id}.${ext}` : undefined,
    sizeBytes: blob?.size ?? 0,
    mimeType,
    width: opts.width,
    height: opts.height,
    status: 'pending',
    attemptCount: 0,
    nextAttemptAt: now.toISOString(), // due immediately
    capturedAt: (opts.capturedAt ?? now).toISOString(),
    createdAt: now.toISOString(),
  };

  try {
    await saveEntryAndBlob(entry, blob);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'ConstraintError' && contentHash) {
      const winner = await findByContentHash(contentHash, opts.visitId);
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

  if (blob) {
    try {
      entry._localUrl = URL.createObjectURL(blob);
    } catch {
      /* non-fatal — only used for optimistic display */
    }
  }

  emit({ type: 'enqueued', entry });
  await emitStats(opts.visitId);

  // Try immediately. On a good connection the moment is on the server before
  // she has finished tapping the next chip, and the timeline stops showing a
  // pending pill she has to wonder about.
  syncQueue(opts.visitId).catch(() => {
    /* the triggers will pick it up */
  });

  return entry;
}

// ----------------------------------------------------------------- sync ----

export async function syncQueue(visitIdArg?: string): Promise<SyncResult> {
  const visitId = visitIdArg ?? activeVisitId;
  if (!visitId) return { uploaded: 0, failed: 0, skipped: true, reason: 'no visit' };

  if (syncInProgress) {
    const elapsed = Date.now() - syncStartedAt;
    if (elapsed < SYNC_TIMEOUT_MS) {
      return { uploaded: 0, failed: 0, skipped: true, reason: 'already syncing' };
    }
    console.warn(`[lens/queue] sync lock stale after ${Math.round(elapsed / 1000)}s — resetting`);
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
    await reclaimStaleUploads(visitId);
    const due = await getDueEntries(visitId);
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
          emit(
            fresh?.status === 'rejected'
              ? { type: 'rejected', entry: fresh }
              : { type: 'failed', entry },
          );
        }
        await emitStats(visitId);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, due.length) }, () => worker()),
    );

    const result: SyncResult = { uploaded, failed, skipped: false, needsAuth: authFailed };
    emit({ type: 'sync_complete', result });

    sweepUploaded(UPLOADED_TTL_MS).catch((e) => console.error('[lens/queue] sweep failed:', e));
    return result;
  } finally {
    syncInProgress = false;
    await emitStats(visitId);
  }
}

function uploadUrl(visitId: string): string {
  return `/api/lens/visits/${encodeURIComponent(visitId)}/moments`;
}

async function uploadEntry(entry: QueueEntry): Promise<void> {
  await updateEntry(entry.id, 'uploading', { lastAttemptAt: new Date().toISOString() });

  try {
    const p = entry.payload;
    let body: BodyInit;
    const headers: Record<string, string> = {};

    if (entry.hasBlob) {
      const blob = await getBlob(entry.id);
      if (!blob) {
        // The row outlived its bytes — nothing to send, ever.
        await updateEntry(entry.id, 'rejected', {
          errorMessage: 'The photo file is missing from this device.',
        });
        throw new Error('BLOB_MISSING');
      }
      const form = new FormData();
      form.append('file', blob, entry.filename || 'moment.jpg');
      form.append('kind', p.kind);
      form.append('ts', entry.capturedAt);
      form.append('clientId', entry.id);
      if (p.classroomId) form.append('classroomId', p.classroomId);
      if (p.caption) form.append('caption', p.caption);
      if (p.transcript) form.append('transcript', p.transcript);
      if (p.body) form.append('body', p.body);
      if (p.area) form.append('area', p.area);
      if (p.subject) form.append('subject', p.subject);
      if (p.staffId) form.append('staffId', p.staffId);
      if (p.childAlias) form.append('childAlias', p.childAlias);
      if (p.rating != null) form.append('rating', String(p.rating));
      body = form;
      // No Content-Type header — the browser must set the multipart boundary.
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ ...p, ts: entry.capturedAt, clientId: entry.id });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(uploadUrl(entry.visitId), {
        method: 'POST',
        body,
        headers,
        credentials: 'same-origin',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401) {
      await bumpFailure(entry, 'You’ve been signed out. Sign in again and these will upload.');
      throw new Error('AUTH_EXPIRED');
    }

    if (!response.ok) {
      // Read the server's own sentence so she sees "too big", not "413".
      let message = '';
      try {
        const payload = (await response.json()) as { error?: string } | null;
        if (typeof payload?.error === 'string') message = payload.error;
      } catch {
        /* not JSON — fall back to the status */
      }

      if (isPermanentRejection(response.status)) {
        await updateEntry(entry.id, 'rejected', {
          attemptCount: entry.attemptCount + 1,
          lastAttemptAt: new Date().toISOString(),
          errorMessage: message || `The server refused this moment (${response.status}).`,
        });
        throw new Error('REJECTED');
      }

      await bumpFailure(entry, message || `The server had a problem (${response.status}).`);
      throw new Error(`HTTP_${response.status}`);
    }

    let serverId: string | undefined;
    try {
      const payload = (await response.json()) as { moment?: { id?: string } } | null;
      if (typeof payload?.moment?.id === 'string') serverId = payload.moment.id;
    } catch {
      /* the row landed; not being able to read its id back is cosmetic */
    }

    // 🚨 Bytes first, status second. If we crash between the two, the entry is
    // left 'uploading' with no bytes and is later marked rejected — but the
    // moment IS on the server. The reverse order would leave an orphaned blob
    // and re-upload a duplicate.
    if (entry._localUrl) {
      try {
        URL.revokeObjectURL(entry._localUrl);
      } catch {
        /* non-fatal */
      }
    }
    if (entry.hasBlob) await deleteBlob(entry.id);
    await updateEntry(entry.id, 'uploaded', {
      uploadedAt: new Date().toISOString(),
      _serverId: serverId,
    });
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
export async function retryNow(visitId: string): Promise<SyncResult> {
  // Only reclaim rows that are ACTUALLY stale. Flipping a genuinely in-flight
  // row back to 'pending' opens the door to sending the same clientId twice in
  // parallel — the race the potato queue's v1.2 audit closed on this exact
  // function. The server would survive it (the unique index decides) but the
  // connection would not.
  await reclaimStaleUploads(visitId);

  const all = await getAllEntries();
  const now = new Date().toISOString();
  for (const entry of all) {
    if (entry.visitId !== visitId) continue;
    if (entry.status === 'failed' || entry.status === 'pending') {
      await updateEntry(entry.id, entry.status, { nextAttemptAt: now });
    }
  }
  return syncQueue(visitId);
}

/** Give a rejected moment one more chance (e.g. after the bucket was created). */
export async function retryRejected(id: string): Promise<void> {
  const entry = await getEntry(id);
  if (!entry) return;
  await updateEntry(id, 'pending', {
    attemptCount: 0,
    errorMessage: undefined,
    nextAttemptAt: new Date().toISOString(),
  });
  syncQueue(entry.visitId).catch((e) => console.error('[lens/queue] retry sync failed:', e));
}

/** She gives up on a rejected moment. The only path that drops one. */
export async function discardRejected(id: string): Promise<void> {
  const entry = await getEntry(id);
  await deleteEntry(id);
  if (entry) await emitStats(entry.visitId);
}

export async function queueStats(visitId: string): Promise<QueueStats> {
  return getStats(visitId);
}

export async function listRejected(visitId: string): Promise<QueueEntry[]> {
  const all = await getAllEntries();
  return all
    .filter((e) => e.visitId === visitId && e.status === 'rejected')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Everything not yet on the server, for the optimistic timeline. */
export async function listPending(visitId: string): Promise<QueueEntry[]> {
  const all = await getAllEntries();
  return all
    .filter(
      (e) =>
        e.visitId === visitId &&
        (e.status === 'pending' || e.status === 'failed' || e.status === 'uploading'),
    )
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}
