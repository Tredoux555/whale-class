// lib/montree/photo-insight-store.ts
// Global background store for Smart Capture / Photo Insight processing
// Decoupled from React component lifecycle — requests survive navigation
// Components subscribe to updates via listeners

import { montreeApi } from '@/lib/montree/api';

// ============================================================
// TYPES
// ============================================================

interface CandidateWork {
  name: string;
  area: string;
  score: number;
}

export interface PhotoInsightResult {
  insight: string;
  work_name: string | null;
  area: string | null;
  mastery_evidence: string | null;
  auto_updated: boolean;
  needs_confirmation?: boolean;
  confidence?: number;
  match_score?: number;
  candidates?: CandidateWork[];
  scenario?: 'A' | 'B' | 'C' | 'D';
  in_classroom?: boolean;
  in_child_shelf?: boolean;
  classroom_work_id?: string | null;
}

export type InsightStatus = 'analyzing' | 'done' | 'error' | 'confirmed' | 'rejected';

export interface InsightEntry {
  mediaId: string;
  childId: string;
  status: InsightStatus;
  result: PhotoInsightResult | null;
  startTime: number;
}

type Listener = () => void;

// ============================================================
// STORE (module-level singleton — survives React re-renders + navigation)
// ============================================================

const entries = new Map<string, InsightEntry>();
const listeners = new Set<Listener>();

// Version counter — incremented on every mutation to produce new snapshot identity
// useSyncExternalStore compares snapshots with Object.is — same reference = no re-render
let version = 0;
let cachedSnapshot: { version: number; map: Map<string, InsightEntry> } = { version: -1, map: new Map() };

// Notify all subscribers (React components re-render via useSyncExternalStore)
function notify(): void {
  version++;
  for (const listener of listeners) {
    listener();
  }
}

// ============================================================
// PUBLIC API
// ============================================================

/** Subscribe to store changes. Returns unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Get current snapshot (for useSyncExternalStore) — returns new Map on each mutation */
export function getSnapshot(): Map<string, InsightEntry> {
  if (cachedSnapshot.version !== version) {
    cachedSnapshot = { version, map: new Map(entries) };
  }
  return cachedSnapshot.map;
}

/** Get a single entry by mediaId */
export function getEntry(mediaId: string): InsightEntry | undefined {
  return entries.get(mediaId);
}

/** Check if a mediaId is currently being analyzed */
export function isAnalyzing(mediaId: string): boolean {
  return entries.get(mediaId)?.status === 'analyzing';
}

/** Get all entries for a specific child (for showing results after navigation) */
export function getEntriesForChild(childId: string): InsightEntry[] {
  const result: InsightEntry[] = [];
  for (const entry of entries.values()) {
    if (entry.childId === childId) {
      result.push(entry);
    }
  }
  return result;
}

/**
 * Start a photo insight analysis in the background.
 * Returns immediately — the fetch runs detached from any component.
 * Results are stored in the global map and subscribers are notified.
 */
export function startAnalysis(
  mediaId: string,
  childId: string,
  locale: string,
): void {
  // Don't duplicate if already in progress or done
  const existing = entries.get(mediaId);
  if (existing && (existing.status === 'analyzing' || existing.status === 'done')) {
    return;
  }

  // Evict stale entries before adding new one (prevents unbounded memory growth)
  evictStale();

  // Set status to analyzing
  entries.set(mediaId, {
    mediaId,
    childId,
    status: 'analyzing',
    result: null,
    startTime: Date.now(),
  });
  notify();

  // Client-side timeout: 60s to prevent stuck "analyzing..." forever
  const timeoutId = setTimeout(() => {
    const current = entries.get(mediaId);
    if (current?.status === 'analyzing') {
      entries.set(mediaId, { ...current, status: 'error' });
      notify();
    }
  }, 60000);

  // Fire the fetch — NOT tied to any AbortController or component lifecycle
  montreeApi('/api/montree/guru/photo-insight', {
    method: 'POST',
    body: JSON.stringify({ child_id: childId, media_id: mediaId, locale }),
  })
    .then(async (res) => {
      clearTimeout(timeoutId);
      const data = await res.json();

      if (!data.success) {
        entries.set(mediaId, {
          mediaId,
          childId,
          status: 'error',
          result: null,
          startTime: entries.get(mediaId)?.startTime || Date.now(),
        });
        notify();
        return;
      }

      const result: PhotoInsightResult = {
        insight: data.insight,
        work_name: data.work_name || null,
        area: data.area || null,
        mastery_evidence: data.mastery_evidence || null,
        auto_updated: data.auto_updated || false,
        needs_confirmation: data.needs_confirmation || false,
        confidence: data.confidence,
        match_score: data.match_score ?? null,
        candidates: Array.isArray(data.candidates) ? data.candidates : [],
        scenario: data.scenario || 'D',
        in_classroom: data.in_classroom || false,
        in_child_shelf: data.in_child_shelf || false,
        classroom_work_id: data.classroom_work_id || null,
      };

      entries.set(mediaId, {
        mediaId,
        childId,
        status: 'done',
        result,
        startTime: entries.get(mediaId)?.startTime || Date.now(),
      });
      notify();
    })
    .catch(() => {
      clearTimeout(timeoutId);
      entries.set(mediaId, {
        mediaId,
        childId,
        status: 'error',
        result: null,
        startTime: entries.get(mediaId)?.startTime || Date.now(),
      });
      notify();
    });
}

/** Reset a specific entry (e.g., to retry after error) */
export function resetEntry(mediaId: string): void {
  entries.delete(mediaId);
  notify();
}

/** Mark an entry as confirmed by the teacher */
export function confirmEntry(mediaId: string): void {
  const entry = entries.get(mediaId);
  if (entry) {
    entries.set(mediaId, { ...entry, status: 'confirmed' });
    notify();
  }
}

/** Mark an entry as rejected by the teacher */
export function rejectEntry(mediaId: string): void {
  const entry = entries.get(mediaId);
  if (entry) {
    entries.set(mediaId, { ...entry, status: 'rejected' });
    notify();
  }
}

/** Clear all entries (e.g., on logout) */
export function clearAll(): void {
  entries.clear();
  notify();
}

/** Evict stale entries older than maxAge (default: 30 minutes) */
export function evictStale(maxAgeMs: number = 30 * 60 * 1000): void {
  const now = Date.now();
  let changed = false;
  for (const [key, entry] of entries) {
    if (now - entry.startTime > maxAgeMs) {
      entries.delete(key);
      changed = true;
    }
  }
  if (changed) notify();
}
