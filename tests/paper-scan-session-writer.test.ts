// tests/paper-scan-session-writer.test.ts
//
// The frequency/time maths behind montree_observation_sessions (migration
// 336). These numbers are what every heatmap and every "where did the time go"
// line in the weekly report is built from, so the arithmetic is pinned here:
// a bucket is a midpoint, a tally multiplies it, an exact written time wins,
// and an unknown area produces NO row at all.

import { describe, it, expect } from 'vitest';
import {
  BUCKET_MINUTES,
  buildSessionRow,
  estimateMinutes,
  normaliseConcentration,
  normaliseFrequency,
  sessionOccurredOn,
} from '@/lib/montree/paper-scan/session-writer';

const SCAN = {
  id: 'scan-1',
  school_id: 'school-1',
  classroom_id: 'class-1',
  sheet_date: '2026-09-04',
  created_at: '2026-09-05T07:30:00.000Z',
};

function extraction(over: Record<string, unknown> = {}) {
  return {
    id: 'ext-1',
    child_id: 'child-1',
    work_key: 'pl_pouring',
    work_name: 'Pouring',
    work_name_raw: 'pouring',
    area: 'practical_life',
    frequency: null as number | null,
    time_bucket: null as string | null,
    concentration: null as string | null,
    time_minutes: null as number | null,
    note: null as string | null,
    teacher_final_note: null as string | null,
    ...over,
  };
}

describe('bucket → minutes', () => {
  it('uses the documented midpoints', () => {
    expect(BUCKET_MINUTES).toEqual({ short: 10, medium: 22, long: 40 });
  });

  it('multiplies the midpoint by the tally count', () => {
    expect(estimateMinutes({ timeBucket: 'short', frequency: 3 })).toBe(30);
    expect(estimateMinutes({ timeBucket: 'medium', frequency: 2 })).toBe(44);
    expect(estimateMinutes({ timeBucket: 'long', frequency: 1 })).toBe(40);
  });

  it('treats a missing tally as one session', () => {
    expect(estimateMinutes({ timeBucket: 'medium', frequency: null })).toBe(22);
    expect(estimateMinutes({ timeBucket: 'medium' })).toBe(22);
  });

  it('prefers an exact written time over the bucket', () => {
    expect(estimateMinutes({ timeMinutes: 25, timeBucket: 'long', frequency: 4 })).toBe(25);
  });

  it('is null when the sheet says nothing about time', () => {
    expect(estimateMinutes({ timeMinutes: null, timeBucket: null, frequency: 3 })).toBeNull();
    expect(estimateMinutes({ timeMinutes: 0, timeBucket: null })).toBeNull();
  });
});

describe('field normalisation', () => {
  it('floors frequency at one and rounds', () => {
    expect(normaliseFrequency(null)).toBe(1);
    expect(normaliseFrequency(0)).toBe(1);
    expect(normaliseFrequency(-4)).toBe(1);
    expect(normaliseFrequency(2.4)).toBe(2);
    expect(normaliseFrequency('3' as unknown as number)).toBe(1);
  });

  it('lower-cases concentration codes and rejects anything else', () => {
    expect(normaliseConcentration('DC')).toBe('dc');
    expect(normaliseConcentration('wc')).toBe('wc');
    expect(normaliseConcentration('deep')).toBeNull();
    expect(normaliseConcentration(null)).toBeNull();
  });

  it('dates a session by the sheet, not by the review', () => {
    expect(sessionOccurredOn('2026-09-04', '2026-09-05T07:30:00.000Z')).toBe('2026-09-04');
    expect(sessionOccurredOn(null, '2026-09-05T07:30:00.000Z')).toBe('2026-09-05');
    expect(sessionOccurredOn('  ', 'nonsense')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('buildSessionRow', () => {
  it('builds a complete row from a marked entry', () => {
    const { row, reason } = buildSessionRow({
      extraction: extraction({ frequency: 3, time_bucket: 'short', concentration: 'DC', note: 'chose it all morning' }),
      scan: SCAN,
      statusMark: 'practicing',
      actorId: 'teacher-1',
    });

    expect(reason).toBeNull();
    expect(row).toEqual({
      school_id: 'school-1',
      classroom_id: 'class-1',
      child_id: 'child-1',
      work_key: 'pl_pouring',
      work_name: 'Pouring',
      area: 'practical_life',
      occurred_on: '2026-09-04',
      frequency: 3,
      time_bucket: 'short',
      minutes_est: 30,
      concentration: 'dc',
      status_mark: 'practicing',
      source: 'paper_scan',
      scan_id: 'scan-1',
      extraction_id: 'ext-1',
      note: 'chose it all morning',
      created_by: 'teacher-1',
    });
  });

  it('carries extraction_id so a re-commit can be de-duplicated', () => {
    const { row } = buildSessionRow({ extraction: extraction(), scan: SCAN });
    expect(row?.extraction_id).toBe('ext-1');
  });

  it('refuses to guess an area — no area, no row', () => {
    const { row, reason } = buildSessionRow({ extraction: extraction({ area: null }), scan: SCAN });
    expect(row).toBeNull();
    expect(reason).toBe('no_area');
  });

  it('takes the area the review supplied over the extracted one', () => {
    const { row } = buildSessionRow({
      extraction: extraction({ area: null }),
      scan: SCAN,
      area: 'mathematics',
    });
    expect(row?.area).toBe('mathematics');
  });

  it('skips rows with no child and rows with no work', () => {
    expect(buildSessionRow({ extraction: extraction({ child_id: null }), scan: SCAN }).reason).toBe('no_child');
    expect(
      buildSessionRow({ extraction: extraction({ work_name: null, work_name_raw: '  ' }), scan: SCAN }).reason,
    ).toBe('no_work');
  });

  it('prefers the teacher note and drops an invalid status mark', () => {
    const { row } = buildSessionRow({
      extraction: extraction({ note: 'model note', teacher_final_note: 'teacher note' }),
      scan: SCAN,
      statusMark: 'brilliant',
    });
    expect(row?.note).toBe('teacher note');
    expect(row?.status_mark).toBeNull();
  });

  it('defaults frequency to one and leaves minutes unknown when nothing is marked', () => {
    const { row } = buildSessionRow({ extraction: extraction(), scan: SCAN });
    expect(row?.frequency).toBe(1);
    expect(row?.minutes_est).toBeNull();
    expect(row?.time_bucket).toBeNull();
  });
});
