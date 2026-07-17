// lib/montree/week-key.ts
//
// Canonical client-side week-key math for Montree. Client-safe, zero imports.
//
// Week keys are LOCAL calendar dates (YYYY-MM-DD), never UTC serializations.
// Historically each report surface defined its own `getCurrentMonday()` that
// built a local Monday-midnight Date and then ran it through `.toISOString()`
// — which converts to UTC. For any device east of UTC (China = the entire
// target market) local Monday 00:00 is still SUNDAY in UTC, so the key landed
// on the Sunday date, one day early. That off-by-one key was persisted as
// `week_start` and used for `captured_at` boundary filters, so on Sundays
// today's photos fell outside "this week" and vanished from the report.
//
// `currentWeekStart` builds the string from LOCAL date parts (getFullYear/
// getMonth/getDate) and never calls toISOString on a local-midnight Date, so
// the key is always the true local Monday. `shiftWeek`/`weekEnd` operate on
// plain YYYY-MM-DD strings (parsed as UTC midnight internally, which is safe
// because the input AND output are calendar dates with no time component) —
// their behavior is byte-identical to the local twins they replace.

/** ISO calendar date (YYYY-MM-DD) for the LOCAL Monday of `at`'s week. */
export function currentWeekStart(at: Date = new Date()): string {
  const dow = at.getDay(); // 0=Sun..6=Sat, LOCAL
  // Date normalizes an out-of-range day-of-month, so a negative/overflow value
  // rolls into the correct previous/next month.
  const monday = new Date(at.getFullYear(), at.getMonth(), at.getDate() - ((dow + 6) % 7));
  const y = monday.getFullYear();
  const m = monday.getMonth() + 1;
  const d = monday.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
