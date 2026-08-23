// tests/period-aggregator.test.ts
//
// aggregatePeriod() is the one object every all-areas report (heatmap, child
// cards, docx/pptx, weekly-wrap) reads. It is pure data over a Supabase client,
// so it is driven here with a stub client: table → rows (or an error), with
// .range() pagination honoured and every filter recorded. No database.
//
// The three things that must never regress:
//   1. A missing table (336 / 314 not pasted yet) is a warning, not a throw.
//   2. Transitions come from the events journal when it speaks, and from
//      montree_child_progress stamps when it does not.
//   3. Legacy approved extractions feed the heatmap ONLY when there are no
//      observation_sessions for the range (Work Rhythm parity).

import { describe, it, expect } from 'vitest';
import {
  aggregatePeriod,
  computePeriodBounds,
  estimateSessionMinutes,
  BUCKET_MINUTES,
  UNTIMED_SESSION_MINUTES,
  type PeriodAggregate,
} from '@/lib/montree/reports/period-aggregator';
import type { UntypedClient } from '@/lib/supabase-client';

// ───────────────────────── stub supabase ─────────────────────────

type Row = Record<string, unknown>;
type TableSpec = Row[] | { error: { code?: string; message: string } };

interface Call { table: string; filters: Array<[string, ...unknown[]]> }

function stubClient(tables: Record<string, TableSpec>, calls: Call[] = []): UntypedClient {
  const from = (table: string) => {
    const call: Call = { table, filters: [] };
    calls.push(call);
    let range: [number, number] | null = null;
    const builder: Record<string, unknown> = {};
    const chain = (name: string) => {
      builder[name] = (...args: unknown[]) => {
        call.filters.push([name, ...args]);
        if (name === 'range') range = [args[0] as number, args[1] as number];
        return builder;
      };
    };
    for (const m of ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'lt', 'not', 'or', 'order', 'limit', 'range']) chain(m);
    builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
      const spec = tables[table];
      let result: { data: Row[] | null; error: unknown };
      if (!spec) {
        result = { data: null, error: { code: '42P01', message: `relation "${table}" does not exist` } };
      } else if (!Array.isArray(spec)) {
        result = { data: null, error: spec.error };
      } else {
        const r = range as [number, number] | null;
        result = { data: r ? spec.slice(r[0], r[1] + 1) : spec, error: null };
      }
      return Promise.resolve(result).then(resolve, reject);
    };
    return builder;
  };
  return { from } as unknown as UntypedClient;
}

const CLASS = 'class-1';
const ROSTER = [
  { id: 'c-amy', name: 'Amy' },
  { id: 'c-ben', name: 'Ben' },
];

const BASE = { classroomId: CLASS, schoolId: 'school-1', periodType: 'week' as const, periodStart: '2026-09-07' };

function areaOf(agg: PeriodAggregate, childId: string, area: string) {
  const child = agg.children.find((c) => c.child_id === childId);
  if (!child) throw new Error(`no child ${childId}`);
  return child.by_area[area as keyof typeof child.by_area];
}

// ───────────────────────── bounds & maths ─────────────────────────

