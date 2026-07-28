// lib/montree/montage-tracker/weekRange.ts
//
// Calendar helpers for the Montage Tracker. Pure functions, no imports —
// this file is deliberately dependency-free so the tracker module can be
// lifted into a standalone app unchanged.
//
// 🚨 TIMEZONE. Every helper here works off the BROWSER's local calendar and
// formats with getFullYear/getMonth/getDate — never toISOString(), which
// would shift the day backwards in Asia/Shanghai and hand a teacher
// yesterday's board. Same rule (and same localDate shape) as
// components/montree/montage/MontageStudio.tsx.

/** Browser-local YYYY-MM-DD for a Date (never toISOString). */
export function formatLocalDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Browser-local YYYY-MM-DD, optionally offset by whole days. */
export function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatLocalDate(d);
}

export interface DateRange {
  /** Inclusive YYYY-MM-DD. */
  start: string;
  /** Inclusive YYYY-MM-DD. */
  end: string;
}

/** Today, as a single-day inclusive range. */
export function todayRange(): DateRange {
  const d = localDate(0);
  return { start: d, end: d };
}

/**
 * The CURRENT calendar week, Monday → Sunday, in browser-local time.
 * JS getDay() is 0=Sunday, so Sunday must walk back 6 days, not 0.
 */
export function currentWeekRange(from: Date = new Date()): DateRange {
  const start = new Date(from);
  const dow = start.getDay(); // 0 Sun … 6 Sat
  const backToMonday = dow === 0 ? 6 : dow - 1;
  start.setDate(start.getDate() - backToMonday);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
}

/** The current calendar month, 1st → last day, in browser-local time. */
export function currentMonthRange(from: Date = new Date()): DateRange {
  const start = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(from.getFullYear(), from.getMonth() + 1, 0);
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
}

/**
 * YYYY-MM-DD → the next calendar day, so an INCLUSIVE end date can be queried
 * as a half-open `< end + 1 day` bound. Parsed as UTC purely for the
 * arithmetic (no local component is read back out), which keeps the pure
 * string→string mapping stable on the server too.
 */
export function exclusiveEndDate(dateEnd: string): string {
  const d = new Date(`${dateEnd}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateEnd;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Short "3/8 – 9/8" style label for a range (day/month, locale-neutral). */
export function shortRangeLabel(range: DateRange): string {
  const fmt = (s: string) => {
    const [, m, d] = s.split('-');
    return `${Number(d)}/${Number(m)}`;
  };
  return range.start === range.end
    ? fmt(range.start)
    : `${fmt(range.start)} – ${fmt(range.end)}`;
}
