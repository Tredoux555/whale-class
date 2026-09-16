// tests/week-key.test.ts — "this week" is the SCHOOL's week (2026-09-15).

import { describe, expect, it } from 'vitest';
import {
  currentMonthStart,
  currentWeekStart,
  dayInTz,
  isDateKey,
  monthEnd,
  monthKeyLabel,
  shiftMonth,
  shiftWeek,
  weekEnd,
  weekRangeLabel,
} from '@/lib/montree/week-key';

describe('currentWeekStart — anchored to the school timezone', () => {
  it('Sunday 23:30 in Beijing is still the week that began on Monday 7 Sep', () => {
    const at = new Date('2026-09-13T15:30:00.000Z'); // Sun 13 Sep 23:30 Beijing
    expect(dayInTz(at, 'Asia/Shanghai')).toBe('2026-09-13');
    expect(currentWeekStart(at, 'Asia/Shanghai')).toBe('2026-09-07');
    expect(currentWeekStart(at)).toBe('2026-09-07'); // default tz is Beijing
  });

  it('Monday 00:30 in Beijing is the new week', () => {
    const at = new Date('2026-09-13T16:30:00.000Z'); // Mon 14 Sep 00:30 Beijing
    expect(currentWeekStart(at, 'Asia/Shanghai')).toBe('2026-09-14');
  });

  it('Beijing Monday morning while UTC is still Sunday', () => {
    const at = new Date('2026-09-13T23:00:00.000Z'); // Sun 23:00 UTC = Mon 07:00 Beijing
    expect(currentWeekStart(at, 'UTC')).toBe('2026-09-07');
    expect(currentWeekStart(at, 'Asia/Shanghai')).toBe('2026-09-14');
    expect(currentWeekStart(at)).toBe('2026-09-14');
  });

  it('a week crossing a month and a year', () => {
    expect(currentWeekStart(new Date('2027-01-01T04:00:00.000Z'))).toBe('2026-12-28');
  });

  it('an unknown zone falls back instead of throwing', () => {
    expect(isDateKey(currentWeekStart(new Date(), 'Not/AZone'))).toBe(true);
  });

  it('currentMonthStart reads the school month', () => {
    // 30 Sep 17:00 UTC is already 1 Oct in Beijing.
    expect(currentMonthStart(new Date('2026-09-30T17:00:00.000Z'))).toBe('2026-10-01');
    expect(currentMonthStart(new Date('2026-09-30T17:00:00.000Z'), 'UTC')).toBe('2026-09-01');
  });
});

describe('pure calendar math is unchanged', () => {
  it('shiftWeek / weekEnd', () => {
    expect(shiftWeek('2026-09-14', 1)).toBe('2026-09-21');
    expect(shiftWeek('2026-09-14', -2)).toBe('2026-08-31');
    expect(weekEnd('2026-09-14')).toBe('2026-09-20');
  });

  it('months', () => {
    expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01');
    expect(shiftMonth('2026-09-01', 1)).toBe('2026-10-01');
    expect(monthEnd('2026-02-01')).toBe('2026-02-28');
    expect(monthKeyLabel('2026-09-01')).toBe('September 2026');
  });
});

describe('weekRangeLabel — the header a teacher reads', () => {
  it('Mon–Fri in one year', () => {
    expect(weekRangeLabel('2026-09-14')).toBe('Mon 14 Sep – Fri 18 Sep 2026');
  });
  it('across a month', () => {
    expect(weekRangeLabel('2026-09-28')).toBe('Mon 28 Sep – Fri 2 Oct 2026');
  });
  it('across a year', () => {
    expect(weekRangeLabel('2025-12-29')).toBe('Mon 29 Dec 2025 – Fri 2 Jan 2026');
  });
  it('leaves junk alone', () => {
    expect(weekRangeLabel('nope')).toBe('nope');
  });
});
