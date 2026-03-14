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

export type InsightStatus = 'analyzing' | 'done' | 'error' | 'confirmed' | 'rejected' | 'retrying';

export type InsightErrorType = 'timeout' | 'rate_limit' | 'server_error' | 'network' | 'auth_error' | 'unknown';

export interface InsightEntry {
  mediaId: string;
  childId: string;
  status: InsightStatus;
  result: PhotoInsightResult | null;
  startTime: number;
  errorType?: InsightErrorType;
  retryCount?: number;
}

type Listener = () => void;

// Composite key for store entries: mediaId:childId
// Group photos have the same mediaId for multiple children — keying by mediaId alone
// would cause Child B to see Child A's analysis result. The server cache already keys
// by (child_id, media_id), so the client-side store must match.
function makeKey(mediaId: string, childId: string): string {
  return `${mediaId}:${childId}`;
}

// ============================================================
// STORE (module-level singleton — survives React re-renders + navigation)
// ============================================================

const entries = new Map<string, InsightEntry>();
const listeners = new Set<Listener>();
// AbortControllers for in-flight fetches — keyed same as entries (mediaId:childId)
// Prevents zombie fetches from resurrecting deleted entries after resetEntry/clearAll
const abortControllers = new Map<string, AbortController>();

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

/** Get a single entry by mediaId + childId (composite key for group photo correctness) */
export function getEntry(mediaId: string, childId: string): InsightEntry | undefined {
  return entries.get(makeKey(mediaId, childId));
}