describe('computePeriodBounds', () => {
  it('snaps a mid-week anchor to Monday..Sunday', () => {
    expect(computePeriodBounds('week', '2026-09-09')).toEqual({ start: '2026-09-07', end: '2026-09-13' });
    expect(computePeriodBounds('week', '2026-09-07')).toEqual({ start: '2026-09-07', end: '2026-09-13' });
    expect(computePeriodBounds('week', '2026-09-13')).toEqual({ start: '2026-09-07', end: '2026-09-13' });
  });

  it('honours weekStartsOn and crosses month/year edges', () => {
    expect(computePeriodBounds('week', '2026-09-09', 0)).toEqual({ start: '2026-09-06', end: '2026-09-12' });
    expect(computePeriodBounds('week', '2027-01-01')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
  });

  it('month = first..last day, leap-year aware', () => {
    expect(computePeriodBounds('month', '2026-09-15')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(computePeriodBounds('month', '2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });

  it('rejects garbage', () => {
    expect(() => computePeriodBounds('week', 'next tuesday')).toThrow(/invalid date/);
  });
});

describe('estimateSessionMinutes', () => {
  it('exact minutes win, then bucket × frequency, then the untimed default', () => {
    expect(estimateSessionMinutes(25, 'long', 3)).toBe(25);
    expect(estimateSessionMinutes(null, 'medium', 2)).toBe(BUCKET_MINUTES.medium * 2);
    expect(estimateSessionMinutes(null, null, 1)).toBe(UNTIMED_SESSION_MINUTES);
    expect(estimateSessionMinutes(0, 'short', 0)).toBe(BUCKET_MINUTES.short);
  });
});

// ───────────────────────── sessions → heatmap ─────────────────────────

describe('aggregatePeriod — sessions', () => {
  const sessions = [
    { child_id: 'c-amy', work_key: 'pouring', work_name: 'Pouring', area: 'practical_life', occurred_on: '2026-09-07', frequency: 3, time_bucket: 'short', minutes_est: null, concentration: 'dc', status_mark: 'practicing' },
    { child_id: 'c-amy', work_key: 'pouring', work_name: 'Pouring', area: 'practical_life', occurred_on: '2026-09-09', frequency: 1, time_bucket: null, minutes_est: 20, concentration: 'wc', status_mark: null },
    { child_id: 'c-amy', work_key: null, work_name: 'Pink Tower', area: 'sensorial', occurred_on: '2026-09-10', frequency: 1, time_bucket: 'long', minutes_est: null, concentration: null, status_mark: null },
    { child_id: 'c-ben', work_key: 'spindles', work_name: 'Spindle Boxes', area: 'math', occurred_on: '2026-09-08', frequency: 2, time_bucket: 'medium', minutes_est: null, concentration: 'wd', status_mark: null },
    // dropped: unknown area, departed child
    { child_id: 'c-ben', work_key: null, work_name: 'Mystery', area: 'special_events', occurred_on: '2026-09-08', frequency: 1, time_bucket: null, minutes_est: null, concentration: null, status_mark: null },
    { child_id: 'c-gone', work_key: null, work_name: 'Pouring', area: 'practical_life', occurred_on: '2026-09-08', frequency: 9, time_bucket: null, minutes_est: null, concentration: null, status_mark: null },
  ];

  it('builds per-child × area counts, works, concentration and the heatmap', async () => {
    const calls: Call[] = [];
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_observation_sessions: sessions, montree_child_progress: [], montree_progress_events: [], montree_behavioral_observations: [], montree_classroom_curriculum_works: [], montree_media: [] }, calls),
      BASE,
    );

    expect(agg.period_start).toBe('2026-09-07');
    expect(agg.period_end).toBe('2026-09-13');
    expect(agg.sources.sessions).toBe('sessions');
    expect(agg.warnings).toEqual([]);

    const pl = areaOf(agg, 'c-amy', 'practical_life');
    expect(pl.sessions).toBe(4);
    expect(pl.minutes_est).toBe(3 * BUCKET_MINUTES.short + 20);
    expect(pl.works).toEqual([{ work_key: 'pouring', work_name: 'Pouring', sessions: 4, minutes_est: 50 }]);
    expect(pl.concentration).toEqual({ wd: 0, wc: 1, dc: 1 });

    expect(areaOf(agg, 'c-amy', 'sensorial').minutes_est).toBe(BUCKET_MINUTES.long);
    // 'math' alias → mathematics
    expect(areaOf(agg, 'c-ben', 'mathematics').sessions).toBe(2);
    expect(areaOf(agg, 'c-ben', 'mathematics').concentration.wd).toBe(1);

    // heatmap rows follow children order, columns follow areas order
    expect(agg.areas).toEqual(['practical_life', 'sensorial', 'mathematics', 'language', 'cultural']);
    expect(agg.heatmap).toEqual([
      [4, 1, 0, 0, 0],
      [0, 0, 2, 0, 0],
    ]);

    const amy = agg.children[0];
    expect(amy.top_area).toBe('practical_life');
    expect(amy.total_sessions).toBe(5);
    expect(amy.total_minutes_est).toBe(50 + 40);

    expect(agg.class_totals.practical_life).toEqual({ sessions: 4, minutes_est: 50, children_active: 1 });
    expect(agg.class_totals.language).toEqual({ sessions: 0, minutes_est: 0, children_active: 0 });

    // scoped to classroom + date range on occurred_on
    const sessCall = calls.find((c) => c.table === 'montree_observation_sessions');
    expect(sessCall?.filters).toContainEqual(['eq', 'classroom_id', CLASS]);
    expect(sessCall?.filters).toContainEqual(['gte', 'occurred_on', '2026-09-07']);
    expect(sessCall?.filters).toContainEqual(['lte', 'occurred_on', '2026-09-13']);
    // legacy extractions NOT consulted when sessions exist
    expect(calls.some((c) => c.table === 'montree_paper_scan_extractions')).toBe(false);
  });

  it('paginates past the 1000-row cap', async () => {
    const many = Array.from({ length: 1503 }, (_, i) => ({
      child_id: i % 2 ? 'c-amy' : 'c-ben', work_key: null, work_name: `W${i % 7}`, area: 'language', occurred_on: '2026-09-08', frequency: 1, time_bucket: null, minutes_est: null, concentration: null, status_mark: null,
    }));
    const agg = await aggregatePeriod(stubClient({ montree_children: ROSTER, montree_observation_sessions: many, montree_child_progress: [] }), { ...BASE, includePhotos: false });
    expect(agg.class_totals.language.sessions).toBe(1503);
  });
});

// ───────────────────────── missing tables ─────────────────────────

describe('aggregatePeriod — migrations not applied', () => {
  it('returns an empty aggregate with warnings when every new table is missing', async () => {
    const agg = await aggregatePeriod(stubClient({ montree_children: ROSTER }), BASE);

    expect(agg.children).toHaveLength(2);
    expect(agg.heatmap).toEqual([[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]);
    expect(agg.sources).toEqual({ sessions: 'none', transitions: 'none', photos: 'none', notes: 'none' });
    expect(agg.class_mastered).toEqual([]);
    expect(agg.warnings.some((w) => w.startsWith('montree_observation_sessions:') && w.includes('missing'))).toBe(true);
    expect(agg.warnings.some((w) => w.startsWith('montree_progress_events:') && w.includes('missing'))).toBe(true);
    expect(agg.warnings.some((w) => w.startsWith('montree_paper_scan_extractions:'))).toBe(true);
    for (const child of agg.children) {
      expect(child.next_works).toEqual({ practical_life: null, sensorial: null, mathematics: null, language: null, cultural: null });
      expect(child.notes).toEqual({ count: 0, snippets: [] });
    }
  });

  it('recognises PostgREST schema-cache misses as missing relations', async () => {
    const agg = await aggregatePeriod(
      stubClient({
        montree_children: ROSTER,
        montree_observation_sessions: { error: { code: 'PGRST205', message: "Could not find the table 'public.montree_observation_sessions' in the schema cache" } },
      }),
      { ...BASE, includePhotos: false },
    );
    expect(agg.warnings.find((w) => w.startsWith('montree_observation_sessions:'))).toMatch(/missing/);
  });

  it('reports other query errors without throwing', async () => {
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_observation_sessions: { error: { code: '57014', message: 'canceling statement due to statement timeout' } } }),
      { ...BASE, includePhotos: false },
    );
    expect(agg.warnings.find((w) => w.startsWith('montree_observation_sessions:'))).toMatch(/query failed/);
    expect(agg.sources.sessions).toBe('none');
  });

  it('an empty roster still yields a well-formed aggregate', async () => {
    const agg = await aggregatePeriod(stubClient({ montree_children: [] }), BASE);
    expect(agg.children).toEqual([]);
    expect(agg.heatmap).toEqual([]);
  });
});

// ───────────────────────── transitions ─────────────────────────

describe('aggregatePeriod — transitions', () => {
  const progress = [
    // mastered in range (via fallback); presented long ago
    { child_id: 'c-amy', work_key: 'pouring', work_name: 'Pouring', area: 'practical_life', status: 'mastered', presented_at: '2026-03-01T02:00:00Z', mastered_at: '2026-09-08T03:00:00Z', updated_at: '2026-09-08T03:00:00Z' },
    // presented in range
    { child_id: 'c-amy', work_key: null, work_name: 'Pink Tower', area: 'sensorial', status: 'presented', presented_at: '2026-09-10T01:00:00Z', mastered_at: null, updated_at: '2026-09-10T01:00:00Z' },
    // moved to practicing in range (presented earlier)
    { child_id: 'c-ben', work_key: 'spindles', work_name: 'Spindle Boxes', area: 'mathematics', status: 'practicing', presented_at: '2026-08-20T01:00:00Z', mastered_at: null, updated_at: '2026-09-09T01:00:00Z' },
    // untouched this week
    { child_id: 'c-ben', work_key: null, work_name: 'Sandpaper Letters', area: 'language', status: 'practicing', presented_at: '2026-08-01T01:00:00Z', mastered_at: null, updated_at: '2026-08-15T01:00:00Z' },
  ];

  it('uses the events journal when it has rows', async () => {
    const events = [
      { child_id: 'c-amy', work_key: 'pouring', work_name: 'Pouring', area: 'practical_life', old_status: 'practicing', new_status: 'mastered', created_at: '2026-09-08T03:00:00Z' },
      { child_id: 'c-ben', work_key: 'spindles', work_name: 'Spindle Boxes', area: 'mathematics', old_status: 'presented', new_status: 'practicing', created_at: '2026-09-09T01:00:00Z' },
      { child_id: 'c-ben', work_key: null, work_name: 'Bogus', area: 'language', old_status: null, new_status: 'not_started', created_at: '2026-09-09T01:00:00Z' },
    ];
    const calls: Call[] = [];
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_observation_sessions: [], montree_child_progress: progress, montree_progress_events: events }, calls),
      { ...BASE, includePhotos: false },
    );

    expect(agg.sources.transitions).toBe('events');
    expect(agg.children[0].transitions).toEqual([
      { work_name: 'Pouring', work_key: 'pouring', area: 'practical_life', from: 'practicing', to: 'mastered', at: '2026-09-08T03:00:00Z' },
    ]);
    expect(agg.children[0].status_counts).toEqual({ presented: 0, practicing: 0, mastered: 1 });
    expect(agg.children[1].transitions).toHaveLength(1); // 'not_started' dropped
    expect(agg.children[1].status_counts.practicing).toBe(1);
    expect(agg.class_mastered).toEqual([
      { child_id: 'c-amy', child_name: 'Amy', work_name: 'Pouring', work_key: 'pouring', area: 'practical_life', at: '2026-09-08T03:00:00Z' },
    ]);

    const ev = calls.find((c) => c.table === 'montree_progress_events');
    expect(ev?.filters).toContainEqual(['gte', 'created_at', '2026-09-07T00:00:00.000Z']);
    expect(ev?.filters).toContainEqual(['lt', 'created_at', '2026-09-14T00:00:00.000Z']);
  });

  it('falls back to montree_child_progress stamps when the journal is missing', async () => {
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_observation_sessions: [], montree_child_progress: progress }),
      { ...BASE, includePhotos: false },
    );

    expect(agg.sources.transitions).toBe('progress_fallback');
    const amy = agg.children[0];
    expect(amy.transitions.map((t) => [t.work_name, t.to])).toEqual([
      ['Pouring', 'mastered'],
      ['Pink Tower', 'presented'],
    ]);
    const ben = agg.children[1];
    expect(ben.transitions.map((t) => [t.work_name, t.to])).toEqual([['Spindle Boxes', 'practicing']]);
    expect(agg.class_mastered.map((m) => m.work_name)).toEqual(['Pouring']);
  });

  it('falls back when the journal exists but is silent for the range', async () => {
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_observation_sessions: [], montree_child_progress: progress, montree_progress_events: [] }),
      { ...BASE, includePhotos: false },
    );
    expect(agg.sources.transitions).toBe('progress_fallback');
    expect(agg.children[0].status_counts.mastered).toBe(1);
  });

  it('shifts timestamp filters by utcOffsetHours', async () => {
    const calls: Call[] = [];
    await aggregatePeriod(stubClient({ montree_children: ROSTER, montree_progress_events: [] }, calls), { ...BASE, utcOffsetHours: 8, includePhotos: false });
    const ev = calls.find((c) => c.table === 'montree_progress_events');
    expect(ev?.filters).toContainEqual(['gte', 'created_at', '2026-09-06T16:00:00.000Z']);
    expect(ev?.filters).toContainEqual(['lt', 'created_at', '2026-09-13T16:00:00.000Z']);
  });
});

