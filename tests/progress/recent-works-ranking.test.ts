// tests/progress/recent-works-ranking.test.ts
//
// The "Suggested" chip row in the "This is…" sheet, asserted as behaviour.
//
// After AI photo recognition was retired (2026-09-17), this row is how a
// teacher tags a photo in one tap during wrap-up. What it shows is therefore a
// product decision, not an implementation detail, so the decision lives in a
// pure module (lib/montree/progress/rank-suggestions.ts) and is proved here
// without a database: the route only supplies rows.
//
// The promises under test:
//   1. the works THIS child has been tagged with most often come first;
//   2. equal counts are broken by "most recently", not by insertion order;
//   3. the classroom tops up the 'all' row ONLY when the child has fewer than
//      three works of their own (rule: their history beats the room's);
//   4. an area pill NEVER opens on an empty row while that area's shelf has
//      works — classroom first, then the shelf in its own order;
//   5. eight chips, ever, and nothing that is not live curriculum.

import { describe, it, expect } from 'vitest';
import {
  ALL_AREA_KEY,
  CHILD_MIN_BEFORE_CLASSROOM,
  SUGGESTION_LIMIT,
  buildAreaBuckets,
  rankSuggestions,
  tallyEvents,
  type SuggestionEvent,
  type SuggestionWork,
} from '@/lib/montree/progress/rank-suggestions';

// ── Fixtures ────────────────────────────────────────────────────────────────

function work(id: string, name: string, area: string, sequence: number): SuggestionWork {
  return { id, work_key: `k:${id}`, name, area_key: area, area_label: area, sequence };
}

/** Days ago, as the journal writes it. */
function at(days: number): string {
  return new Date(Date.UTC(2026, 8, 17, 9, 0, 0) - days * 86400_000).toISOString();
}

function ev(w: SuggestionWork, days: number): SuggestionEvent {
  return { work_key: w.work_key, work_name: w.name, created_at: at(days) };
}

const POURING = work('w1', 'Pouring', 'practical_life', 1);
const SPOONING = work('w2', 'Spooning', 'practical_life', 2);
const BUTTONS = work('w3', 'Buttoning Frame', 'practical_life', 3);
const TOWER = work('w4', 'Pink Tower', 'sensorial', 1);
const CYLINDERS = work('w5', 'Knobbed Cylinders', 'sensorial', 2);
const BEADS = work('w6', 'Golden Beads', 'mathematics', 1);
const SANDPAPER = work('w7', 'Sandpaper Letters', 'language', 1);

const WORKS = [POURING, SPOONING, BUTTONS, TOWER, CYLINDERS, BEADS, SANDPAPER];
const AREA_KEYS = ['practical_life', 'sensorial', 'mathematics', 'language'];

const NO_TALLY = new Map();

function names(rows: { name: string }[]): string[] {
  return rows.map((r) => r.name);
}

// ── 1. The child's own history, most-tagged first ───────────────────────────

describe('child ranking', () => {
  it('orders by how many times THIS child was tagged with the work', () => {
    const childTally = tallyEvents(
      [ev(TOWER, 1), ev(POURING, 2), ev(POURING, 3), ev(POURING, 4), ev(TOWER, 5), ev(BEADS, 6)],
      WORKS
    );
    const out = rankSuggestions({
      works: WORKS,
      childTally,
      classroomTally: NO_TALLY,
      mode: 'all',
    });
    expect(names(out)).toEqual(['Pouring', 'Pink Tower', 'Golden Beads']);
    expect(out[0].count).toBe(3);
    expect(out[0].reason).toBe('child');
  });

  it('breaks an equal count by the most recent tagging', () => {
    // Both tagged twice; Spooning's latest is yesterday, Pouring's is a month ago.
    const childTally = tallyEvents(
      [ev(POURING, 30), ev(POURING, 31), ev(SPOONING, 1), ev(SPOONING, 40)],
      WORKS
    );
    const out = rankSuggestions({
      works: WORKS,
      childTally,
      classroomTally: NO_TALLY,
      mode: 'all',
    });
    expect(out[0].count).toBe(out[1].count);
    expect(names(out)).toEqual(['Spooning', 'Pouring']);
  });

  it('drops a journal row that is not live curriculum any more', () => {
    const childTally = tallyEvents(
      [
        { work_key: 'k:deleted', work_name: 'A Work That Was Removed', created_at: at(1) },
        ev(POURING, 2),
      ],
      WORKS
    );
    const out = rankSuggestions({
      works: WORKS,
      childTally,
      classroomTally: NO_TALLY,
      mode: 'all',
    });
    expect(names(out)).toEqual(['Pouring']);
  });

  it('resolves a legacy keyless row by name', () => {
    const childTally = tallyEvents(
      [{ work_key: null, work_name: '  pink   TOWER ', created_at: at(1) }],
      WORKS
    );
    expect(childTally.get(TOWER.id)?.count).toBe(1);
  });
});

// ── 2. The top-up rules ─────────────────────────────────────────────────────

