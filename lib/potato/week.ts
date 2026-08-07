// lib/potato/week.ts
// Week math for Potato Snaps. Pure, dependency-free, isomorphic (server + browser).
//
// 🚨 THE RULE THIS FILE EXISTS TO ENFORCE
// A "week" is Monday 00:00 → the following Monday 00:00 IN THE CLASSROOM'S OWN
// TIMEZONE (tp_classes.tz). It is never derived from the server's UTC clock and
// never from `toISOString()` on a local Date.
//
// Why: `new Date(2026,8,7).toISOString()` in UTC+8 yields "2026-09-06T16:00:00Z"
// — the date component silently rolls back a day. Montree shipped that bug: on a
// Sunday in China, "this week" excluded today's photos, and teachers saw an empty
// board. Every date key here is built from explicit calendar fields.
//
// Contract between client and server:
//   • the client computes ITS OWN local Monday and sends `weekStart=YYYY-MM-DD`
//   • the server validates the shape and converts that calendar date into a UTC
//     instant range using the CLASS timezone
//   • when the client sends nothing, the server defaults to the current week in
//     the class timezone

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_MS = 86_400_000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Is this a well-formed YYYY-MM-DD that names a real calendar day? */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  // Round-trip through UTC calendar arithmetic to reject 2026-02-31 etc.
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

/** A sane-looking IANA zone name, with a safe fallback. */
export function safeTimeZone(tz: unknown): string {
  if (typeof tz !== 'string' || !tz) return 'UTC';
  try {
    // Throws RangeError on an unknown zone.
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return 'UTC';
  }
}

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = Sunday
}

/** Break an instant into the wall-clock fields an observer in `tz` would read. */
function partsInZone(instant: Date, tz: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(instant)) {
    if (part.type !== 'literal') bag[part.type] = part.value;
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour) % 24, // h23 already gives 0-23; the modulo is belt-and-braces
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: WEEKDAY_INDEX[bag.weekday] ?? 0,
  };
}

/** Offset of `tz` from UTC, in minutes, at this instant (east of UTC is positive). */
function offsetMinutes(instant: Date, tz: string): number {
  const p = partsInZone(instant, tz);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const whole = instant.getTime() - instant.getMilliseconds();
  return Math.round((asIfUtc - whole) / 60_000);
}

/**
 * Convert a wall-clock date+time in `tz` into the UTC instant it names.
 *
 * Two passes, because the offset we need depends on the answer we are computing
 * (the DST chicken-and-egg). Pass one guesses with the offset at the naive
 * instant; pass two re-reads the offset at the candidate answer and corrects if
 * a transition moved it. This is the same probe Montree's reminder scheduler
 * uses and it is correct everywhere except inside the one hour that a spring-
 * forward deletes, where it lands on the following valid instant — which is the
 * behaviour we want for a midnight week boundary.
 */
function zonedToUtc(
  year: number, month: number, day: number,
  hour: number, minute: number, second: number,
  tz: string,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = offsetMinutes(new Date(naive), tz);
  let ts = naive - firstOffset * 60_000;
  const secondOffset = offsetMinutes(new Date(ts), tz);
  if (secondOffset !== firstOffset) ts = naive - secondOffset * 60_000;
  return new Date(ts);
}

/** Shift a YYYY-MM-DD by whole days. Pure calendar arithmetic — no timezone. */
export function addDays(dateString: string, days: number): string {
  const [y, m, d] = dateString.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** The Monday on or before this calendar date. */
function mondayOfCalendarDate(year: number, month: number, day: number, weekday: number): string {
  const back = (weekday + 6) % 7; // Mon → 0, Sun → 6
  const monday = new Date(Date.UTC(year, month - 1, day) - back * DAY_MS);
  return `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
}

/**
 * The current week's Monday, as the classroom's own calendar sees it.
 * This is the server-side default when the client sends no `weekStart`.
 */
export function currentWeekStartInZone(tz: string, now: Date = new Date()): string {
  const zone = safeTimeZone(tz);
  const p = partsInZone(now, zone);
  return mondayOfCalendarDate(p.year, p.month, p.day, p.weekday);
}

/**
 * The current week's Monday as the BROWSER's local calendar sees it.
 * Client-side only helper — deliberately built from getFullYear/getMonth/
 * getDate/getDay, never from toISOString().
 */
export function currentWeekStartLocal(now: Date = new Date()): string {
  return mondayOfCalendarDate(
    now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getDay(),
  );
}

export interface WeekRange {
  /** YYYY-MM-DD, always a Monday */
  weekStart: string;
  /** inclusive lower bound, ISO instant */
  startIso: string;
  /** EXCLUSIVE upper bound, ISO instant */
  endIso: string;
}

/**
 * Turn a Monday date string + a class timezone into the half-open instant range
 * [Monday 00:00 local, next Monday 00:00 local).
 */
export function weekRange(weekStart: string, tz: string): WeekRange {
  const zone = safeTimeZone(tz);
  const [y, m, d] = weekStart.split('-').map(Number);
  const nextMonday = addDays(weekStart, 7);
  const [ny, nm, nd] = nextMonday.split('-').map(Number);
  return {
    weekStart,
    startIso: zonedToUtc(y, m, d, 0, 0, 0, zone).toISOString(),
    endIso: zonedToUtc(ny, nm, nd, 0, 0, 0, zone).toISOString(),
  };
}

/**
 * Normalise whatever the client sent into a Monday in the class timezone.
 * An absent/garbage value falls back to the current week rather than erroring,
 * so a stale bookmark can never hand a teacher a blank screen.
 * Returns null when the value is present but malformed, so callers can 400.
 */
export function resolveWeekStart(raw: unknown, tz: string): string | null {
  if (raw === null || raw === undefined || raw === '') {
    return currentWeekStartInZone(tz);
  }
  if (!isValidDateString(raw)) return null;
  // Snap to Monday even if the caller sent a mid-week date — the week a date
  // belongs to is never ambiguous.
  const [y, m, d] = raw.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return mondayOfCalendarDate(y, m, d, weekday);
}

/** "Sep 7–11" — the human label on the week pill. Mon–Fri, the school week. */
export function weekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const monday = new Date(Date.UTC(y, m - 1, d));
  const friday = new Date(Date.UTC(y, m - 1, d) + 4 * DAY_MS);
  const m1 = MONTH_SHORT[monday.getUTCMonth()];
  const m2 = MONTH_SHORT[friday.getUTCMonth()];
  return m1 === m2
    ? `${m1} ${monday.getUTCDate()}–${friday.getUTCDate()}`
    : `${m1} ${monday.getUTCDate()} – ${m2} ${friday.getUTCDate()}`;
}

/** Year + month folder names for a storage path, in the class's own calendar. */
export function storageDateFolders(tz: string, instant: Date = new Date()): { yyyy: string; mm: string } {
  const p = partsInZone(instant, safeTimeZone(tz));
  return { yyyy: String(p.year), mm: pad2(p.month) };
}
