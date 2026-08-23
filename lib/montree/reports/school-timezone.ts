// lib/montree/reports/school-timezone.ts
//
// One place to answer "how many hours east of UTC is this school right now?"
// for every aggregatePeriod() caller.
//
// WHY THIS EXISTS (audit fix, Aug 23 2026): aggregatePeriod turns an inclusive
// YYYY-MM-DD range into timestamptz filters for created_at / observed_at /
// captured_at. With utcOffsetHours left at its 0 default, a school at +8 loses
// the first eight hours of every Monday and gains the last eight of the
// previous Sunday — so the Weekly Wrap, the Weekly/Monthly admin docs and the
// period-report page all disagreed about what "this week" contained. The
// period-report API route was the only caller passing the offset; the three
// Phase 7/8 callers were not.
//
// Not a hook, not server-only: pure DB read + the pure tzOffsetHours helper.

import { tzOffsetHours } from './period-report-view';

/** Whale Class (Asia/Shanghai) — used when the school has no settings.timezone. */
export const DEFAULT_UTC_OFFSET_HOURS = 8;

/**
 * Hours east of UTC for a school, from montree_schools.settings.timezone.
 * Never throws: an unreadable school, a missing column or an unknown IANA zone
 * all fall back to DEFAULT_UTC_OFFSET_HOURS.
 */
export async function schoolUtcOffsetHours(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- service-role client is untyped
  supabase: any,
  schoolId: string | null | undefined,
): Promise<number> {
  if (!schoolId) return DEFAULT_UTC_OFFSET_HOURS;
  try {
    const { data } = await supabase.from('montree_schools').select('settings').eq('id', schoolId).maybeSingle();
    const tz = data?.settings?.timezone as string | undefined;
    return tzOffsetHours(tz) ?? DEFAULT_UTC_OFFSET_HOURS;
  } catch {
    return DEFAULT_UTC_OFFSET_HOURS;
  }
}