describe('top-up rules', () => {
  const classroomTally = tallyEvents(
    [ev(BEADS, 1), ev(BEADS, 2), ev(SANDPAPER, 3), ev(CYLINDERS, 4)],
    WORKS
  );

  it('tops the ALL row up from the classroom when the child has too little history', () => {
    const childTally = tallyEvents([ev(POURING, 1), ev(TOWER, 2)], WORKS); // 2 < 3
    const out = rankSuggestions({ works: WORKS, childTally, classroomTally, mode: 'all' });
    expect(out.slice(0, 2).map((r) => r.reason)).toEqual(['child', 'child']);
    expect(out.length).toBeGreaterThan(CHILD_MIN_BEFORE_CLASSROOM - 1);
    expect(out.some((r) => r.reason === 'classroom' && r.name === 'Golden Beads')).toBe(true);
  });

  it('leaves the ALL row to the child alone once they have three works of their own', () => {
    const childTally = tallyEvents([ev(POURING, 1), ev(TOWER, 2), ev(SPOONING, 3)], WORKS);
    const out = rankSuggestions({ works: WORKS, childTally, classroomTally, mode: 'all' });
    expect(out).toHaveLength(3);
    expect(out.every((r) => r.reason === 'child')).toBe(true);
  });

  it('never tops the ALL row up from the bare curriculum', () => {
    const out = rankSuggestions({
      works: WORKS,
      childTally: NO_TALLY,
      classroomTally: NO_TALLY,
      mode: 'all',
    });
    expect(out).toEqual([]);
  });

  it('caps at eight chips', () => {
    const many = Array.from({ length: 20 }, (_, i) => work(`m${i}`, `Work ${i}`, 'sensorial', i));
    const childTally = tallyEvents(
      many.flatMap((w, i) => Array.from({ length: 20 - i }, () => ev(w, i + 1))),
      many
    );
    const out = rankSuggestions({
      works: many,
      childTally,
      classroomTally: NO_TALLY,
      mode: 'all',
    });
    expect(out).toHaveLength(SUGGESTION_LIMIT);
    expect(out[0].name).toBe('Work 0');
  });
});

// ── 3. Area buckets ─────────────────────────────────────────────────────────

describe('area buckets', () => {
  it('ranks within the area and never leaks another area in', () => {
    const childTally = tallyEvents(
      [ev(CYLINDERS, 1), ev(CYLINDERS, 2), ev(TOWER, 3), ev(POURING, 1), ev(POURING, 2), ev(POURING, 3)],
      WORKS
    );
    const out = rankSuggestions({
      works: WORKS,
      childTally,
      classroomTally: NO_TALLY,
      mode: 'area',
      area: 'sensorial',
    });
    expect(out.every((r) => r.area_key === 'sensorial')).toBe(true);
    expect(names(out).slice(0, 2)).toEqual(['Knobbed Cylinders', 'Pink Tower']);
  });

  it('is NEVER empty while the area has curriculum works — falls back to shelf order', () => {
    const buckets = buildAreaBuckets({
      works: WORKS,
      childTally: NO_TALLY,
      classroomTally: NO_TALLY,
      areaKeys: AREA_KEYS,
    });
    for (const key of AREA_KEYS) {
      expect(buckets[key].length).toBeGreaterThan(0);
      expect(buckets[key].every((r) => r.area_key === key)).toBe(true);
    }
    // Shelf order, and a pure top-up carries no count.
    expect(names(buckets.practical_life)).toEqual(['Pouring', 'Spooning', 'Buttoning Frame']);
    expect(buckets.practical_life.every((r) => r.reason === 'curriculum' && r.count === 0)).toBe(true);
  });

  it('puts the child first, then the classroom, then the shelf', () => {
    const childTally = tallyEvents([ev(BUTTONS, 1)], WORKS);
    const classroomTally = tallyEvents([ev(SPOONING, 1), ev(SPOONING, 2)], WORKS);
    const out = rankSuggestions({
      works: WORKS,
      childTally,
      classroomTally,
      mode: 'area',
      area: 'practical_life',
    });
    expect(names(out)).toEqual(['Buttoning Frame', 'Spooning', 'Pouring']);
    expect(out.map((r) => r.reason)).toEqual(['child', 'classroom', 'curriculum']);
  });

  it('gives an area with no curriculum an empty bucket rather than another area', () => {
    const buckets = buildAreaBuckets({
      works: WORKS,
      childTally: NO_TALLY,
      classroomTally: NO_TALLY,
      areaKeys: [...AREA_KEYS, 'cultural'],
    });
    expect(buckets.cultural).toEqual([]);
  });

  it('builds the ALL bucket exactly as the ALL rules say', () => {
    const childTally = tallyEvents([ev(POURING, 1), ev(TOWER, 2), ev(BEADS, 3)], WORKS);
    const buckets = buildAreaBuckets({
      works: WORKS,
      childTally,
      classroomTally: NO_TALLY,
      areaKeys: AREA_KEYS,
    });
    expect(names(buckets[ALL_AREA_KEY])).toEqual(['Pouring', 'Pink Tower', 'Golden Beads']);
  });
});
