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

// ── SCHOOL DAYS, NOT UTC DAYS (audit 08-verify-tracking §5) ────────────────
//
// "One calendar day" is the school's calendar day, not Greenwich's. Before this,
// dayOf() was toISOString().slice(0,10) — so a Beijing 07:30 photo and a Beijing
// 08:30 photo of the same work landed on two different "days" and BOTH advanced
// the ladder, and for any school WEST of UTC the split lands mid-afternoon, in
// the middle of the school day. Every day/week boundary in the engine now takes
// an IANA timezone.
//
// The default stays 'UTC' so a caller that has not been threaded yet behaves
// exactly as it did. The real value is resolved once, from the school row, in
// persistence.loadLedger() and carried on Ledger.timezone.
//
// The DB guard index (migration 347/348) is a COARSE UTC-day guard and stays
// that way — an index expression cannot depend on a per-row school. It is a
// concurrency backstop; THIS file's school-day dedupe is authoritative.

export const UTC_TZ = 'UTC';

/**
 * The stand-in used when a Ledger has no timezone and no caller supplied one.
 * The only production school today is in Beijing; persistence.loadLedger()
 * overrides this from montree_schools.timezone whenever it can read it.
 */
export const DEFAULT_SCHOOL_TZ = 'Asia/Shanghai';

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/** iso → 'YYYY-MM-DD', per timezone. See dayOf(). */
const dayCache = new Map<string, Map<string, string>>();
const DAY_CACHE_MAX = 100_000;

function dayFormatter(tz: string): Intl.DateTimeFormat | null {
  const cached = dayFormatters.get(tz);
  if (cached !== undefined) return cached;
  let fmt: Intl.DateTimeFormat | null = null;
  try {
    // 'en-CA' formats as YYYY-MM-DD, which is exactly the shape every day key
    // in this engine uses.
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    fmt = null; // an unknown zone falls back to UTC rather than throwing
  }
  dayFormatters.set(tz, fmt as Intl.DateTimeFormat);
  return fmt;
}

/** The timezone a Ledger's day/week boundaries are read in. */
export function tzOf(ledger: { timezone?: string | null } | null | undefined): string {
  return (ledger?.timezone || UTC_TZ).trim() || UTC_TZ;
}

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

/**
 * 'YYYY-MM-DD' in the school's timezone. One place, so dedupe and week
 * bucketing agree. `tz` defaults to UTC — the behaviour every caller had
 * before the timezone fix — and Ledger-driven callers pass ledger.timezone.
 */
