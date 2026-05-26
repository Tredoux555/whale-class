// lib/montree/school-time.ts
// Calendar Plan §7a — every "what day / what week is it" computation in the
// app routes through ONE helper that reads the school's IANA timezone. The
// Railway server is UTC; schools are not. Before this file existed the
// english-schedule route hardcoded 'Asia/Shanghai'; with it, any school in
// any timezone reads correctly.
//
// Usage:
//   const tz = await getSchoolTimezone(schoolId);     // 'Asia/Shanghai'
//   const today = currentWeekdayInTz(tz);             // 'tuesday' | null on weekend
//   const monday = currentWeekStartInTz(tz);          // YYYY-MM-DD string
//   const offsetMs = tzOffsetMs(tz);                  // for cheap shifts
//
// The school's timezone column is the authority; signup_timezone is the
// fallback; 'UTC' is the last-resort default.

import { getSupabase } from '@/lib/supabase-client';

export type WeekdayName =
  | 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export const WEEKDAY_NAMES: readonly WeekdayName[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const;

const FALLBACK_TZ = 'UTC';

// In-process memoisation — timezones almost never change; one round-trip per
// school per process is plenty. Memo cleared by writing a new tz via the
// settings route (not yet wired) — for now a simple TTL keeps drift bounded.
const TZ_CACHE_TTL_MS = 5 * 60 * 1000;
const tzCache = new Map<string, { tz: string; at: number }>();

/**
 * Resolve a school's effective timezone. Reads `montree_schools.timezone`,
 * falls back to `signup_timezone`, then to UTC. NEVER throws — a bad row
 * just returns UTC and lets the caller carry on.
 */
export async function getSchoolTimezone(schoolId: string | null | undefined): Promise<string> {
  if (!schoolId) return FALLBACK_TZ;
  const cached = tzCache.get(schoolId);
  if (cached && Date.now() - cached.at < TZ_CACHE_TTL_MS) return cached.tz;
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('montree_schools')
      .select('timezone, signup_timezone')
      .eq('id', schoolId)
      .maybeSingle();
    const row = data as { timezone?: string | null; signup_timezone?: string | null } | null;
    const tz = (row?.timezone || row?.signup_timezone || FALLBACK_TZ).trim() || FALLBACK_TZ;
    // Sanity-check the IANA name — bad data shouldn't poison subsequent calls.
    const safe = isValidTimezone(tz) ? tz : FALLBACK_TZ;
    tzCache.set(schoolId, { tz: safe, at: Date.now() });
    return safe;
  } catch {
    return FALLBACK_TZ;
  }
}

/** Invalidate the in-process cache for one school (or all). */
export function invalidateSchoolTimezone(schoolId?: string): void {
  if (schoolId) tzCache.delete(schoolId);
  else tzCache.clear();
}

/** True if Intl can format with this name — covers IANA / fixed-offset / 'UTC'. */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz }).resolvedOptions();
    return true;
  } catch {
    return false;
  }
}

/**
 * The current offset (ms) for an IANA timezone, derived without any 3rd-party
 * library by asking Intl for the wall-clock parts and reconstructing the UTC
 * instant they represent. Positive for east of UTC.
 *
 * Why not a fixed +8h? Because timezones with DST change offset — and even
 * though our biggest school is China (no DST), a school in Sydney would shift
 * by an hour twice a year if we hardcoded.
 */
export function tzOffsetMs(tz: string, at: Date = new Date()): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    const parts = dtf.formatToParts(at);
    const lookup: Record<string, string> = {};
    for (const p of parts) lookup[p.type] = p.value;
    // 'hour: 24' from Intl when at midnight — normalize.
    const hour = lookup.hour === '24' ? '00' : lookup.hour;
    const asIfUtc = Date.UTC(
      Number(lookup.year),
      Number(lookup.month) - 1,
      Number(lookup.day),
      Number(hour),
      Number(lookup.minute),
      Number(lookup.second),
    );
    return asIfUtc - at.getTime();
  } catch {
    return 0;
  }
}

/**
 * The current weekday in the given timezone — 'monday'..'friday', or null
 * on Sat/Sun. The single source of truth used everywhere a "what day is
 * 'today' for this classroom" question gets asked.
 */
export function currentWeekdayInTz(tz: string, at: Date = new Date()): Exclude<WeekdayName, 'sunday' | 'saturday'> | null {
  const shifted = new Date(at.getTime() + tzOffsetMs(tz, at));
  const dow = shifted.getUTCDay();
  if (dow === 0 || dow === 6) return null;
  return WEEKDAY_NAMES[dow] as Exclude<WeekdayName, 'sunday' | 'saturday'>;
}

/**
 * The weekday name (including weekend) for a UTC timestamp, interpreted in
 * the given timezone. Powers "the day this photo was taken" derivations.
 */
export function weekdayInTz(utcMs: number, tz: string): WeekdayName {
  if (Number.isNaN(utcMs)) return 'sunday';
  const at = new Date(utcMs);
  return WEEKDAY_NAMES[new Date(utcMs + tzOffsetMs(tz, at)).getUTCDay()];
}

/**
 * The current week's Monday as a YYYY-MM-DD calendar date in the given
 * timezone. Used as the DB key + label for week-scoped tables.
 */
export function currentWeekStartInTz(tz: string, at: Date = new Date()): string {
  const shifted = new Date(at.getTime() + tzOffsetMs(tz, at));
  const dow = shifted.getUTCDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + offset,
  ));
  return monday.toISOString().split('T')[0];
}

/**
 * The UTC instant of a given local-date 00:00 in the given timezone. Used
 * for `captured_at` boundary filtering when you want "≥ this Monday at
 * midnight in the school's time" as a SQL-comparable ISO string.
 *
 * Example: localDateInTzToUtcInstant('2026-05-25', 'Asia/Shanghai')
 *   → Date representing 2026-05-24T16:00:00Z (which is China-Mon 00:00).
 */
export function localDateInTzToUtcInstant(yyyyMmDd: string, tz: string): Date {
  // Take the UTC midnight of the date, then subtract the tz offset AT THAT
  // INSTANT (so DST is honoured for the right moment, not "now").
  const naive = new Date(`${yyyyMmDd}T00:00:00Z`);
  const offset = tzOffsetMs(tz, naive);
  return new Date(naive.getTime() - offset);
}
