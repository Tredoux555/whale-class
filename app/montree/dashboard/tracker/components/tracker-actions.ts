// app/montree/dashboard/tracker/components/tracker-actions.ts
//
// Every decision and every write the tracker screen makes, with no React in
// sight — so the rules that matter (the ladder only climbs; a downgrade needs
// a reason; an unknown name is resolved or dismissed, never guessed) are
// testable without a DOM. The components below are thin: they render state and
// call these.
//
// Constitution touchpoints:
//   rule 3 — every change is an event; each call below posts one.
//   rule 4 — nextStatus() never wraps past 'mastered', and a lower status can
//            only be reached through correction(), which refuses to fire
//            without a reason.
//   rule 5 — the review queue resolves to a KEY or is dismissed. There is no
//            third option and no free-text write.

import type { EventOutcome, QueueItem, Status, CurriculumWorkRow } from './types';

export const LADDER: readonly Status[] = ['not_started', 'presented', 'practicing', 'mastered'];

export const STATUS_LABEL: Record<Status, string> = {
  not_started: 'Not started',
  presented: 'Presented',
  practicing: 'Practising',
  mastered: 'Mastered',
};

/** The Writing Shelf's three taught states, mapped onto the one ladder. */
export const SHELF_LABEL: Record<Status, string> = {
  not_started: 'Not started',
  presented: 'Presented',
  practicing: 'Practising',
  mastered: 'Independent',
};

export const EVENT_URL = '/api/montree/progress/event';
export const CLASS_URL = '/api/montree/tracking/class';
export const CLASS_WEEK_URL = '/api/montree/tracking/class-week';
export const QUEUE_RESOLVE_URL = '/api/montree/tracking/review-queue/resolve';
export const CHILD_URL = '/api/montree/tracking/child';
export const HEALTH_URL = '/api/montree/tracking/health';

/**
 * One tap forward. Returns null at the top of the ladder: tapping a mastered
 * cell must NOT roll around to 'not_started' — that is a downgrade, and rule 4
 * gives downgrades exactly one route (a correction with a reason).
 */
export function nextStatus(current: Status | undefined | null): Status | null {
  const i = LADDER.indexOf((current ?? 'not_started') as Status);
  const at = i < 0 ? 0 : i;
  return at >= LADDER.length - 1 ? null : LADDER[at + 1];
}

/** The rungs a correction may drop a work to: everything below where it is. */
export function correctionTargets(current: Status | undefined | null): Status[] {
  const i = LADDER.indexOf((current ?? 'not_started') as Status);
  return i <= 0 ? [] : LADDER.slice(0, i);
}

export function isDowngrade(from: Status | null | undefined, to: Status): boolean {
  return LADDER.indexOf(to) < LADDER.indexOf((from ?? 'not_started') as Status);
}

async function postJson<T>(url: string, body: unknown, method = 'POST'): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${url} → ${res.status}`);
  return (await res.json()) as T;
}

export interface TapArgs {
  childId: string;
  workKey: string;
  status: Status;
  classroomId?: string | null;
  actor?: string | null;
}

/** A teacher's tick. Forward only — source 'tap'. */
export function tapEvent(args: TapArgs): Promise<EventOutcome> {
  return postJson<EventOutcome>(EVENT_URL, {
    child_id: args.childId,
    work: args.workKey,
    status: args.status,
    source: 'tap',
    actor: args.actor ?? null,
    classroom_id: args.classroomId ?? null,
  });
}

export class ReasonRequiredError extends Error {
  constructor() {
    super('A correction needs a reason. Rule 4: a downgrade is always explained.');
    this.name = 'ReasonRequiredError';
  }
}

export interface CorrectionArgs extends TapArgs {
  reason: string;
}

/**
 * A teacher taking the record DOWN. Rule 4: the reason is mandatory, checked
 * HERE — before any network call — so an empty box can never become a silent
 * downgrade if a route were ever lenient.
 */
export function correctionEvent(args: CorrectionArgs): Promise<EventOutcome> {
  if (!args.reason || !args.reason.trim()) return Promise.reject(new ReasonRequiredError());
  return postJson<EventOutcome>(EVENT_URL, {
    child_id: args.childId,
    work: args.workKey,
    status: args.status,
    source: 'correction',
    reason: args.reason.trim(),
    actor: args.actor ?? null,
    classroom_id: args.classroomId ?? null,
  });
}

/** PATCH the letter the whole class is on this week. */
export function setClassWeekLetter(classroomId: string, letter: string): Promise<{ ok: boolean }> {
  return postJson<{ ok: boolean }>(CLASS_WEEK_URL, { classroom_id: classroomId, letter }, 'PATCH');
}

/** Rule 5: an unknown name becomes a KEY, or it becomes nothing. */
export function resolveQueueItem(id: string, workKey: string): Promise<{ outcome: string }> {
  return postJson<{ outcome: string }>(QUEUE_RESOLVE_URL, { id, work_key: workKey });
}

export function dismissQueueItem(id: string): Promise<{ outcome: string }> {
  return postJson<{ outcome: string }>(QUEUE_RESOLVE_URL, { id, dismiss: true });
}

export function classUrl(classroomId: string, weekStart: string): string {
  return `${CLASS_URL}?classroom_id=${encodeURIComponent(classroomId)}&week_start=${encodeURIComponent(weekStart)}`;
}

/* --------------------------------------------------------------- helpers -- */

/** Monday of the week containing `d` (UTC), as 'YYYY-MM-DD'. */
export function mondayOf(d: Date = new Date()): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = x.getUTCDay(); // 0 Sun … 6 Sat
  x.setUTCDate(x.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return x.toISOString().slice(0, 10);
}

export function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/**
 * The classroom-works search behind the queue's "what did this mean?" picker.
 * Forgiving on case/punctuation, and it ranks a prefix hit above a contained
 * one — but it never picks for you: resolving is a human's tap (rule 5).
 */
export function searchWorks(query: string, works: readonly CurriculumWorkRow[], limit = 12): CurriculumWorkRow[] {
  const q = query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!q) return [...works].sort((a, b) => a.sequence - b.sequence).slice(0, limit);
  const scored: { w: CurriculumWorkRow; score: number }[] = [];
  for (const w of works) {
    const hay = `${w.name} ${w.work_key}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (hay.startsWith(q)) scored.push({ w, score: 2 });
    else if (hay.includes(q)) scored.push({ w, score: 1 });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.w.sequence - b.w.sequence)
    .slice(0, limit)
    .map((s) => s.w);
}

/** Optimistic local patch — replaced by the refetch that follows every write. */
export function withStatus<T extends { week: Record<string, Status>; current: Record<string, Status> }>(
  child: T,
  workKey: string,
  status: Status
): T {
  return {
    ...child,
    week: { ...child.week, [workKey]: status },
    current: { ...child.current, [workKey]: status },
  };
}

export function withoutQueueItem(queue: readonly QueueItem[], id: string): QueueItem[] {
  return queue.filter((q) => q.id !== id);
}