export function dayOf(iso: string, tz: string = UTC_TZ): string {
  if (!tz || tz === UTC_TZ) {
    const utc = new Date(iso);
    return Number.isNaN(utc.getTime()) ? String(iso).slice(0, 10) : utc.toISOString().slice(0, 10);
  }
  // Intl.format costs ~a microsecond, and a class-route render asks this question
  // several hundred thousand times over a few thousand distinct timestamps. The
  // answer is a pure function of (iso, tz), so it is memoised per zone; the cache
  // is dropped wholesale rather than evicted one by one when it gets big.
  let byIso = dayCache.get(tz);
  if (!byIso) {
    byIso = new Map<string, string>();
    dayCache.set(tz, byIso);
  }
  const hit = byIso.get(iso);
  if (hit !== undefined) return hit;

  const at = new Date(iso);
  const fmt = dayFormatter(tz);
  const day = Number.isNaN(at.getTime())
    ? String(iso).slice(0, 10)
    : fmt
      ? fmt.format(at)
      : at.toISOString().slice(0, 10);
  if (byIso.size >= DAY_CACHE_MAX) byIso.clear();
  byIso.set(iso, day);
  return day;
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
  event: ProgressEvent,
  tz: string = UTC_TZ
): { accepted: true } | { accepted: false; why: 'duplicate-same-day'; attachAsEvidence: true } {
  if (event.source === 'correction') return { accepted: true };
  if (!event.work_key) return { accepted: true };
  const days = state.movedOn.get(pairKey(event.child_id, event.work_key));
  if (days && days.has(dayOf(event.created_at, tz))) {
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
export function applyEvent(
  state: LedgerState,
  event: ProgressEvent,
  tz: string = UTC_TZ
): ApplyResult {
  // Rule 1: nothing writes progress without a key.
  if (!event.work_key) return reject(state, 'no-key');
  if (!(event.new_status in STATUS_RANK)) return reject(state, 'unknown-status');

  const key = event.work_key;
  const old = statusIn(state, event.child_id, key);

  // An EVIDENCE ROW — the row says so itself: old_status = new_status. It records
  // that something was seen (a duplicate observation, a legacy spelling retired by
  // migration 349 §2), never that the ladder moved, and it must not be able to
  // decide a status even when the replayed state has since moved elsewhere. Before
  // the correction branch, because a correction is exactly where it would otherwise
  // land: source 'correction' with a reason bypasses the backward check, so a
  // migration-written merge row would have DOWNGRADED a work it was only
  // documenting. montree_rebuild_child_progress() drops the same rows with
  // `old_status IS DISTINCT FROM new_status`.
  if (event.old_status !== null && event.old_status === event.new_status) {
    return reject(state, 'no-op', true);
  }

  if (event.source === 'correction') {
    // Rule 4: a downgrade is a deliberate, reasoned teacher act.
    if (!event.reason || !event.reason.trim()) {
      return reject(state, 'correction-without-reason');
    }
    if (event.new_status === old) return reject(state, 'no-op', true);
    return commit(state, event, key, tz);
  }

  // Scenario "Duplicate photo": one calendar day, one ladder move per work.
  const dupe = dedupeSameDay(state, event, tz);
  if (!dupe.accepted) return reject(state, dupe.why, true);

  const delta = STATUS_RANK[event.new_status] - STATUS_RANK[old];
  // A repeat observation: real activity, no ladder move.
  if (delta === 0) return reject(state, 'no-op', true);
  if (delta < 0) return reject(state, 'backward-without-correction', true);

  return commit(state, event, key, tz);
}

function commit(state: LedgerState, event: ProgressEvent, key: string, tz: string): ApplyResult {
  const current: CurrentMap = new Map(state.current);
  const childMap = new Map(current.get(event.child_id) ?? []);
  childMap.set(key, event.new_status);
  current.set(event.child_id, childMap);

  const movedOn = new Map(state.movedOn);
  const pk = pairKey(event.child_id, key);
  const days = new Set(movedOn.get(pk) ?? []);
  days.add(dayOf(event.created_at, tz));
  movedOn.set(pk, days);

  return { accepted: true, state: { current, movedOn } };
}

/**
 * commit(), in place. Copy-on-write costs O(children + pairs) PER EVENT — the
 * movedOn map alone reaches a few thousand entries in a term, so folding a
 * classroom's journal was quadratic and dominated every derived read. Only
 * computeReplay() uses this, and only on a state it created and owns.
 */
function commitInto(state: LedgerState, event: ProgressEvent, key: string, tz: string): void {
  let childMap = state.current.get(event.child_id);
  if (!childMap) {
    childMap = new Map<string, Status>();
    state.current.set(event.child_id, childMap);
  }
  childMap.set(key, event.new_status);

  const pk = pairKey(event.child_id, key);
  let days = state.movedOn.get(pk);
  if (!days) {
    days = new Set<string>();
    state.movedOn.set(pk, days);
  }
  days.add(dayOf(event.created_at, tz));
}

/**
 * applyEvent() for the fold: the SAME decisions, applied into `state` instead of
 * into a copy of it. The verdict is what the caller reads; `state` on the result
 * is the fold's own evolving object, NOT a snapshot of the moment.
 */
function applyEventInto(state: LedgerState, event: ProgressEvent, tz: string): ApplyResult {
  if (!event.work_key) return reject(state, 'no-key');
  if (!(event.new_status in STATUS_RANK)) return reject(state, 'unknown-status');

  const key = event.work_key;
  const old = statusIn(state, event.child_id, key);

  // Evidence row — see applyEvent().
  if (event.old_status !== null && event.old_status === event.new_status) {
    return reject(state, 'no-op', true);
  }

  if (event.source === 'correction') {
    if (!event.reason || !event.reason.trim()) return reject(state, 'correction-without-reason');
    if (event.new_status === old) return reject(state, 'no-op', true);
    commitInto(state, event, key, tz);
    return { accepted: true, state };
  }

  const dupe = dedupeSameDay(state, event, tz);
  if (!dupe.accepted) return reject(state, dupe.why, true);

  const delta = STATUS_RANK[event.new_status] - STATUS_RANK[old];
  if (delta === 0) return reject(state, 'no-op', true);
  if (delta < 0) return reject(state, 'backward-without-correction', true);

  commitInto(state, event, key, tz);
  return { accepted: true, state };
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
  /**
   * The engine's verdict on this row. `result.state` is the FOLD's state object,
   * shared by every row — read `accepted` / `why` / `attachAsEvidence` here and
   * take the final state from replay()'s own `state`.
   */
  result: ApplyResult;
}

export interface ReplayResult {
  /**
   * READ-ONLY. Memoised and shared between every caller with the same events array
   * and timezone — never mutate it. Use rebuildCurrent(), which hands back a copy.
   */
  state: LedgerState;
  rows: ReplayRow[];
}

// ── THE REPLAY CACHE (audit 08-verify-tracking §4/§4b) ─────────────────────
//
// A class-route render replayed the WHOLE classroom journal ~90 times: flags()
// is 1 + 3N replays, englishSummary and planLanguageCell add 3 and 2 more per
// child. Measured on 22 children / 30 weeks / 3,300 events: 29,045 ms.
//
// Two caches, because there are two shapes of call:
//   replay(events)              — the same array object, over and over. Keyed on
//                                 ARRAY IDENTITY (WeakMap) + timezone.
//   replayBefore(events, day)   — summary.ts and derive.ts used to build a FRESH
//                                 filtered array per call, so an identity memo
//                                 always missed. The cutoff day is the only thing
//                                 that varies, so it is the key.
//
// Both are pure-function memos: the same array and the same timezone can only
// produce the same fold. The one rule a caller must respect is the one the
// engine already relies on — Ledger.events is treated as immutable. A caller
// that mutates an events array in place must not expect a recomputation.
const replayCache = new WeakMap<readonly ProgressEvent[], Map<string, ReplayResult>>();
const replayBeforeCache = new WeakMap<readonly ProgressEvent[], Map<string, ReplayResult>>();

function computeReplay(events: readonly ProgressEvent[], tz: string): ReplayResult {
  // ONE state object, folded in place — see applyEventInto(). Nothing outside this
  // file reads ReplayRow.result.state, and this file only ever reads the last one.
  const state = emptyState();
  const rows: ReplayRow[] = [];
  for (const event of sortEvents(events)) {
    rows.push({ event, result: applyEventInto(state, event, tz) });
  }
  return { state, rows };
}

/** Fold the journal, keeping the per-event verdict. Everything derived reads this. */
export function replay(events: readonly ProgressEvent[], tz: string = UTC_TZ): ReplayResult {
  let byTz = replayCache.get(events);
  if (!byTz) {
    byTz = new Map<string, ReplayResult>();
    replayCache.set(events, byTz);
  }
  const hit = byTz.get(tz);
  if (hit) return hit;
  const computed = computeReplay(events, tz);
  byTz.set(tz, computed);
  return computed;
}

/**
 * replay() of everything that happened STRICTLY BEFORE `cutoffDay` ('YYYY-MM-DD',
 * read in `tz`). Semantically identical to replay(events.filter(e => dayOf(e) <
 * cutoffDay)) — and the only form that can be cached, because the filtered array
 * is built here instead of at each call site.
 */
export function replayBefore(
  events: readonly ProgressEvent[],
  cutoffDay: string,
  tz: string = UTC_TZ
): ReplayResult {
  let byKey = replayBeforeCache.get(events);
  if (!byKey) {
    byKey = new Map<string, ReplayResult>();
    replayBeforeCache.set(events, byKey);
  }
  const cacheKey = `${tz}\u0000${cutoffDay}`;
  const hit = byKey.get(cacheKey);
  if (hit) return hit;
  const computed = computeReplay(
    events.filter((e) => dayOf(e.created_at, tz) < cutoffDay),
    tz
  );
  byKey.set(cacheKey, computed);
  return computed;
}

/**
 * Rule 3: the current-status table, rebuilt from the journal alone.
 *
 * Returns a COPY. replay()'s own state is memoised and shared between callers, and
 * this is the value routes and tests hand around and occasionally edit (a health
 * sweep dirtying one cell to test itself, for instance) — handing out the cached
 * map itself would let one caller silently rewrite another's history.
 */
export function rebuildCurrent(events: readonly ProgressEvent[], tz: string = UTC_TZ): CurrentMap {
  const shared = replay(events, tz).state.current;
  const copy: CurrentMap = new Map();
  for (const [childId, works] of shared) copy.set(childId, new Map(works));
  return copy;
}

export function currentStatus(
  events: readonly ProgressEvent[],
  childId: string,
  workKey: string,
  tz: string = UTC_TZ
): Status {
  return rebuildCurrent(events, tz).get(childId)?.get(workKey) ?? DEFAULT_STATUS;
}
