// lib/montree/appointments/slot-computer.ts
//
// Pure function: given a staff member's availability rules + blackouts +
// already-booked ranges, produce the open slot list for a date window.
//
// PURITY: this module has NO Supabase access, NO I/O, NO date-library
// dependencies. All it does is arithmetic over Date objects. Easy to
// reason about, easy to test, easy to call from server OR client.
//
// TIMEZONE STRATEGY:
//   - Rules carry an IANA timezone + a local HH:MM start/end.
//   - For each day in the requested range, we ASK "what UTC instant is
//     08:00 in this timezone on this date?" via Intl.DateTimeFormat.
//   - This handles DST transitions correctly without pulling in
//     date-fns-tz / luxon.
//
// CALL SITE: app/api/montree/appointments/availability/[staffRole]/[staffId]/route.ts
// hydrates rules + blackouts + bookings for the staff member, then calls
// this function. Multi-host intersection happens in a separate helper
// that calls computeOpenSlots per host and intersects.

import type {
  AvailabilityRule,
  AvailabilityBlackout,
  ComputeSlotsInput,
  OpenSlot,
} from './types';

const MS_PER_MIN = 60_000;

/**
 * Compute open slots for a staff member over a date window.
 *
 * Algorithm:
 *   1. For each day in [rangeStart, rangeEnd), for each ACTIVE rule
 *      matching day_of_week, build the window's [startUtc, endUtc].
 *   2. Walk the window in slot_duration_minutes + buffer_minutes steps.
 *   3. Drop slots that overlap any blackout.
 *   4. Drop slots that overlap any booked range.
 *   5. Drop slots ending in the past.
 *
 * Returns ISO TIMESTAMPTZ strings, sorted ascending by start.
 */
export function computeOpenSlots(input: ComputeSlotsInput): OpenSlot[] {
  const { rules, blackouts, bookedRanges, slotDurationMinutes } = input;
  const rangeStart = new Date(input.rangeStart);
  const rangeEnd = new Date(input.rangeEnd);
  const nowMs = Date.now();

  if (
    !Number.isFinite(rangeStart.getTime()) ||
    !Number.isFinite(rangeEnd.getTime()) ||
    rangeEnd <= rangeStart
  ) {
    return [];
  }

  // Hard cap: never compute more than 90 days of slots in one call. The
  // route layer should never request more than ~60 days, but defence in
  // depth.
  const MAX_RANGE_MS = 90 * 24 * 60 * MS_PER_MIN;
  if (rangeEnd.getTime() - rangeStart.getTime() > MAX_RANGE_MS) {
    return [];
  }

  const activeRules = rules.filter((r) => r.is_active);
  if (activeRules.length === 0) return [];

  const out: OpenSlot[] = [];

  // Iterate day-by-day. We use a UTC date pointer; for each day, we
  // compute which weekday it is in each rule's timezone (a day in
  // Auckland may be a different weekday than the same UTC instant in
  // Los Angeles). Done by formatting the date in the rule's tz.
  const dayMs = 24 * 60 * MS_PER_MIN;
  // Walk from one day before rangeStart so rules in earlier timezones
  // that span midnight still show up correctly.
  const walkStart = new Date(rangeStart.getTime() - dayMs);
  const walkEnd = new Date(rangeEnd.getTime() + dayMs);

  for (let cursor = walkStart.getTime(); cursor < walkEnd.getTime(); cursor += dayMs) {
    const cursorDate = new Date(cursor);

    for (const rule of activeRules) {
      const weekdayInTz = weekdayInTimezone(cursorDate, rule.timezone);
      if (weekdayInTz !== rule.day_of_week) continue;

      const window = ruleWindowAsUtc(cursorDate, rule);
      if (!window) continue;

      const slotDuration =
        slotDurationMinutes && slotDurationMinutes > 0
          ? slotDurationMinutes
          : rule.slot_duration_minutes;
      const step = slotDuration + rule.buffer_minutes;

      for (
        let slotStart = window.startUtc;
        slotStart + slotDuration * MS_PER_MIN <= window.endUtc;
        slotStart += step * MS_PER_MIN
      ) {
        const slotEnd = slotStart + slotDuration * MS_PER_MIN;

        if (slotEnd <= nowMs) continue;
        if (slotStart < rangeStart.getTime() || slotEnd > rangeEnd.getTime()) continue;
        if (overlapsBlackout(slotStart, slotEnd, blackouts)) continue;
        if (overlapsBooked(slotStart, slotEnd, bookedRanges)) continue;

        out.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
        });
      }
    }
  }

  // Dedup + sort. Different rules can produce the same slot (e.g. two
  // overlapping windows). Slot uniqueness is on (start) since duration
  // is fixed by the slotDuration arg / rule.
  const seen = new Set<string>();
  const deduped = out
    .filter((s) => {
      if (seen.has(s.start)) return false;
      seen.add(s.start);
      return true;
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  return deduped;
}

/**
 * Intersect multiple staff members' open slots. Used for Collective
 * event kinds — every required host must be free at the same time.
 *
 * Slots are matched by exact (start, end) — works because every call to
 * computeOpenSlots is asked for the same slotDuration.
 */
export function intersectSlots(slotsPerHost: OpenSlot[][]): OpenSlot[] {
  if (slotsPerHost.length === 0) return [];
  if (slotsPerHost.length === 1) return slotsPerHost[0];

  let acc = new Map<string, OpenSlot>();
  for (const slot of slotsPerHost[0]) acc.set(slot.start, slot);

  for (let i = 1; i < slotsPerHost.length; i++) {
    const next = new Map<string, OpenSlot>();
    for (const slot of slotsPerHost[i]) {
      if (acc.has(slot.start)) next.set(slot.start, slot);
    }
    acc = next;
    if (acc.size === 0) return [];
  }

  return Array.from(acc.values()).sort((a, b) => a.start.localeCompare(b.start));
}

// ── Internal helpers ──────────────────────────────────────────────────

/**
 * What weekday is the given UTC date IN the given timezone? Returns
 * 0=Sunday … 6=Saturday. Uses Intl to do tz conversion without a
 * date-lib dependency.
 */
function weekdayInTimezone(date: Date, timezone: string): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const weekday = fmt.format(date);
    const map: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return map[weekday] ?? 0;
  } catch {
    // Bad timezone string — fall back to UTC weekday.
    return date.getUTCDay();
  }
}

