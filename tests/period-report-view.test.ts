// tests/period-report-view.test.ts
// Pure helpers behind /montree/dashboard/period-report and the period API route.

import { describe, it, expect } from 'vitest';
import {
  heatIntensity,
  heatmapMax,
  hexToRgba,
  MIN_VISIBLE_INTENSITY,
  shiftPeriodStart,
  snapPeriodStart,
  formatPeriodLabel,
  tzOffsetHours,
  todayInOffset,
  isYMD,
  movementChips,
  topWorks,
  zeroAreaChildren,
  classSummary,
} from '@/lib/montree/reports/period-report-view';
import { AREA_ORDER, type AreaKey, type ChildAggregate, type PeriodAggregate } from '@/lib/montree/reports/period-types';

function emptyChild(id: string, name: string): ChildAggregate {
  const by_area = {} as ChildAggregate['by_area'];
  for (const a of AREA_ORDER) by_area[a] = { sessions: 0, minutes_est: 0, works: [], concentration: { wd: 0, wc: 0, dc: 0 }, photo_moments: 0 };
  const next_works = {} as ChildAggregate['next_works'];
  for (const a of AREA_ORDER) next_works[a] = null;
  return {
    child_id: id, name, by_area, transitions: [], status_counts: { presented: 0, practicing: 0, mastered: 0 },
    notes: { count: 0, snippets: [] }, top_area: null, total_sessions: 0, total_minutes_est: 0, next_works,
  };
}

function touch(c: ChildAggregate, area: AreaKey, work: string, sessions: number, minutes: number) {
  c.by_area[area].sessions += sessions;
  c.by_area[area].minutes_est += minutes;
  c.by_area[area].works.push({ work_key: null, work_name: work, sessions, minutes_est: minutes });
  c.total_sessions += sessions;
  c.total_minutes_est += minutes;
}

describe('heatIntensity', () => {
  it('is 0 for zero / negative / NaN values and for an empty max', () => {
    expect(heatIntensity(0, 10)).toBe(0);
    expect(heatIntensity(-1, 10)).toBe(0);
    expect(heatIntensity(NaN, 10)).toBe(0);
    expect(heatIntensity(3, 0)).toBe(0);
  });
  it('is 1 at the max and clamps above it', () => {
    expect(heatIntensity(10, 10)).toBe(1);
    expect(heatIntensity(50, 10)).toBe(1);
  });
  it('uses sqrt scaling with a visible floor so 1-of-20 never reads as empty', () => {
    expect(heatIntensity(5, 20)).toBeCloseTo(0.5, 5);
    expect(heatIntensity(1, 100)).toBe(MIN_VISIBLE_INTENSITY);
    expect(heatIntensity(2, 20)).toBeGreaterThan(heatIntensity(1, 20));
  });
  it('heatmapMax finds the largest cell and 0 for empty', () => {
    expect(heatmapMax([[0, 2], [7, 1]])).toBe(7);
    expect(heatmapMax([])).toBe(0);
  });
  it('hexToRgba expands 3- and 6-digit hex and clamps alpha', () => {
    expect(hexToRgba('#22c55e', 0.5)).toBe('rgba(34, 197, 94, 0.500)');
    expect(hexToRgba('#fff', 2)).toBe('rgba(255, 255, 255, 1.000)');
  });
});