// ───────────────────────── legacy extractions ─────────────────────────

describe('aggregatePeriod — legacy extraction fallback', () => {
  const extractions = [
    { id: 'x1', child_id: 'c-amy', work_key: null, work_name: 'Pouring', work_name_raw: 'pouring', area: 'practical_life', time_minutes: 25, created_at: '2026-09-08T05:00:00Z', scan: { sheet_date: '2026-09-08' } },
    { id: 'x2', child_id: 'c-amy', work_key: null, work_name: null, work_name_raw: 'Brown Stair', area: 'sensorial', time_minutes: null, created_at: '2026-09-09T05:00:00Z', scan: null },
    // sheet dated outside the period although scanned inside it
    { id: 'x3', child_id: 'c-ben', work_key: null, work_name: 'Spindles', work_name_raw: null, area: 'mathematics', time_minutes: 10, created_at: '2026-09-08T05:00:00Z', scan: [{ sheet_date: '2026-09-04' }] },
  ];

  it('feeds the heatmap from approved extractions only when sessions are empty', async () => {
    const calls: Call[] = [];
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_observation_sessions: [], montree_paper_scan_extractions: extractions, montree_child_progress: [] }, calls),
      { ...BASE, includePhotos: false },
    );

    expect(agg.sources.sessions).toBe('legacy_extractions');
    expect(areaOf(agg, 'c-amy', 'practical_life')).toMatchObject({ sessions: 1, minutes_est: 25 });
    expect(areaOf(agg, 'c-amy', 'sensorial')).toMatchObject({ sessions: 1, minutes_est: UNTIMED_SESSION_MINUTES });
    expect(areaOf(agg, 'c-amy', 'sensorial').works[0].work_name).toBe('Brown Stair');
    expect(areaOf(agg, 'c-ben', 'mathematics').sessions).toBe(0);

    const legacy = calls.find((c) => c.table === 'montree_paper_scan_extractions');
    expect(legacy?.filters).toContainEqual(['in', 'review_status', ['approved', 'edited']]);
  });

  it('is also used when montree_observation_sessions does not exist yet', async () => {
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_paper_scan_extractions: extractions, montree_child_progress: [] }),
      { ...BASE, includePhotos: false },
    );
    expect(agg.sources.sessions).toBe('legacy_extractions');
    expect(agg.warnings.some((w) => w.startsWith('montree_observation_sessions:'))).toBe(true);
  });
});

