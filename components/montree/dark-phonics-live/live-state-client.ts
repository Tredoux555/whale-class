'use client';

/**
 * Dark Phonics Live — client-side transport for the class's shared live state.
 *
 * One row per appointment in `montree_class_live_state`, read/written through
 * `GET|PATCH /api/montree/appointments/[id]/live-state`. The teacher PATCHes on
 * every interaction; the parent GETs every 2s. No websockets, no new deps —
 * see the Phase 2 contract, product decision 2.
 *
 * RESPONSE SHAPE: the route (slice A) returns
 *   `{ state: { ...mutableFields, updatedAt, lessonNumber, lessonTotal } }`
 * i.e. `lessonNumber` is nested INSIDE `state`, computed and read-only. The
 * Phase 2 brief described it as a sibling of `state`, so `parseEnvelope()`
 * deliberately accepts BOTH placements and normalises — whichever the route
 * ends up shipping, the classroom keeps working.
 *
 * Everything here is `fetch` against a same-origin relative URL, so the
 * `montree-auth` / parent session cookie rides along automatically.
 */

import {
  DEFAULT_ACTIVITY_STATE,
  parseActivityState,
  parseActivityType,
  type ActivityType,
  type LiveActivityState,
} from '@/lib/montree/dark-phonics/live-activities';

export type ClassPhase = 'live' | 'ended';

export interface LiveClassState {
  activeSceneIndex: number;
  activeWordIndex: number;
  tracingStepActive: boolean;
  tracingCompleted: number;
  starsEarned: number;
  classPhase: ClassPhase;
  /** Writing Shelf tray on the stage; 'none' = normal lesson slides (migration 341). */
  activityType: ActivityType;
  /** The active tray's cursor. In a PATCH this is always the FULL object — the route replaces the jsonb column wholesale. */
  activityState: LiveActivityState;
  updatedAt: string | null;
}

/** Mirrors the column defaults in migrations 334 + 341 — what the route serves before any row exists. */
export const DEFAULT_LIVE_STATE: LiveClassState = {
  activeSceneIndex: 0,
  activeWordIndex: -1,
  tracingStepActive: false,
  tracingCompleted: 0,
  starsEarned: 0,
  classPhase: 'live',
  activityType: 'none',
  activityState: { ...DEFAULT_ACTIVITY_STATE },
  updatedAt: null,
};

/** The five mutable fields + classPhase; any subset is a legal PATCH body. */
export type LiveStatePatch = Partial<Omit<LiveClassState, 'updatedAt'>>;

export interface LiveStateEnvelope {
  state: LiveClassState;
  /** DISPLAY lesson number, 1..49. Computed server-side; never PATCHable. */
  lessonNumber: number;
  lessonTotal: number;
}

export type LiveStateResult =
  | { ok: true; data: LiveStateEnvelope }
  | { ok: false; status: number; error: string };

/* -------------------------------------------------------------------------- */
/* Parsing — tolerant, because a mid-class parse crash is unacceptable          */
/* -------------------------------------------------------------------------- */

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export function parseEnvelope(json: unknown): LiveStateEnvelope {
  const root = (json ?? {}) as Record<string, unknown>;
  const raw = (root.state ?? {}) as Record<string, unknown>;
  const state: LiveClassState = {
    activeSceneIndex: num(raw.activeSceneIndex, DEFAULT_LIVE_STATE.activeSceneIndex),
    activeWordIndex: num(raw.activeWordIndex, DEFAULT_LIVE_STATE.activeWordIndex),
    tracingStepActive: bool(raw.tracingStepActive, DEFAULT_LIVE_STATE.tracingStepActive),
    tracingCompleted: num(raw.tracingCompleted, DEFAULT_LIVE_STATE.tracingCompleted),
    starsEarned: num(raw.starsEarned, DEFAULT_LIVE_STATE.starsEarned),
    classPhase: raw.classPhase === 'ended' ? 'ended' : 'live',
    activityType: parseActivityType(raw.activityType),
    activityState: parseActivityState(raw.activityState),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };
  // lessonNumber may arrive nested (what the route actually does) or as a
  // sibling of `state` (what the brief specified). Accept either; 1 is the
  // safe floor — lesson 1 always resolves to a real scene set.
  const lessonNumber = Math.max(1, Math.round(num(raw.lessonNumber, num(root.lessonNumber, 1))));
  const lessonTotal = Math.max(1, Math.round(num(raw.lessonTotal, num(root.lessonTotal, 49))));
  return { state, lessonNumber, lessonTotal };
}

