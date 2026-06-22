// lib/montree/debug/error-log.ts
// Tiny in-memory client-side error buffer for the on-screen iPad error monitor.
//
// Why: when testing Montree on a tablet there's no devtools console to see what
// broke. This captures (a) failed API calls (hooked from montreeApi) and (b)
// uncaught JS errors / promise rejections (captured by DebugErrorMonitor while
// the monitor is enabled), into a small ring buffer that the overlay renders.
//
// Recording is ALWAYS-ON and cheap (capped, no side effects, no network). The
// overlay only RENDERS when the user has enabled debug mode (localStorage
// 'montree.debug' === '1'), so normal teachers never see anything. Always-on
// recording means that when the user flips debug on mid-session, recent API
// failures are already in the buffer.

export type DebugErrorKind = 'api' | 'window' | 'promise';

export interface DebugError {
  id: string;
  ts: number; // epoch ms
  kind: DebugErrorKind;
  origin: string; // e.g. "GET /api/montree/children" or a script URL
  status?: number; // HTTP status for api errors
  message: string;
}

const MAX_ENTRIES = 100;
let buffer: DebugError[] = [];

type Listener = (errors: DebugError[]) => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) {
    try {
      l(buffer);
    } catch {
      /* a broken listener must never break recording */
    }
  }
}

export function recordDebugError(input: {
  kind: DebugErrorKind;
  origin: string;
  status?: number;
  message: string;
  ts?: number;
}): void {
  const entry: DebugError = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    ts: input.ts ?? Date.now(),
    kind: input.kind,
    origin: (input.origin || '').slice(0, 300),
    status: input.status,
    message: (input.message || '').slice(0, 1000),
  };
  // newest first, capped
  buffer = [entry, ...buffer].slice(0, MAX_ENTRIES);
  emit();
}

export function subscribeDebugErrors(listener: Listener): () => void {
  listeners.add(listener);
  listener(buffer); // prime with current state
  return () => {
    listeners.delete(listener);
  };
}

export function getDebugErrors(): DebugError[] {
  return buffer;
}

export function clearDebugErrors(): void {
  buffer = [];
  emit();
}

const DEBUG_KEY = 'montree.debug';

/** True when the user has switched the on-screen monitor on. */
export function isDebugEnabled(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(DEBUG_KEY) === '1';
  } catch {
    return false;
  }
}

export function setDebugEnabled(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(DEBUG_KEY, '1');
    else window.localStorage.removeItem(DEBUG_KEY);
  } catch {
    /* private mode / storage blocked — ignore */
  }
}