// ───────────────────────── notes, photos, next works ─────────────────────────

describe('aggregatePeriod — notes, photos, next works', () => {
  it('counts notes and keeps the last 3 snippets, truncated', async () => {
    const long = 'x'.repeat(200);
    const obs = [
      { child_id: 'c-amy', behavior_description: 'Fourth (newest)', observed_at: '2026-09-11T01:00:00Z' },
      { child_id: 'c-amy', behavior_description: long, observed_at: '2026-09-10T01:00:00Z' },
      { child_id: 'c-amy', behavior_description: 'Second', observed_at: '2026-09-09T01:00:00Z' },
      { child_id: 'c-amy', behavior_description: 'First (oldest)', observed_at: '2026-09-08T01:00:00Z' },
      { child_id: 'c-gone', behavior_description: 'ignored', observed_at: '2026-09-08T01:00:00Z' },
    ];
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_observation_sessions: [], montree_child_progress: [], montree_behavioral_observations: obs }),
      { ...BASE, includePhotos: false },
    );
    expect(agg.sources.notes).toBe('observations');
    const amy = agg.children[0];
    expect(amy.notes.count).toBe(4);
    expect(amy.notes.snippets).toHaveLength(3);
    expect(amy.notes.snippets[0]).toBe('Fourth (newest)');
    expect(amy.notes.snippets[1]).toHaveLength(140);
    expect(amy.notes.snippets[1].endsWith('…')).toBe(true);
    expect(agg.children[1].notes).toEqual({ count: 0, snippets: [] });
  });

  it('counts confirmed photos as photo_moments via the work→area hop, never as minutes', async () => {
    const works = [
      { id: 'w-pt', name: 'Pink Tower', sequence: 0, area: { area_key: 'sensorial' } },
      { id: 'w-bs', name: 'Brown Stair', sequence: 1, area: [{ area_key: 'sensorial' }] },
      { id: 'w-na', name: 'Nowhere', sequence: 2, area: null },
    ];
    const media = [
      { id: 'm1', child_id: 'c-amy', work_id: 'w-pt' },
      { id: 'm2', child_id: null, work_id: 'w-bs' }, // group photo, linked via junction
      { id: 'm3', child_id: 'c-ben', work_id: 'w-na' }, // unresolvable area → dropped
    ];
    const junction = [
      { media_id: 'm2', child_id: 'c-amy' },
      { media_id: 'm2', child_id: 'c-ben' },
      { media_id: 'm1', child_id: 'c-amy' }, // duplicate of the direct link → counted once
    ];
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_observation_sessions: [], montree_child_progress: [], montree_classroom_curriculum_works: works, montree_media: media, montree_media_children: junction }),
      BASE,
    );
    expect(agg.sources.photos).toBe('media');
    expect(areaOf(agg, 'c-amy', 'sensorial').photo_moments).toBe(2);
    expect(areaOf(agg, 'c-ben', 'sensorial').photo_moments).toBe(1);
    expect(areaOf(agg, 'c-amy', 'sensorial').minutes_est).toBe(0);
    expect(areaOf(agg, 'c-amy', 'sensorial').sessions).toBe(0);
  });

  it('recommends the next untouched curriculum work per area', async () => {
    const works = [
      { id: 'w1', name: 'Pouring', sequence: 0, area: { area_key: 'practical_life' } },
      { id: 'w2', name: 'Spooning', sequence: 1, area: { area_key: 'practical_life' } },
      { id: 'w3', name: 'Tweezing', sequence: 2, area: { area_key: 'practical_life' } },
      { id: 'w4', name: 'Pink Tower', sequence: 0, area: { area_key: 'sensorial' } },
    ];
    const progress = [
      { child_id: 'c-amy', work_key: null, work_name: 'pouring', area: 'practical_life', status: 'mastered', presented_at: null, mastered_at: null, updated_at: null },
    ];
    const sessions = [
      { child_id: 'c-ben', work_key: null, work_name: 'Spooning', area: 'practical_life', occurred_on: '2026-09-08', frequency: 1, time_bucket: null, minutes_est: null, concentration: null, status_mark: null },
    ];
    const agg = await aggregatePeriod(
      stubClient({ montree_children: ROSTER, montree_observation_sessions: sessions, montree_child_progress: progress, montree_classroom_curriculum_works: works }),
      { ...BASE, includePhotos: false },
    );
    expect(agg.children[0].next_works.practical_life).toBe('Spooning');
    expect(agg.children[0].next_works.sensorial).toBe('Pink Tower');
    expect(agg.children[0].next_works.language).toBeNull();
    expect(agg.children[1].next_works.practical_life).toBe('Tweezing');
  });
});
