// lib/games/weekly-schedule.ts
//
// ═══════════════════════════════════════════════════════════════════════════
// THE WEEKLY ROTATION — one week per DARK PHONICS lesson
// ═══════════════════════════════════════════════════════════════════════════
//
// REWRITTEN 2026-08-20. This file used to carry its own hand-written list of
// five sound games with Chinese labels. It no longer carries ANY content: the
// public /play surface now serves the Dark Phonics curriculum, so a "week" IS
// a lesson. Week 1 = lesson 1 ('s'), week 49 = lesson 49 — 1:1, in teaching
// order.
//
// 🚨 THERE IS NOTHING TO EDIT HERE WHEN THE CURRICULUM CHANGES.
// Every sound / title / catchphrase comes from the curriculum array. To change
// what a parent reads, edit lib/montree/dark-phonics/lessons.ts and this file
// follows automatically. Do NOT copy lesson strings back in here — a second
// copy of the curriculum is exactly what the Phase 2 hoist removed.
//
// 🚨 SANCTIONED BOUNDARY EXCEPTION: `lib/games/*` importing `lib/montree/*`
// crosses the games ⇄ montree product line, which is normally kept apart. It
// is deliberate and approved here — /play is now the parent-facing front door
// of the Dark Phonics curriculum, and duplicating 49 lessons to respect a
// directory boundary would be strictly worse than crossing it. lessons.ts is
// pure data + two pure helpers (no React, no imports, no side effects), so the
// import is safe in server components, client components and route handlers.
//
// UNLOCK MATHS (unchanged — this schedule already shipped to parents)
//   • Weeks 1 and 2 are open from launch — a parent arriving cold has
//     something to do on day one.
//   • Week 3 opens at ANCHOR_UNLOCK_UTC (2026-08-27 00:00 Asia/Shanghai).
//   • Week N > 3 opens at ANCHOR + (N − 3) × 7 days, out to week 49.
//   No unlock date is ever set by hand.
//
// TO SHIFT THE WHOLE SCHEDULE (a holiday, a late start)
//   Change ANCHOR_UNLOCK_UTC and every later week slides with it. Note it is a
//   UTC instant: Asia/Shanghai is UTC+8 year-round (no daylight saving), so
//   midnight there = 16:00 UTC the previous day.
// ═══════════════════════════════════════════════════════════════════════════

import { RAW, displayN } from '@/lib/montree/dark-phonics/lessons';

/** One week of the parent-facing rotation — a projection of ONE Dark Phonics lesson. */
export interface WeeklyWeek {
  /** 1-based week number. Identical to `displayN`; both exist because callers
   *  talk about "week 7" while the curriculum talks about "lesson 7". */
  week: number;
  /** The lesson number a human reads (1–49) — i.e. `displayN(rawN)`. */
  displayN: number;
  /** The curriculum's own lesson number (5–53). THIS is the media key: every
   *  bucket object is lesson-NN keyed on it. Never render this number. */
  rawN: number;
  /** Letter, digraph or teaching label ('s', 'ck', 'short A', 'review'). */
  sound: string;
  /** The lesson's title, e.g. 'The Snake Says Ssss'. */
  title: string;
  /** The chanted hook, e.g. '“snake in my sock!”'. */
  catchphrase: string;
}

// ── Unlock anchor ──────────────────────────────────────────────────────────
/** The week whose unlock instant is pinned by ANCHOR_UNLOCK_UTC. */
export const ANCHOR_WEEK = 3;

/**
 * 2026-08-27 00:00 in Asia/Shanghai, written as the UTC instant it equals.
 * Shanghai is UTC+8 with no daylight saving, so midnight there is 16:00 UTC
 * on the previous day — that is why this reads 08-26T16:00Z, not 08-27.
 */
export const ANCHOR_UNLOCK_UTC = '2026-08-26T16:00:00.000Z';

/** Weeks before the anchor are open from launch. */
export const ALWAYS_OPEN_BEFORE_WEEK = ANCHOR_WEEK;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The IANA zone every parent-facing date on /play is formatted in. */
export const SCHEDULE_TZ = 'Asia/Shanghai';

// ── The rotation ───────────────────────────────────────────────────────────
/**
 * All 49 weeks, derived from the curriculum in teaching order. RAW is already
 * ordered (n = 5…53), so displayN(n) = 1…49 comes out ascending and a week's
 * number is simply its lesson's display number.
 */
export const WEEKS: WeeklyWeek[] = RAW.map((lesson) => ({
  week: displayN(lesson.n),
  displayN: displayN(lesson.n),
  rawN: lesson.n,
  sound: lesson.sound,
  title: lesson.title,
  catchphrase: lesson.catchphrase,
}));

/** 49 — the length of the programme, computed rather than asserted. */
export const TOTAL_WEEKS = WEEKS.length;

/**
 * The instant a week opens, or `null` for the launch weeks (1 and 2), which
 * have no unlock date because they were never locked.
 */
export function unlockDateFor(week: number): Date | null {
  if (week < ALWAYS_OPEN_BEFORE_WEEK) return null;
  const anchor = new Date(ANCHOR_UNLOCK_UTC).getTime();
  return new Date(anchor + (week - ANCHOR_WEEK) * WEEK_MS);
}

/** Has this week opened yet? Pass `now` explicitly so callers stay testable. */
export function isUnlocked(week: number, now: Date = new Date()): boolean {
  const opensAt = unlockDateFor(week);
  if (!opensAt) return true;
  return now.getTime() >= opensAt.getTime();
}

/**
 * "Aug 27" — the unlock day as a parent in Shanghai experiences it. Always
 * formatted in SCHEDULE_TZ, never in the server's zone, so a container
 * running on UTC does not show yesterday's date.
 */
export function formatUnlockDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: SCHEDULE_TZ,
  }).format(date);
}

/**
 * The newest week that has opened — the one to highlight as "this week".
 * Falls back to week 1 before anything has unlocked.
 */
export function currentWeekNumber(weeks: WeeklyWeek[] = WEEKS, now: Date = new Date()): number {
  const open = weeks.filter((w) => isUnlocked(w.week, now));
  if (open.length === 0) return weeks[0]?.week ?? 1;
  return open.reduce((max, w) => (w.week > max ? w.week : max), open[0].week);
}

/** A week plus its lock state — everything a page needs to render one row. */
export interface WeekInfo extends WeeklyWeek {
  /** When this week opens; `null` for the launch weeks, which never locked. */
  unlockDate: Date | null;
  /** The server-clock answer to "may this be shown yet?". */
  unlocked: boolean;
}

/**
 * The week/lesson at DISPLAY number `n` (1–49) with its lock state resolved,
 * or `null` when `n` is out of range (a hand-typed /play/week/99). Pass `now`
 * explicitly to keep callers testable; the pages pass the SERVER's clock, so a
 * child cannot open next week by changing the phone's date.
 */
export function weekForLesson(n: number, now: Date = new Date()): WeekInfo | null {
  const week = WEEKS.find((w) => w.week === n);
  if (!week) return null;
  return {
    ...week,
    unlockDate: unlockDateFor(week.week),
    unlocked: isUnlocked(week.week, now),
  };
}

/** Every week with its lock state resolved, in teaching order. */
export function allWeekInfo(now: Date = new Date()): WeekInfo[] {
  return WEEKS.map((w) => ({
    ...w,
    unlockDate: unlockDateFor(w.week),
    unlocked: isUnlocked(w.week, now),
  }));
}

export default WEEKS;
