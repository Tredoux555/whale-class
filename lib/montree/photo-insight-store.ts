// lib/montree/photo-insight-store.ts
// Global background store for Smart Capture / Photo Insight processing
// v2 — Teacher OS simplified states (photo-first flow)
//
// Decoupled from React component lifecycle — requests survive navigation.
// Components subscribe to updates via listeners.
//
// v2 changes (Teacher OS):
// - InsightStatus simplified: 'analyzing' | 'identified' | 'no_match' | 'error'
//   (removed 'done', 'confirmed', 'rejected' — teacher status is separate)
// - Added teacher_status_choice: 'save' | 'presented' | 'practicing' | 'mastered' | null
// - Removed from result: auto_updated, needs_confirmation, scenario
// - Kept: candidates, in_classroom, in_child_shelf, classroom_work_id, custom_work_proposal

import { montreeApi } from '@/lib/montree/api';

// ============================================================
// TYPES
// ============================================================

interface CandidateWork {
  name: string;
  area: string;
  score: number;
}

export interface CustomWorkProposal {
  name: string;
  area: string;
  description: string;
  materials: string[];
  why_it_matters: string;
  proposal_confidence: number;
}

/** Teacher's chosen status for a photo (set via PhotoInsightPopup) */
export type TeacherStatusChoice = 'save' | 'presented' | 'practicing' | 'mastered';

export interface PhotoInsightResult {
  insight: string;
  work_name: string | null;
  area: string | null;
  mastery_evidence: string | null;
  confidence?: number;
  match_score?: number;
  candidates?: CandidateWork[];
  in_classroom?: boolean;
  in_child_shelf?: boolean;
  classroom_work_id?: string | null;
  custom_work_proposal?: CustomWorkProposal | null;

  // ---- Backward compatibility (Sprint 1 Teacher OS) ----
  // Sprint 1 returns these fields directly (NOT computed from store state).
  // API hardcodes these values per new photo-first workflow:
  // - auto_updated: always false (teacher must explicitly choose status via PhotoInsightPopup)
  // - needs_confirmation: always true (photo requires teacher action)
  // - scenario: returned by API for Scenario A/B/C/D detection downstream
  // Preserved for consumer compatibility until full Teacher OS rollout.

  /** @deprecated Sprint 1 compat — API always returns false (teacher OS: explicit status via popup) */
  auto_updated?: boolean;
  /** @deprecated Sprint 1 compat — API always returns true (teacher OS: explicit confirmation required) */
  needs_confirmation?: boolean;
  /** @deprecated Sprint 1 compat — API returns Scenario A/B/C/D for old logic, will be removed */
  scenario?: string;
}

/**
 * v2 InsightStatus — simplified for Teacher OS photo-first flow.
 *
 * 'analyzing'  — CLIP classification in progress (includes internal retries)
 * 'identified' — CLIP found a match (teacher hasn't picked status yet)
 * 'no_match'   — CLIP confidence too low to suggest (teacher must pick work manually)
 * 'error'      — Failed after all retries (network, timeout, server error)
 */
export type InsightStatus = 'analyzing' | 'identified' | 'no_match' | 'error';

export type InsightErrorType = 'timeout' | 'rate_limit' | 'server_error' | 'network' | 'auth_error' | 'unknown';

