// tests/guidance/replan-parity.test.ts
//
// THE REGRESSION THAT MATTERS: the weekly replan must put on the shelf
// exactly what the engine says, in every area. If replan-child ever grows a
// second opinion again — its own advance loop, a scorer, an LLM — this test
// fails.
//
// No Supabase, no Anthropic: a recording stub for both.

import { describe, expect, it } from 'vitest';
import { replanChildInProcess } from '@/lib/montree/reports/replan-child';
import { nextWorks } from '@/lib/montree/tracking/guidance';
import type { Ledger, ProgressEvent, Status } from '@/lib/montree/tracking/types';

const CLASSROOM = 'class-1';
const CHILD = 'kid';
const OLD = '2020-01-01T09:00:00.000Z';

const AREAS = [
  { id: 'a-pl', area_key: 'practical_life' },
  { id: 'a-se', area_key: 'sensorial' },
  { id: 'a-ma', area_key: 'mathematics' },
  { id: 'a-la', area_key: 'language' },
  { id: 'a-cu', area_key: 'cultural' },
];

interface WorkRow {
  work_key: string;
  name: string;
  name_chinese: string | null;
  sequence: number;
  area_id: string;
  is_active: boolean;
}

const WORKS: WorkRow[] = [
  { work_key: 'pl:1', name: 'Pouring water', sequence: 10, area_id: 'a-pl' },
  { work_key: 'pl:2', name: 'Spooning beans', sequence: 20, area_id: 'a-pl' },
  { work_key: 'pl:3', name: 'Buttoning frame', sequence: 30, area_id: 'a-pl' },
  { work_key: 'se:1', name: 'Pink tower', sequence: 10, area_id: 'a-se' },
  { work_key: 'se:2', name: 'Brown stair', sequence: 20, area_id: 'a-se' },
  { work_key: 'ma:1', name: 'Number rods', sequence: 10, area_id: 'a-ma' },
  { work_key: 'ma:2', name: 'Sandpaper numerals', sequence: 20, area_id: 'a-ma' },
  { work_key: 'ma:3', name: 'Spindle box', sequence: 30, area_id: 'a-ma' },
  ...[1, 2, 3, 4, 5].map((n) => ({
    work_key: `dp:s:${n}`,
    name: `s Dark Phonics work ${n}`,
    sequence: n,
    area_id: 'a-la',
  })),
  { work_key: 'cu:1', name: 'Land and water forms', sequence: 10, area_id: 'a-cu' },
  { work_key: 'cu:2', name: 'Continent map', sequence: 20, area_id: 'a-cu' },
  { work_key: 'cu:3', name: 'Parts of a flower', sequence: 30, area_id: 'a-cu' },
].map((w) => ({ name_chinese: null, is_active: true, ...w })) as WorkRow[];

const RECENT = new Date(Date.now() - 2 * 86400000).toISOString();

const PROGRESS = [
  { child_id: CHILD, work_key: 'pl:1', work_name: 'Pouring water', area: 'practical_life', status: 'mastered', updated_at: OLD },
  { child_id: CHILD, work_key: 'ma:2', work_name: 'Sandpaper numerals', area: 'mathematics', status: 'practicing', updated_at: RECENT },
  ...[1, 2, 3].map((n) => ({
    child_id: CHILD,
    work_key: `dp:s:${n}`,
    work_name: `s Dark Phonics work ${n}`,
    area: 'language',
    status: 'mastered',
    updated_at: OLD,
  })),
  { child_id: CHILD, work_key: 'cu:3', work_name: 'Parts of a flower', area: 'cultural', status: 'mastered', updated_at: OLD },
];

const SHELF = [
  { child_id: CHILD, area: 'practical_life', work_name: 'Pouring water' },
  { child_id: CHILD, area: 'language', work_name: 's Dark Phonics work 3' },
];

// ── stubs ────────────────────────────────────────────────────────────────

