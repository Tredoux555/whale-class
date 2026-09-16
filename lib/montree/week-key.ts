// lib/montree/week-key.ts
//
// Canonical client-side week-key math for Montree. Client-safe, zero imports.
//
// Week keys are calendar dates (YYYY-MM-DD), never UTC serializations.
// Historically each report surface defined its own `getCurrentMonday()` that
// built a local Monday-midnight Date and then ran it through `.toISOString()`
// — which converts to UTC. For any device east of UTC (China = the entire
// target market) local Monday 00:00 is still SUNDAY in UTC, so the key landed
// on the Sunday date, one day early. That off-by-one key was persisted as
// `week_start` and used for `captured_at` boundary filters, so on Sundays
// today's photos fell outside "this week" and vanished from the report.
//
// 2026-09-15 — SCHOOL TIME, NOT DEVICE TIME. `currentWeekStart` now reads the
// calendar date in the SCHOOL's timezone (default Asia/Shanghai, the same
// stand-in the tracking engine uses — tracking/ledger.ts DEFAULT_SCHOOL_TZ),
// via Intl parts. A teacher whose laptop is on another zone (travel, a mis-set
// clock zone) now lands on the same Monday the server and the engine use. The
// server notes route uses this helper too, so there is one source of truth
// for "this week". Pass tz = 'local' for the old device-local answer.
//
// `shiftWeek`/`weekEnd` operate on plain YYYY-MM-DD strings (parsed as UTC
// midnight internally, which is safe because input AND output are calendar
// dates with no time component).

/** The school timezone used when the caller has nothing better. */
export const DEFAULT_WEEK_TZ = 'Asia/Shanghai';

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function localDay(at: Date): string {
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/** True for a well-formed YYYY-MM-DD that is a real calendar date. */
export function isDateKey(s: string | null | undefined): s is string {
  if (!s || !DATE_KEY.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** The calendar date (YYYY-MM-DD) of `at` in timezone `tz` ('local' = the device's). */
export function dayInTz(at: Date = new Date(), tz: string = DEFAULT_WEEK_TZ): string {
  if (!tz || tz === 'local') return localDay(at);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(at);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const key = `${get('year')}-${get('month')}-${get('day')}`;
    if (DATE_KEY.test(key)) return key;
  } catch {
    // unknown zone — fall through to the device's date
  }
  return localDay(at);
}

/** The Monday (YYYY-MM-DD) of the week containing calendar date `day`. */
export function mondayOfDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** ISO calendar date (YYYY-MM-DD) of the Monday of `at`'s week, in the school's timezone. */
export function currentWeekStart(at: Date = new Date(), tz: string = DEFAULT_WEEK_TZ): string {
  return mondayOfDay(dayInTz(at, tz));
}

/** The 1st of `at`'s month (YYYY-MM-01), in the school's timezone. */
export function currentMonthStart(at: Date = new Date(), tz: string = DEFAULT_WEEK_TZ): string {
  return `${dayInTz(at, tz).slice(0, 7)}-01`;
}

/** Shift a YYYY-MM-DD week key by whole weeks (pure calendar-date math). */
export function shiftWeek(ws: string, weeks: number): string {
  const d = new Date(`${ws}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/** The date 6 days after `ws` (Monday week key → Sunday that ends the week). */
export function weekEnd(ws: string): string {
  const d = new Date(`${ws}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * The school week a Monday key stands for, as a teacher reads it:
 *   "Mon 14 Sep – Fri 18 Sep 2026"
 *   "Mon 29 Dec 2025 – Fri 2 Jan 2026"   (crosses a year)
 * Display only — the engine window stays Monday..Sunday so weekend taps count.
 */
export function weekRangeLabel(ws: string): string {
  if (!isDateKey(ws)) return ws;
  const a = new Date(`${ws}T00:00:00Z`);
  const b = new Date(a);
  b.setUTCDate(b.getUTCDate() + 4);
  const part = (d: Date) => `${DOW_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MON_SHORT[d.getUTCMonth()]}`;
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  return sameYear
    ? `${part(a)} – ${part(b)} ${b.getUTCFullYear()}`
    : `${part(a)} ${a.getUTCFullYear()} – ${part(b)} ${b.getUTCFullYear()}`;
}

/** Shift a YYYY-MM-01 month key by whole months. */
export function shiftMonth(ms: string, months: number): string {
  const d = new Date(`${ms.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
}

/** "September 2026" */
export function monthKeyLabel(ms: string): string {
  const d = new Date(`${ms.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return ms;
  return `${MON_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The last calendar day (YYYY-MM-DD) of a YYYY-MM-01 month key. */
export function monthEnd(ms: string): string {
  const d = new Date(`${ms.slice(0, 7)}-01T00:00:00Z`);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return last.toISOString().slice(0, 10);
}