export interface InsightEntry {
  mediaId: string;
  childId: string;
  status: InsightStatus;
  result: PhotoInsightResult | null;
  startTime: number;
  errorType?: InsightErrorType;
  retryCount?: number;
  /** Teacher's chosen status — set when teacher taps a status button in the popup */
  teacherStatusChoice?: TeacherStatusChoice | null;
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
// INTERNAL STATUS (retry tracking hidden from public API)
// ============================================================

// Internal status includes 'retrying' for backoff logic, but the public
// InsightStatus exposes 'retrying' as 'analyzing' (teacher doesn't care about retries)
type InternalStatus = InsightStatus | 'retrying';

interface InternalEntry {
  mediaId: string;
  childId: string;
  internalStatus: InternalStatus;
  result: PhotoInsightResult | null;
  startTime: number;
  errorType?: InsightErrorType;
  retryCount?: number;
  teacherStatusChoice?: TeacherStatusChoice | null;
}

/** Map internal status to public InsightStatus */
function toPublicStatus(internalStatus: InternalStatus): InsightStatus {
  return internalStatus === 'retrying' ? 'analyzing' : internalStatus;
}

/** Convert internal entry to public InsightEntry */
function toPublicEntry(internal: InternalEntry): InsightEntry {
  return {
    mediaId: internal.mediaId,
    childId: internal.childId,
    status: toPublicStatus(internal.internalStatus),
    result: internal.result,
    startTime: internal.startTime,
    errorType: internal.errorType,
    retryCount: internal.retryCount,
    teacherStatusChoice: internal.teacherStatusChoice,
  };
}

// ============================================================
// STORE (module-level singleton — survives React re-renders + navigation)
// ============================================================

const entries = new Map<string, InternalEntry>();
const listeners = new Set<Listener>();
// AbortControllers for in-flight fetches — keyed same as entries (mediaId:childId)
// Prevents zombie fetches from resurrecting deleted entries after resetEntry/clearAll
const abortControllers = new Map<string, AbortController>();
// Retry timeout IDs — keyed same as entries (mediaId:childId)
// Prevents retry timeouts from firing after resetEntry/clearAll deletes an entry
const retryTimeouts = new Map<string, NodeJS.Timeout>();

// Version counter — incremented on every mutation to produce new snapshot identity
// useSyncExternalStore compares snapshots with Object.is — same reference = no re-render
let version = 0;
let cachedSnapshot: { version: number; map: Map<string, InsightEntry> } = { version: -1, map: new Map() };
// Cached pending entries per childId — avoids creating new arrays on every useSyncExternalStore call
const cachedPending: Map<string, { version: number; entries: InsightEntry[] }> = new Map();

// Notify all subscribers (React components re-render via useSyncExternalStore)
function notify(): void {
  version++;
  for (const listener of listeners) {
    listener();
  }
}

// ============================================================
// CONFIDENCE THRESHOLDS
// ============================================================

/** Below this, CLIP result is treated as no_match (show WorkWheelPicker directly) */
const NO_MATCH_CONFIDENCE_THRESHOLD = 0.40;

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
    const publicMap = new Map<string, InsightEntry>();
    for (const [key, internal] of entries) {
      publicMap.set(key, toPublicEntry(internal));
    }
    cachedSnapshot = { version, map: publicMap };
  }
  return cachedSnapshot.map;
}

/** Get a single entry by mediaId + childId (composite key for group photo correctness) */
export function getEntry(mediaId: string, childId: string): InsightEntry | undefined {
  const internal = entries.get(makeKey(mediaId, childId));
  return internal ? toPublicEntry(internal) : undefined;
}

/** Check if a mediaId+childId is currently being analyzed */
export function isAnalyzing(mediaId: string, childId: string): boolean {
  const internal = entries.get(makeKey(mediaId, childId));
  return internal?.internalStatus === 'analyzing' || internal?.internalStatus === 'retrying';
}

/** Get all entries for a specific child (for showing results after navigation) */
export function getEntriesForChild(childId: string): InsightEntry[] {
  const result: InsightEntry[] = [];
  for (const internal of entries.values()) {
    if (internal.childId === childId) {
      result.push(toPublicEntry(internal));
    }
  }
  return result;
}

/**
 * Get entries that need teacher attention (identified or no_match, no status choice yet).
 * Used by PhotoInsightPopup toast queue to show pending popups.
 * Returns a STABLE array reference (cached by version) for useSyncExternalStore compatibility.
 */
export function getPendingEntries(childId?: string): InsightEntry[] {
  const cacheKey = childId ?? '__all__';
  const cached = cachedPending.get(cacheKey);
  if (cached && cached.version === version) return cached.entries;

  const result: InsightEntry[] = [];
  for (const internal of entries.values()) {
    if (childId && internal.childId !== childId) continue;
    const publicStatus = toPublicStatus(internal.internalStatus);
    if ((publicStatus === 'identified' || publicStatus === 'no_match') && !internal.teacherStatusChoice) {
      result.push(toPublicEntry(internal));
    }
  }
  cachedPending.set(cacheKey, { version, entries: result });
  return result;
}