/** Check if a mediaId+childId is currently being analyzed */
export function isAnalyzing(mediaId: string, childId: string): boolean {
  return entries.get(makeKey(mediaId, childId))?.status === 'analyzing';
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

// Max auto-retries for transient errors (network, server 5xx)
// 2 retries = 3 total attempts — handles double-failures common on classroom WiFi
const MAX_AUTO_RETRIES = 2;
// Base delay for exponential backoff (ms) — jitter prevents thundering herd
const RETRY_BASE_DELAY_MS = 2000;
// Client timeout: slightly longer than server's 45s to allow server response
const CLIENT_TIMEOUT_MS = 50000;
// Re-analysis TTL: allow re-analysis of "done" entries after 10 minutes
const REANALYSIS_TTL_MS = 10 * 60 * 1000;

/** Exponential backoff with jitter: base * 2^attempt + random(0, base) */
function getRetryDelay(attempt: number): number {
  const exponential = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * RETRY_BASE_DELAY_MS;
  return Math.min(exponential + jitter, 15000); // Cap at 15s
}

/** Classify error type from fetch response or exception */
function classifyError(res?: Response, err?: unknown): InsightErrorType {
  if (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'timeout';
    // fetch() network failure is TypeError with specific messages
    if (err instanceof TypeError && (
      err.message.includes('fetch') ||
      err.message.includes('network') ||
      err.message.includes('Failed to fetch') ||
      err.message.includes('NetworkError') ||
      err.message.includes('Load failed')
    )) return 'network';
    if (err instanceof TypeError) return 'unknown'; // Non-network TypeError
    return 'unknown';
  }
  if (res) {
    if (res.status === 429) return 'rate_limit';
    if (res.status >= 500) return 'server_error';
    if (res.status === 408) return 'timeout';
    if (res.status === 403 || res.status === 401) return 'auth_error' as InsightErrorType;
  }
  return 'unknown';
}

/** Whether an error type is retryable (auth + rate limit are permanent failures) */
function isRetryable(errorType: InsightErrorType): boolean {
  return errorType === 'network' || errorType === 'server_error' || errorType === 'timeout';
}

/**
 * Start a photo insight analysis in the background.
 * Returns immediately — the fetch runs detached from any component.
 * Results are stored in the global map and subscribers are notified.
 * Automatically retries once on transient errors (network, server, timeout).
 */
export function startAnalysis(
  mediaId: string,
  childId: string,
  locale: string,
): void {
  const key = makeKey(mediaId, childId);

  // Don't duplicate if already in progress
  const existing = entries.get(key);
  if (existing && (existing.status === 'analyzing' || existing.status === 'retrying')) {
    return;
  }
  // Allow re-analysis of "done" entries after REANALYSIS_TTL_MS
  if (existing && existing.status === 'done') {
    if (Date.now() - existing.startTime < REANALYSIS_TTL_MS) {
      return; // Still fresh — don't re-analyze
    }
    // Stale — allow re-analysis
  }

  // Evict stale entries before adding new one (prevents unbounded memory growth)
  evictStale();

  // Internal: run the actual fetch with retry support
  runAnalysisFetch(mediaId, childId, locale, 0);
}

/** Internal fetch runner with retry count tracking */
function runAnalysisFetch(
  mediaId: string,
  childId: string,
  locale: string,
  retryCount: number,
): void {
  const key = makeKey(mediaId, childId);
  const isRetry = retryCount > 0;

  // Abort any previous in-flight fetch for this key (e.g., on retry)
  abortControllers.get(key)?.abort();

  // Create new AbortController for this fetch — tracked so resetEntry/clearAll can cancel it
  const controller = new AbortController();
  abortControllers.set(key, controller);

  entries.set(key, {
    mediaId,
    childId,
    status: isRetry ? 'retrying' : 'analyzing',
    result: null,
    startTime: isRetry ? (entries.get(key)?.startTime ?? Date.now()) : Date.now(),
    retryCount,
  });
  notify();

  // Client-side timeout: 50s (server is 45s — gives 5s buffer for network latency)
  // `timedOut` flag prevents fetch handler from overwriting timeout's error state
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    const current = entries.get(key);
    if (current?.status === 'analyzing' || current?.status === 'retrying') {
      timedOut = true;
      handleAnalysisError(mediaId, childId, locale, retryCount, 'timeout');
    }
  }, CLIENT_TIMEOUT_MS);

  // Fire the fetch with abort signal — resetEntry/clearAll can cancel via abortControllers map
  // Timeout: CLIENT_TIMEOUT_MS + 5s buffer so store's own timeout fires first for clean handling
  // (montreeApi default is 30s — too short for Sonnet vision which has a 45s server timeout)
  montreeApi('/api/montree/guru/photo-insight', {
    method: 'POST',
    body: JSON.stringify({ child_id: childId, media_id: mediaId, locale }),
    timeout: CLIENT_TIMEOUT_MS + 5000,
    signal: controller.signal,
  })
    .then(async (res) => {
      clearTimeout(timeoutId);
      abortControllers.delete(key);
      // If timeout already fired, don't overwrite its error state
      if (timedOut) return;
      // Guard: entry may have been deleted by resetEntry/clearAll while fetch was in-flight
      if (!entries.has(key)) return;

      // Guard: check res.ok before parsing JSON
      if (!res.ok) {
        const errorType = classifyError(res);
        // Try to parse error body for rate limit info
        try {
          const errData = await res.json();
          if (errData?.error === 'Rate limit exceeded') {
            handleAnalysisError(mediaId, childId, locale, retryCount, 'rate_limit');
            return;
          }
        } catch {
          // Body not JSON — that's fine, classify by status code
        }
        handleAnalysisError(mediaId, childId, locale, retryCount, errorType);
        return;
      }

      let data: Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response from a 200 — treat as server error
        handleAnalysisError(mediaId, childId, locale, retryCount, 'server_error');
        return;
      }

      if (!data.success) {
        handleAnalysisError(mediaId, childId, locale, retryCount, 'server_error');
        return;
      }

      const result: PhotoInsightResult = {
        insight: (typeof data.insight === 'string' ? data.insight : 'Photo analyzed'),
        work_name: (data.work_name as string) ?? null,
        area: (data.area as string) ?? null,
        mastery_evidence: (data.mastery_evidence as string) ?? null,
        auto_updated: (data.auto_updated as boolean) ?? false,
        needs_confirmation: (data.needs_confirmation as boolean) ?? false,
        confidence: data.confidence as number | undefined,
        match_score: (data.match_score as number) ?? null,
        candidates: Array.isArray(data.candidates) ? data.candidates as CandidateWork[] : [],
        scenario: (['A', 'B', 'C', 'D'].includes(data.scenario as string) ? data.scenario as 'A' | 'B' | 'C' | 'D' : 'D'),
        in_classroom: (data.in_classroom as boolean) ?? false,
        in_child_shelf: (data.in_child_shelf as boolean) ?? false,
        classroom_work_id: (data.classroom_work_id as string) ?? null,
      };

      // Final guard: entry may have been deleted while parsing response
      if (!entries.has(key)) return;

      entries.set(key, {
        mediaId,
        childId,
        status: 'done',
        result,
        startTime: entries.get(key)?.startTime ?? Date.now(),
        retryCount,
      });
      notify();
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      abortControllers.delete(key);
      // If timeout already fired and set error state, don't overwrite it
      if (timedOut) return;
      // If entry was deleted (resetEntry/clearAll), don't resurrect with error state
      if (!entries.has(key)) return;
      // If aborted by resetEntry/clearAll, silently exit (not a real error)
      if (err instanceof Error && err.name === 'AbortError') return;
      const errorType = classifyError(undefined, err);
      console.error(`[PhotoInsight] Fetch error (attempt ${retryCount + 1}):`, err);
      handleAnalysisError(mediaId, childId, locale, retryCount, errorType);
    });
}