describe('period navigation', () => {
  it('snaps to Monday / 1st', () => {
    expect(snapPeriodStart('week', '2026-08-22')).toBe('2026-08-17'); // Saturday → Monday
    expect(snapPeriodStart('week', '2026-08-17')).toBe('2026-08-17');
    expect(snapPeriodStart('week', '2026-08-23')).toBe('2026-08-17'); // Sunday belongs to the week before
    expect(snapPeriodStart('month', '2026-08-22')).toBe('2026-08-01');
  });
  it('shifts by whole periods, across month and year ends', () => {
    expect(shiftPeriodStart('week', '2026-08-17', 1)).toBe('2026-08-24');
    expect(shiftPeriodStart('week', '2026-08-17', -1)).toBe('2026-08-10');
    expect(shiftPeriodStart('month', '2026-12-01', 1)).toBe('2027-01-01');
    expect(shiftPeriodStart('month', '2026-01-01', -1)).toBe('2025-12-01');
  });
  it('labels a week inside one month, across months, and a month', () => {
    expect(formatPeriodLabel('week', '2026-08-17', '2026-08-23', 'en')).toBe('17–Aug 23, 2026');
    expect(formatPeriodLabel('week', '2026-08-31', '2026-09-06', 'en')).toMatch(/Aug 31 – Sep 6, 2026/);
    expect(formatPeriodLabel('month', '2026-08-01', '2026-08-31', 'en')).toBe('August 2026');
  });
  it('derives the UTC offset from an IANA zone and falls back to null', () => {
    const at = new Date('2026-08-22T03:00:00Z');
    expect(tzOffsetHours('Asia/Shanghai', at)).toBe(8);
    expect(tzOffsetHours('Africa/Johannesburg', at)).toBe(2);
    expect(tzOffsetHours('America/New_York', at)).toBe(-4);
    expect(tzOffsetHours('Not/AZone', at)).toBeNull();
    expect(tzOffsetHours(null, at)).toBeNull();
  });
  it('todayInOffset rolls the date in a positive offset', () => {
    expect(todayInOffset(8, new Date('2026-08-22T20:00:00Z'))).toBe('2026-08-23');
    expect(todayInOffset(0, new Date('2026-08-22T20:00:00Z'))).toBe('2026-08-22');
  });
  it('isYMD rejects junk', () => {
    expect(isYMD('2026-08-22')).toBe(true);
    expect(isYMD('22/08/2026')).toBe(false);
    expect(isYMD(null)).toBe(false);
  });
});

describe('card + summary helpers', () => {
  const a = emptyChild('a', 'Amy Lee');
  touch(a, 'language', 'Sandpaper Letters', 4, 60);
  touch(a, 'mathematics', 'Number Rods', 2, 30);
  touch(a, 'sensorial', 'Pink Tower', 1, 10);
  a.transitions = [
    { work_name: 'Pink Tower', work_key: null, area: 'sensorial', from: 'practicing', to: 'mastered', at: '2026-08-18T01:00:00Z' },
    { work_name: 'Number Rods', work_key: null, area: 'mathematics', from: null, to: 'presented', at: '2026-08-19T01:00:00Z' },
    { work_name: 'Pink Tower', work_key: null, area: 'sensorial', from: 'practicing', to: 'mastered', at: '2026-08-20T01:00:00Z' },
  ];
  const b = emptyChild('b', 'Ben');

  it('movementChips puts mastered first and de-duplicates', () => {
    const chips = movementChips(a);
    expect(chips.map((c) => `${c.work_name}:${c.to}`)).toEqual(['Pink Tower:mastered', 'Number Rods:presented']);
  });
  it('topWorks ranks by sessions across areas', () => {
    expect(topWorks(a, 2).map((w) => w.work_name)).toEqual(['Sandpaper Letters', 'Number Rods']);
  });
  it('zeroAreaChildren lists untouched areas; silent children get all five', () => {
    const flags = zeroAreaChildren({ children: [a, b] });
    expect(flags.find((f) => f.child_id === 'a')?.areas).toEqual(['practical_life', 'cultural']);
    expect(flags.find((f) => f.child_id === 'b')?.areas).toEqual([...AREA_ORDER]);
  });
  it('classSummary separates silent children from gaps', () => {
    const class_totals = {} as PeriodAggregate['class_totals'];
    for (const ar of AREA_ORDER) class_totals[ar] = { sessions: a.by_area[ar].sessions, minutes_est: a.by_area[ar].minutes_est, children_active: a.by_area[ar].sessions > 0 ? 1 : 0 };
    const agg: PeriodAggregate = {
      classroom_id: 'c', school_id: 's', period_type: 'week', period_start: '2026-08-17', period_end: '2026-08-23',
      generated_at: '2026-08-22T00:00:00Z', sources: { sessions: 'sessions', transitions: 'events', photos: 'none', notes: 'none' },
      areas: AREA_ORDER, children: [a, b], class_totals,
      class_mastered: [{ child_id: 'a', child_name: 'Amy Lee', work_name: 'Pink Tower', work_key: null, area: 'sensorial', at: '2026-08-18T01:00:00Z' }],
      heatmap: [[0, 1, 2, 4, 0], [0, 0, 0, 0, 0]], warnings: [],
    };
    const s = classSummary(agg);
    expect(s.total_sessions).toBe(7);
    expect(s.total_minutes_est).toBe(100);
    expect(s.mastered_count).toBe(1);
    expect(s.children_active).toBe(1);
    expect(s.children_silent).toBe(1);
    expect(s.gaps.map((g) => g.child_id)).toEqual(['a']);
  });
});
