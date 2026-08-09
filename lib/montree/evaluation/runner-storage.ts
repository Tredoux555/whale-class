/**
 * Montree Milestones — autosave, resume, and the offline submit queue.
 *
 * Browser-only. Two jobs:
 *
 *  1. AUTOSAVE. The run state is written to `localStorage` under `mm.session.<localId>`
 *     after every response, so a refresh, a locked tablet or a flat battery does not cost
 *     a child their sitting. Every access is feature-detected in a try/catch: a kiosk
 *     profile or private mode that throws just means the check-in stays in memory and the
 *     teacher is TOLD so, rather than being quietly told nothing.
 *
 *  2. OFFLINE SUBMIT. Responses are queued locally and flushed to
 *     `POST /sessions/:id/items` opportunistically — on reconnect, and again at
 *     completion before `/complete` is called. That route is idempotent on
 *     (session_id, item_id), so a re-send after a dropped connection is safe and a
 *     duplicate flush cannot fork the record.
 */
import type { RunState } from './runner-engine';

const PREFIX = 'mm.session.';
const SNAPSHOT_VERSION = 2;

export interface RunSnapshot {
  v: number;
  savedAt: string;
  bankVersion: string;
  /**
   * The projection request that produced the bank this run was built against.
   * `assessmentLocale` is optional so a snapshot written before the language-of-assessment
   * gate existed still resumes — an absent value means English, which is what it was.
   */
  bankQuery: { ageBand: string; formCode: string; modules: string[]; assessmentLocale?: string };
  run: RunState;
  /** Item ids already accepted by the server. Anything else is still owed. */
  syncedItemIds: string[];
}

export interface StorageStatus {
  available: boolean;
  reason: string | null;
}

/** One probe at module use time — never assume localStorage exists or is writable. */
export function probeStorage(): StorageStatus {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { available: false, reason: 'no_local_storage' };
    }
    const key = `mm.probe.${Math.random()}`;
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return { available: true, reason: null };
  } catch {
    return { available: false, reason: 'local_storage_blocked' };
  }
}

export function saveSnapshot(snapshot: Omit<RunSnapshot, 'v' | 'savedAt'>): boolean {
  try {
    const payload: RunSnapshot = { ...snapshot, v: SNAPSHOT_VERSION, savedAt: new Date().toISOString() };
    window.localStorage.setItem(PREFIX + snapshot.run.localId, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadSnapshot(localId: string): RunSnapshot | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + localId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RunSnapshot;
    return parsed?.run ? parsed : null;
  } catch {
    return null;
  }
}

/** Unfinished check-ins for one child, newest first. */
export function listSnapshots(childId?: string): RunSnapshot[] {
  const out: RunSnapshot[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key) ?? '') as RunSnapshot;
        if (!parsed?.run) continue;
        if (childId && parsed.run.config.childId !== childId) continue;
        out.push(parsed);
      } catch { /* one corrupt entry must not hide the others */ }
    }
  } catch {
    return [];
  }
  return out.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''));
}

export function deleteSnapshot(localId: string): void {
  try { window.localStorage.removeItem(PREFIX + localId); } catch { /* nothing to do */ }
}

/* ───────────────────────────────────────────────────────────── submit queue */

export interface FlushResult {
  ok: boolean;
  sent: number;
  /** Set when the attempt failed; the caller keeps the queue and tries again later. */
  error: string | null;
  syncedItemIds: string[];
}

export function isOnline(): boolean {
  try {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  } catch {
    return true;
  }
}

/**
 * Send everything the server has not acknowledged yet.
 *
 * Deliberately re-sends rather than tracking deltas across a reload: the endpoint upserts
 * on (session_id, item_id), so the cost of a redundant row is nil and the cost of a lost
 * one is a child's morning.
 */
export async function flushResponses(params: {
  sessionId: string;
  responses: Array<Record<string, unknown>>;
  observations?: Array<Record<string, unknown>>;
  syncedItemIds?: string[];
}): Promise<FlushResult> {
  const already = new Set(params.syncedItemIds ?? []);
  const owed = params.responses.filter((r) => !already.has(String(r.itemId)));
  const observations = params.observations ?? [];
  if (!owed.length && !observations.length) {
    return { ok: true, sent: 0, error: null, syncedItemIds: params.syncedItemIds ?? [] };
  }
  if (!isOnline()) {
    return { ok: false, sent: 0, error: 'offline', syncedItemIds: params.syncedItemIds ?? [] };
  }

  try {
    const res = await fetch(`/api/montree/evaluation/sessions/${params.sessionId}/items`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ responses: owed, observations }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return {
        ok: false,
        sent: 0,
        error: `http_${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
        syncedItemIds: params.syncedItemIds ?? [],
      };
    }
    const merged = new Set(already);
    for (const r of owed) merged.add(String(r.itemId));
    return { ok: true, sent: owed.length, error: null, syncedItemIds: [...merged] };
  } catch (error) {
    return {
      ok: false,
      sent: 0,
      error: (error as Error).message || 'network_error',
      syncedItemIds: params.syncedItemIds ?? [],
    };
  }
}