function makeSupabase(upserts: Record<string, unknown>[], shelf: typeof SHELF = SHELF) {
  const tables: Record<string, unknown[]> = {
    montree_children: [{ id: CHILD, name: 'Kid', settings: null, classroom_id: CLASSROOM, is_active: true }],
    montree_child_mental_profiles: [],
    montree_child_progress: PROGRESS,
    montree_teacher_notes: [],
    montree_classroom_curriculum_areas: AREAS,
    montree_classroom_curriculum_works: WORKS,
    montree_child_focus_works: shelf,
    montree_progress_events: [],
    montree_class_dark_phonics_week: [],
  };

  const from = (table: string) => {
    const rows = tables[table] || [];
    const b: Record<string, unknown> = {};
    const self = () => b;
    for (const m of ['select', 'eq', 'in', 'neq', 'not', 'or', 'order', 'limit', 'range', 'gte', 'lt', 'lte', 'gt', 'insert', 'update', 'delete']) {
      b[m] = self;
    }
    b.upsert = (payload: Record<string, unknown> | Record<string, unknown>[]) => {
      if (table === 'montree_child_focus_works') {
        upserts.push(...(Array.isArray(payload) ? payload : [payload]));
      }
      return b;
    };
    b.maybeSingle = async () => ({ data: rows[0] ?? null, error: null });
    b.single = async () => ({ data: rows[0] ?? null, error: null });
    b.then = (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(ok, err);
    return b;
  };

  return { from } as never;
}

const anthropic = {
  messages: { create: async () => { throw new Error('no AI in tests'); } },
} as never;

/** The same Ledger loadGuidanceLedger would build from those tables. */
function expectedLedger(asOf: string): Ledger {
  const areaKey = new Map(AREAS.map((a) => [a.id, a.area_key]));
  const events: ProgressEvent[] = PROGRESS.map((p) => ({
    child_id: p.child_id,
    classroom_id: null,
    work_key: p.work_key,
    work_name: p.work_name,
    area: p.area,
    old_status: null,
    new_status: p.status as Status,
    source: 'import',
    actor: 'cache:montree_child_progress',
    created_at: p.updated_at,
    reason: null,
    evidence_id: null,
  }));
  return {
    events,
    works: WORKS.map((w) => ({
      work_key: w.work_key,
      name: w.name,
      area: areaKey.get(w.area_id) ?? 'language',
      sequence: w.sequence,
    })),
    children: [{ id: CHILD, name: 'Kid', pronoun: 'they' }],
    classWeekLetter: '',
    weekStarts: [asOf.slice(0, 10)],
  };
}

async function runReplan(shelf: typeof SHELF = SHELF) {
  const upserts: Record<string, unknown>[] = [];
  const result = await replanChildInProcess({
    childId: CHILD,
    childName: 'Kid',
    classroomId: CLASSROOM,
    schoolId: 'school-1',
    locale: 'en',
    anthropic,
    model: 'test-model',
    supabase: makeSupabase(upserts, shelf),
  });
  return { result, upserts };
}

// ── the test ─────────────────────────────────────────────────────────────

describe('replan-child ↔ guidance parity', () => {
  it('puts exactly what the engine chose on the shelf, in every area', async () => {
    const { result } = await runReplan();
    const guidance = nextWorks(expectedLedger(new Date().toISOString()), CHILD, {
      asOf: new Date().toISOString(),
      areas: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'],
      includeTracks: false,
    });
    const expected = guidance.filter((g) => g.next).map((g) => g.next!.name);

    expect(result.replanned).toBe(true);
    expect(result.works).toEqual(expected);
  });

  it('advances a mastered slot, keeps a practising one and closes a gap', async () => {
    const { result } = await runReplan();
    expect(result.works).toEqual([
      'Spooning beans',            // pl:1 mastered → next in sequence
      'Pink tower',                // empty area → first work
      'Sandpaper numerals',        // practicing → continue, nothing new on top
      's Dark Phonics work 4',     // ribbon: 1-3 mastered, next is 4 (not 'a')
      'Land and water forms',      // cu:3 mastered with cu:1 untouched → gap below
    ]);
  });

  it('only writes the areas whose shelf actually changed', async () => {
    const { upserts } = await runReplan();
    const areas = upserts.map((u) => u.area).sort();
    // practical_life + language moved; sensorial/mathematics/cultural were empty.
    expect(areas).toEqual(['cultural', 'language', 'mathematics', 'practical_life', 'sensorial']);
    const language = upserts.find((u) => u.area === 'language');
    expect(language?.work_name).toBe('s Dark Phonics work 4');
    expect(language?.set_by).toBe('weekly_wrap_advance');
  });

  it('leaves a shelf row alone when it already IS the engine\'s choice', async () => {
    const { result, upserts } = await runReplan([
      ...SHELF,
      { child_id: CHILD, area: 'mathematics', work_name: 'Sandpaper numerals' },
    ]);
    expect(result.works).toContain('Sandpaper numerals');
    expect(upserts.some((u) => u.area === 'mathematics')).toBe(false);
  });

  it('never leaves an area on a work the engine says is mastered', async () => {
    const { result } = await runReplan();
    expect(result.works).not.toContain('Pouring water');
    expect(result.works).not.toContain('Parts of a flower');
  });
});