/** Handle analysis error with auto-retry for transient failures */
function handleAnalysisError(
  mediaId: string,
  childId: string,
  locale: string,
  retryCount: number,
  errorType: InsightErrorType,
): void {
  const key = makeKey(mediaId, childId);

  // Guard: entry may have been deleted by resetEntry/clearAll — don't resurrect
  if (!entries.has(key)) return;

  // Auto-retry once for transient errors (not rate limits)
  if (retryCount < MAX_AUTO_RETRIES && isRetryable(errorType)) {
    const delay = getRetryDelay(retryCount);
    console.log(`[PhotoInsight] Retrying in ${delay}ms (attempt ${retryCount + 2}/${MAX_AUTO_RETRIES + 1}, error: ${errorType})`);
    entries.set(key, {
      mediaId,
      childId,
      status: 'retrying',
      result: null,
      startTime: entries.get(key)?.startTime ?? Date.now(),
      errorType,
      retryCount,
    });
    notify();
    setTimeout(() => {
      // Only retry if still in retrying state (user might have manually reset or clearAll called)
      const current = entries.get(key);
      if (current?.status === 'retrying') {
        runAnalysisFetch(mediaId, childId, locale, retryCount + 1);
      }
    }, delay);
    return;
  }

  // Final failure — set error state with type
  entries.set(key, {
    mediaId,
    childId,
    status: 'error',
    result: null,
    startTime: entries.get(key)?.startTime ?? Date.now(),
    errorType,
    retryCount,
  });
  notify();
}

/** Reset a specific entry (e.g., to retry after error) */
export function resetEntry(mediaId: string, childId: string): void {
  const key = makeKey(mediaId, childId);
  // Abort any in-flight fetch for this key — prevents zombie fetch from resurrecting entry
  abortControllers.get(key)?.abort();
  abortControllers.delete(key);
  entries.delete(key);
  notify();
}

/** Mark an entry as confirmed by the teacher */
export function confirmEntry(mediaId: string, childId: string): void {
  const key = makeKey(mediaId, childId);
  const entry = entries.get(key);
  if (entry) {
    entries.set(key, { ...entry, status: 'confirmed' });
    notify();
  }
}

/** Mark an entry as rejected by the teacher */
export function rejectEntry(mediaId: string, childId: string): void {
  const key = makeKey(mediaId, childId);
  const entry = entries.get(key);
  if (entry) {
    entries.set(key, { ...entry, status: 'rejected' });
    notify();
  }
}

/** Clear all entries (e.g., on logout) */
export function clearAll(): void {
  // Abort all in-flight fetches — prevents zombie fetches from resurrecting entries
  for (const controller of abortControllers.values()) {
    controller.abort();
  }
  abortControllers.clear();
  entries.clear();
  notify();
}

/** Max entries to keep in the store (prevents unbounded memory growth in long sessions) */
const MAX_ENTRIES = 50;

/** Evict stale entries older than maxAge (default: 30 minutes) AND enforce max entry cap */
export function evictStale(maxAgeMs: number = 30 * 60 * 1000): void {
  const now = Date.now();
  let changed = false;

  // 1. Time-based eviction — collect keys first to avoid mutating Map during iteration
  const keysToEvict: string[] = [];
  for (const [key, entry] of entries) {
    if (now - entry.startTime > maxAgeMs) {
      keysToEvict.push(key);
    }
  }
  for (const key of keysToEvict) {
    entries.delete(key);
    changed = true;
  }

  // 2. Size-based eviction: if still over cap, remove oldest entries first
  if (entries.size > MAX_ENTRIES) {
    const sorted = [...entries.entries()].sort((a, b) => a[1].startTime - b[1].startTime);
    const toRemove = sorted.slice(0, entries.size - MAX_ENTRIES);
    for (const [key] of toRemove) {
      entries.delete(key);
      changed = true;
    }
  }

  if (changed) notify();
}
