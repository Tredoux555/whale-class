// lib/montree/tracking/ledger.ts
//
// Rules 3 and 4, in code.
//
//   Rule 3 — EVERY CHANGE IS AN EVENT. The journal is the truth; the current
//            status of every child is a cache of it. rebuildCurrent() is that
//            cache, recomputed from scratch, and a test asserts it equals the
//            incrementally applied state.
//   Rule 4 — STATUS ONLY MOVES FORWARD ON ITS OWN. not_started → presented →
//            practicing → mastered. Backwards requires source 'correction'
//            AND a reason.
//
// Plus the same-day dedupe policy (acceptance scenario "Duplicate photo same
// morning"): two observations of the same child + same work on one calendar
// day produce ONE ladder move. The second is not an error — it is evidence,
// so the result says attachAsEvidence:true and the caller hangs the photo off
// the first event instead of advancing again.

import type { ProgressEvent, Status } from './types';

export const STATUS_RANK: Record<Status, number> = {
  not_started: 0,
  presented: 1,
  practicing: 2,
  mastered: 3,
};

export const DEFAULT_STATUS: Status = 'not_started';

/** child_id → work_key → status. */
export type CurrentMap = Map<string, Map<string, Status>>;

export interface LedgerState {
  current: CurrentMap;
  /** `${child_id}|${work_key}` → set of 'YYYY-MM-DD' on which the ladder already moved. */
  movedOn: Map<string, Set<string>>;
}

export type RejectReason =
  | 'no-key'
  | 'no-op'
  | 'backward-without-correction'
  | 'correction-without-reason'
  | 'duplicate-same-day'
  | 'unknown-status';

export interface ApplyResult {
  accepted: boolean;
  why?: RejectReason;
  /** True when the rejected row is still worth keeping as evidence on the existing event. */
  attachAsEvidence?: boolean;
  /** The state after the event. Identical (by value) to the input when accepted is false. */
  state: LedgerState;
}

export function emptyState(): LedgerState {
  return { current: new Map(), movedOn: new Map() };
}

/** 'YYYY-MM-DD' in UTC. One place, so dedupe and week bucketing agree. */
export function dayOf(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function pairKey(childId: string, workKey: string): string {
  return `${childId}|${workKey}`;
}

export function statusIn(state: LedgerState, childId: string, workKey: string): Status {
  return state.current.get(childId)?.get(workKey) ?? DEFAULT_STATUS;
}

/**
 * The same-day policy on its own, so a caller (photo intake) can ask before
 * it writes. Corrections are exempt: a teacher fixing a mistake an hour later
 * must always land.
 */
export function dedupeSameDay(
  state: LedgerState,
  event: ProgressEvent
): { accepted: true } | { accepted: false; why: 'duplicate-same-day'; attachAsEvidence: true } {
  if (event.source === 'correction') return { accepted: true };
  if (!event.work_key) return { accepted: true };
  const days = state.movedOn.get(pairKey(event.child_id, event.work_key));
  if (days && days.has(dayOf(event.created_at))) {
    return { accepted: false, why: 'duplicate-same-day', attachAsEvidence: true };
  }
  return { accepted: true };
}

function reject(state: LedgerState, why: RejectReason, attachAsEvidence?: boolean): ApplyResult {
  return attachAsEvidence
    ? { accepted: false, why, attachAsEvidence: true, state }
    : { accepted: false, why, state };
}

/**
 * Apply one journalled row to the derived state. Never mutates the input: the
 * changed child's map is copied, everything else is shared.
 */
export function applyEvent(state: LedgerState, event: ProgressEvent): ApplyResult {
  // Rule 1: nothing writes progress without a key.
  if (!event.work_key) return reject(state, 'no-key');
  if (!(event.new_status in STATUS_RANK)) return reject(state, 'unknown-status');

  const key = event.work_key;
  const old = statusIn(state, event.child_id, key);

  if (event.source === 'correction') {
    // Rule 4: a downgrade is a deliberate, reasoned teacher act.
    if (!event.reason || !event.reason.trim()) {
      return reject(state, 'correction-without-reason');
    }
    if (event.new_status === old) return reject(state, 'no-op', true);
    return commit(state, event, key);
  }

  // Scenario "Duplicate photo": one calendar day, one ladder move per work.
  const dupe = dedupeSameDay(state, event);
  if (!dupe.accepted) return reject(state, dupe.why, true);

  const delta = STATUS_RANK[event.new_status] - STATUS_RANK[old];
  // A repeat observation: real activity, no ladder move.
  if (delta === 0) return reject(state, 'no-op', true);
  if (delta < 0) return reject(state, 'backward-without-correction', true);

  return commit(state, event, key);
}

function commit(state: LedgerState, event: ProgressEvent, key: string): ApplyResult {
  const current: CurrentMap = new Map(state.current);
  const childMap = new Map(current.get(event.child_id) ?? []);
  childMap.set(key, event.new_status);
  current.set(event.child_id, childMap);

  const movedOn = new Map(state.movedOn);
  const pk = pairKey(event.child_id, key);
  const days = new Set(movedOn.get(pk) ?? []);
  days.add(dayOf(event.created_at));
  movedOn.set(pk, days);

  return { accepted: true, state: { current, movedOn } };
}

/** Chronological order, stable for equal timestamps. */
export function sortEvents(events: readonly ProgressEvent[]): ProgressEvent[] {
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => {
      const d = Date.parse(a.e.created_at) - Date.parse(b.e.created_at);
      return d !== 0 ? d : a.i - b.i;
    })
    .map((x) => x.e);
}

export interface ReplayRow {
  event: ProgressEvent;
  result: ApplyResult;
}

/** Fold the journal, keeping the per-event verdict. Everything derived reads this. */
export function replay(events: readonly ProgressEvent[]): { state: LedgerState; rows: ReplayRow[] } {
  let state = emptyState();
  const rows: ReplayRow[] = [];
  for (const event of sortEvents(events)) {
    const result = applyEvent(state, event);
    state = result.state;
    rows.push({ event, result });
  }
  return { state, rows };
}

/** Rule 3: the current-status table, rebuilt from the journal alone. */
export function rebuildCurrent(events: readonly ProgressEvent[]): CurrentMap {
  return replay(events).state.current;
}

export function currentStatus(
  events: readonly ProgressEvent[],
  childId: string,
  workKey: string
): Status {
  return rebuildCurrent(events).get(childId)?.get(workKey) ?? DEFAULT_STATUS;
}