function url(appointmentId: string, roleHint?: 'teacher'): string {
  const base = `/api/montree/appointments/${encodeURIComponent(appointmentId)}/live-state`;
  return roleHint ? `${base}?as=${roleHint}` : base;
}

async function toResult(res: Response): Promise<LiveStateResult> {
  if (!res.ok) {
    // Prefer the route's human `message` (e.g. a rejected activity_type when a
    // migration has not been applied) over its machine `error` code — the
    // teacher's sync banner shows this text, and "the DB refused book-works"
    // is far more useful mid-class than "live_state_write_failed".
    const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    return { ok: false, status: res.status, error: j?.message || j?.error || `http_${res.status}` };
  }
  return { ok: true, data: parseEnvelope(await res.json().catch(() => ({}))) };
}

/**
 * One GET. `roleHint` is the `?as=` disambiguator the sibling call routes use —
 * pass 'teacher' on the dashboard surface, omit it on the parent surface so the
 * route resolves the parent session.
 */
export async function fetchLiveState(
  appointmentId: string,
  roleHint?: 'teacher'
): Promise<LiveStateResult> {
  try {
    const res = await fetch(url(appointmentId, roleHint), {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    return await toResult(res);
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'network_error' };
  }
}

/**
 * The STUDENT's write — the family device's only PATCH, ever.
 *
 * Used exclusively by the Lesson 1 book activity, where the CHILD drags the
 * pictures on the family's own screen. Sends no `?as=` hint, so the route
 * resolves the parent session the same way the 2s GET poll does, and carries
 * only the two student-owned cursor keys (`matched` / `drop`). The route
 * refuses anything wider with a 403 — see validateStudentPatch() there.
 *
 * Fire-and-forget by design: a failed write must never interrupt a child
 * mid-lesson. The next successful write (or the teacher's Reset) reconciles.
 */
export async function patchStudentActivity(
  appointmentId: string,
  patch: { matched?: string[]; drop?: string }
): Promise<LiveStateResult> {
  try {
    const res = await fetch(url(appointmentId), {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityState: patch }),
    });
    return await toResult(res);
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : 'network_error' };
  }
}

/**
 * A serialised PATCH pipe for ONE appointment.
 *
 * Every teacher interaction is optimistic locally and authoritative from the
 * response. Two rules make that safe under fast clicking:
 *   1. never more than one PATCH in flight (each call chains onto the last), and
 *   2. fields that pile up while a request is in flight are COALESCED into the
 *      next body — so mashing "next scene" sends the final index, not five.
 * Callers just `await patch({...})` and reconcile from the resolved envelope.
 */
export function createLiveStatePatcher(appointmentId: string) {
  let pending: LiveStatePatch = {};
  let chain: Promise<LiveStateResult> = Promise.resolve({
    ok: false,
    status: 0,
    error: 'noop',
  });

  const send = async (body: LiveStatePatch): Promise<LiveStateResult> => {
    try {
      const res = await fetch(url(appointmentId, 'teacher'), {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await toResult(res);
    } catch (err) {
      return { ok: false, status: 0, error: err instanceof Error ? err.message : 'network_error' };
    }
  };

  return function patchLiveState(patch: LiveStatePatch): Promise<LiveStateResult> {
    pending = { ...pending, ...patch };
    chain = chain
      .catch(() => ({ ok: false, status: 0, error: 'previous_failed' }) as LiveStateResult)
      .then(async (prev) => {
        if (Object.keys(pending).length === 0) return prev;
        const body = pending;
        pending = {};
        return await send(body);
      });
    return chain;
  };
}