/**
 * Get original work data for corrections flow (work_name, area, confidence).
 * The corrections API needs the original CLIP suggestion to record what was wrong.
 */
export function getOriginalWorkData(mediaId: string, childId: string): {
  work_name: string | null;
  area: string | null;
  confidence: number | undefined;
} | null {
  const internal = entries.get(makeKey(mediaId, childId));
  if (!internal?.result) return null;
  return {
    work_name: internal.result.work_name,
    area: internal.result.area,
    confidence: internal.result.confidence,
  };
}

// Max auto-retries for transient errors (network, server 5xx)
// 2 retries = 3 total attempts — handles double-failures common on classroom WiFi
const MAX_AUTO_RETRIES = 2;
// Base delay for exponential backoff (ms) — jitter prevents thundering herd
const RETRY_BASE_DELAY_MS = 2000;
// Client timeout: slightly longer than server's 45s to allow server response
const CLIENT_TIMEOUT_MS = 50000;
// Re-analysis TTL: allow re-analysis of completed entries after 10 minutes
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
    if (res.status === 403 || res.status === 401) return 'auth_error';
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
 * Automatically retries on transient errors (network, server, timeout).
 */
export function startAnalysis(
  mediaId: string,
  childId: string,
  locale: string,
): void {
  const key = makeKey(mediaId, childId);

  // Don't duplicate if already in progress
  const existing = entries.get(key);
  if (existing && (existing.internalStatus === 'analyzing' || existing.internalStatus === 'retrying')) {
    return;
  }
  // Allow re-analysis of completed entries after REANALYSIS_TTL_MS
  if (existing && (existing.internalStatus === 'identified' || existing.internalStatus === 'no_match')) {
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
    internalStatus: isRetry ? 'retrying' : 'analyzing',
    result: null,
    startTime: isRetry ? (entries.get(key)?.startTime ?? Date.now()) : Date.now(),
    retryCount,
    teacherStatusChoice: null,
  });
  notify();

  // Client-side timeout: 50s (server is 45s — gives 5s buffer for network latency)
  // `timedOut` flag prevents fetch handler from overwriting timeout's error state
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    const current = entries.get(key);
    if (current?.internalStatus === 'analyzing' || current?.internalStatus === 'retrying') {
      timedOut = true;
      handleAnalysisError(mediaId, childId, locale, retryCount, 'timeout');
    }
  }, CLIENT_TIMEOUT_MS);

  // Fire the fetch with abort signal — resetEntry/clearAll can cancel via abortControllers map
  montreeApi('/api/montree/guru/photo-insight', {
    method: 'POST',
    body: JSON.stringify({ child_id: childId, media_id: mediaId, locale }),
    timeout: CLIENT_TIMEOUT_MS - 100, // Slightly less than store setTimeout so store's handler fires first
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
        confidence: typeof data.confidence === 'number' && !isNaN(data.confidence) ? data.confidence : undefined,
        match_score: typeof data.match_score === 'number' ? data.match_score : undefined,
        candidates: Array.isArray(data.candidates) ? data.candidates as CandidateWork[] : [],
        in_classroom: (data.in_classroom as boolean) ?? false,
        in_child_shelf: (data.in_child_shelf as boolean) ?? false,
        classroom_work_id: (data.classroom_work_id as string) ?? null,
        custom_work_proposal: data.custom_work_proposal ? data.custom_work_proposal as CustomWorkProposal : null,
      };

      // Final guard: entry may have been deleted while parsing response
      if (!entries.has(key)) return;

      // Determine status based on confidence threshold
      const confidence = result.confidence ?? 0;
      const hasWorkMatch = result.work_name !== null && result.work_name !== '';
      const isIdentified = hasWorkMatch && confidence >= NO_MATCH_CONFIDENCE_THRESHOLD;

      // Populate v1 backward-compat fields for existing consumers during migration
      result.auto_updated = false; // v2 never auto-updates — teacher always chooses
      result.needs_confirmation = isIdentified; // true when CLIP found a match
      // Map v2 status to v1 scenario for PhotoInsightButton compat:
      // Scenario B = identified standard work, Scenario A = no match / unknown
      // Scenario C = identified custom work (has proposal), Scenario D = cache hit (n/a here)
      if (isIdentified) {
        result.scenario = result.custom_work_proposal ? 'C' : 'B';
      } else {
        result.scenario = 'A';
      }

      entries.set(key, {
        mediaId,
        childId,
        internalStatus: isIdentified ? 'identified' : 'no_match',
        result,
        startTime: entries.get(key)?.startTime ?? Date.now(),
        retryCount,
        teacherStatusChoice: null,
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

  // Auto-retry for transient errors (not rate limits or auth errors)
  if (retryCount < MAX_AUTO_RETRIES && isRetryable(errorType)) {
    const delay = getRetryDelay(retryCount);
    console.log(`[PhotoInsight] Retrying in ${delay}ms (attempt ${retryCount + 2}/${MAX_AUTO_RETRIES + 1}, error: ${errorType})`);
    entries.set(key, {
      mediaId,
      childId,
      internalStatus: 'retrying',
      result: null,
      startTime: entries.get(key)?.startTime ?? Date.now(),
      errorType,
      retryCount,
      teacherStatusChoice: null,
    });
    notify();
    // Schedule retry timeout — store ID so resetEntry/clearAll can cancel it
    const retryTimeoutId = setTimeout(() => {
      // Only retry if still in retrying state (user might have manually reset or clearAll called)
      const current = entries.get(key);
      if (current?.internalStatus === 'retrying') {
        retryTimeouts.delete(key); // Timeout is firing, remove from tracking
        runAnalysisFetch(mediaId, childId, locale, retryCount + 1);
      }
    }, delay);
    retryTimeouts.set(key, retryTimeoutId);
    return;
  }

  // Final failure — set error state with type
  entries.set(key, {
    mediaId,
    childId,
    internalStatus: 'error',
    result: null,
    startTime: entries.get(key)?.startTime ?? Date.now(),
    errorType,
    retryCount,
    teacherStatusChoice: null,
  });
  notify();
}

// ============================================================
// STATUS CHOICE API (Teacher OS — teacher picks status via popup)
// ============================================================

/**
 * Record teacher's status choice for a photo.
 * Called when teacher taps Presented/Practicing/Mastered/Save in the popup.
 * Does NOT update the server — the caller (popup component) handles that.
 */
export function setTeacherStatusChoice(mediaId: string, childId: string, choice: TeacherStatusChoice): void {
  const key = makeKey(mediaId, childId);
  const entry = entries.get(key);
  if (entry) {
    entries.set(key, { ...entry, teacherStatusChoice: choice });
    notify();
  }
}

/**
 * Update an entry's result after teacher correction (e.g., WorkWheelPicker fix).
 * Sets the corrected work_name and area, and marks status as identified.
 */
export function updateEntryAfterCorrection(
  mediaId: string,
  childId: string,
  correctedWorkName: string,
  correctedArea: string,
): void {
  const key = makeKey(mediaId, childId);
  const entry = entries.get(key);
  if (entry) {
    // Teacher correction: always identified with full confidence, bypass NO_MATCH_CONFIDENCE_THRESHOLD
    // (teacher explicitly picked the work — their authority overrides CLIP confidence)
    const correctedResult: PhotoInsightResult = entry.result
      ? { ...entry.result, work_name: correctedWorkName, area: correctedArea, needs_confirmation: true, auto_updated: false, scenario: 'B' }
      : {
          insight: 'Corrected by teacher',
          work_name: correctedWorkName,
          area: correctedArea,
          mastery_evidence: null,
          confidence: 1.0, // Teacher correction = full confidence
          custom_work_proposal: null,
          needs_confirmation: true,
          auto_updated: false,
          scenario: 'B',
        };
    entries.set(key, {
      ...entry,
      internalStatus: 'identified',
      errorType: undefined, // Clear any previous error state
      result: correctedResult,
      teacherStatusChoice: null, // Reset choice — teacher needs to pick status for corrected work
    });
    notify();
  }
}

/** Reset a specific entry (e.g., to retry after error) */
export function resetEntry(mediaId: string, childId: string): void {
  const key = makeKey(mediaId, childId);
  // Abort any in-flight fetch for this key — prevents zombie fetch from resurrecting entry
  abortControllers.get(key)?.abort();
  abortControllers.delete(key);
  // Clear any pending retry timeout — prevents retry from firing after entry is deleted
  const retryTimeout = retryTimeouts.get(key);
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeouts.delete(key);
  }
  entries.delete(key);
  notify();
}

/** Clear all entries (e.g., on logout) */
export function clearAll(): void {
  // Abort all in-flight fetches — prevents zombie fetches from resurrecting entries
  for (const controller of abortControllers.values()) {
    controller.abort();
  }
  abortControllers.clear();
  // Clear all pending retry timeouts — prevents orphaned timeouts from firing after logout
  for (const retryTimeout of retryTimeouts.values()) {
    clearTimeout(retryTimeout);
  }
  retryTimeouts.clear();
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
    // Abort any in-flight fetch for this key to prevent zombie resurrection
    abortControllers.get(key)?.abort();
    abortControllers.delete(key);
    const retryTimeout = retryTimeouts.get(key);
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeouts.delete(key);
    }
    entries.delete(key);
    changed = true;
  }

  // 2. Size-based eviction: if still over cap, remove oldest entries first
  if (entries.size > MAX_ENTRIES) {
    const sorted = [...entries.entries()].sort((a, b) => a[1].startTime - b[1].startTime);
    const toRemove = sorted.slice(0, entries.size - MAX_ENTRIES);
    for (const [key] of toRemove) {
      // Abort any in-flight fetch for this key to prevent zombie resurrection
      abortControllers.get(key)?.abort();
      abortControllers.delete(key);
      const retryTimeout = retryTimeouts.get(key);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeouts.delete(key);
      }
      entries.delete(key);
      changed = true;
    }
  }

  if (changed) notify();
}