/**
 * Given a UTC date (representing "some moment on this day"), compute
 * the UTC start and end timestamps for the rule's local-time window
 * on that calendar day in the rule's timezone.
 *
 * Strategy: format the cursor date in the rule's tz to get
 * year/month/day, then compose an ISO string with the rule's local
 * time, then parse as if it were tz-local and convert to UTC. We
 * approximate this by formatting in en-CA (yields YYYY-MM-DD format)
 * and using the tz offset implied by formatting.
 */
function ruleWindowAsUtc(
  cursor: Date,
  rule: AvailabilityRule
): { startUtc: number; endUtc: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: rule.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(cursor);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (!y || !m || !d) return null;

    const startUtc = localTimeToUtc(`${y}-${m}-${d}T${rule.start_time}`, rule.timezone);
    const endUtc = localTimeToUtc(`${y}-${m}-${d}T${rule.end_time}`, rule.timezone);
    if (startUtc === null || endUtc === null || endUtc <= startUtc) return null;
    return { startUtc, endUtc };
  } catch {
    return null;
  }
}

/**
 * Convert a wall-clock "YYYY-MM-DDTHH:MM:SS" in `timezone` to a UTC
 * millisecond timestamp. Works by computing the tz offset for that
 * instant via Intl.
 */
function localTimeToUtc(localIso: string, timezone: string): number | null {
  // Step 1: parse as UTC.
  const naive = Date.parse(localIso + 'Z');
  if (Number.isNaN(naive)) return null;

  // Step 2: figure out what UTC offset `timezone` has at that wall-clock
  // time. Format the naive UTC instant in `timezone` and see how many
  // hours/min it diverges from the wall-clock target.
  const tzFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = tzFmt.formatToParts(new Date(naive));
  const get = (type: string) => {
    const p = parts.find((q) => q.type === type);
    return p ? parseInt(p.value, 10) : NaN;
  };
  const tzYear = get('year');
  const tzMonth = get('month');
  const tzDay = get('day');
  // Intl returns hour as '24' for midnight in some locales. Normalise.
  let tzHour = get('hour');
  if (tzHour === 24) tzHour = 0;
  const tzMinute = get('minute');
  const tzSecond = get('second');

  if ([tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond].some(Number.isNaN)) {
    return null;
  }

  // The naive UTC was interpreted by the formatter as tz-local time.
  // Compute the offset between the two.
  const tzAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
  const offsetMs = tzAsUtc - naive;

  // The desired UTC instant = naive minus the offset (because naive was
  // the wall-clock interpreted as UTC; the actual UTC instant is
  // shifted by -offsetMs).
  return naive - offsetMs;
}

function overlapsBlackout(
  slotStart: number,
  slotEnd: number,
  blackouts: AvailabilityBlackout[]
): boolean {
  for (const b of blackouts) {
    const bStart = Date.parse(b.start_at);
    const bEnd = Date.parse(b.end_at);
    if (Number.isNaN(bStart) || Number.isNaN(bEnd)) continue;
    if (slotStart < bEnd && slotEnd > bStart) return true;
  }
  return false;
}

function overlapsBooked(
  slotStart: number,
  slotEnd: number,
  bookedRanges: Array<{ start: string; end: string }>
): boolean {
  for (const r of bookedRanges) {
    const rStart = Date.parse(r.start);
    const rEnd = Date.parse(r.end);
    if (Number.isNaN(rStart) || Number.isNaN(rEnd)) continue;
    if (slotStart < rEnd && slotEnd > rStart) return true;
  }
  return false;
}