// ============================================================
// PROPOSAL DISMISS TRACKING (localStorage — survives navigation)
// ============================================================

const DISMISS_KEY = 'montree_dismissed_proposals';
const MAX_DISMISSALS = 100;

/** Dismiss a custom work proposal so it doesn't reappear */
export function dismissProposal(mediaId: string, childId: string): void {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    const dismissed: string[] = raw ? JSON.parse(raw) : [];
    const key = `${mediaId}:${childId}`;
    if (!dismissed.includes(key)) {
      dismissed.push(key);
      // Cap at MAX_DISMISSALS to prevent unbounded growth — remove oldest first
      while (dismissed.length > MAX_DISMISSALS) {
        dismissed.shift();
      }
      localStorage.setItem(DISMISS_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // localStorage unavailable (private browsing, etc.) — dismiss won't persist
  }
}

/** Check if a proposal has been dismissed */
export function isProposalDismissed(mediaId: string, childId: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissed: string[] = JSON.parse(raw);
    return dismissed.includes(`${mediaId}:${childId}`);
  } catch {
    return false;
  }
}

// ============================================================
// BACKWARD COMPATIBILITY (v1 → v2 adapter)
// ============================================================
// These deprecated functions allow existing consumers (PhotoInsightButton,
// photo-audit page, gallery) to continue working during the migration.
// Remove after Sprint 3 when all consumers are updated.

/** @deprecated Use setTeacherStatusChoice instead */
export function confirmEntry(mediaId: string, childId: string): void {
  setTeacherStatusChoice(mediaId, childId, 'save');
}

/** @deprecated Use resetEntry instead */
export function rejectEntry(mediaId: string, childId: string): void {
  resetEntry(mediaId, childId);
}
