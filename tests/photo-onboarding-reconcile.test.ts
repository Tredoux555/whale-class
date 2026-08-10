// tests/photo-onboarding-reconcile.test.ts
//
// reconcileRoster is the only place Photo Onboarding decides whether an
// uploaded name is a NEW child, an EXISTING child, or whether a child on the
// roster has LEFT. Nothing it produces is written without teacher review, but
// a wrong default here is what the teacher sees and trusts — and the
// empty-extraction guard is the difference between "that photo was blurry"
// and "the whole class got archived".

import { describe, it, expect } from 'vitest';
import {
  reconcileRoster,
  ageFromDob,
  EmptyExtractionError,
} from '@/lib/montree/photo-onboarding/reconcile';
import type { ExtractedStudent, RosterChild } from '@/lib/montree/photo-onboarding/types';

function student(name: string, extra: Partial<ExtractedStudent> = {}): ExtractedStudent {
  return { name, date_of_birth: null, age: null, gender: null, notes: null, ...extra };
}

const ROSTER: RosterChild[] = [
  { id: 'c-emily', name: 'Emily Chen' },
  { id: 'c-austin', name: 'Austin' },
  { id: 'c-zhang', name: '张伟' },
];

describe('reconcileRoster — matching', () => {
  it('proposes update on an exact name match', () => {
    const { entries, counts } = reconcileRoster([student('Austin')], ROSTER);
    const row = entries.find((e) => e.name_raw === 'Austin');

    expect(row?.suggested_action).toBe('update');
    expect(row?.matched_child_id).toBe('c-austin');
    expect(row?.match_type).toBe('exact');
    expect(counts.update).toBe(1);
  });

  it('proposes update on a close fuzzy match (a misspelling on the list)', () => {
    const { entries } = reconcileRoster([student('Austen')], ROSTER);
    const row = entries.find((e) => e.name_raw === 'Austen');

    expect(row?.suggested_action).toBe('update');
    expect(row?.matched_child_id).toBe('c-austin');
    expect(row?.match_type).toBe('fuzzy');
    expect(row?.match_confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('proposes create for a name nobody on the roster resembles', () => {
    const { entries, counts } = reconcileRoster([student('Priya Nair')], ROSTER);
    const row = entries.find((e) => e.name_raw === 'Priya Nair');

    expect(row?.suggested_action).toBe('create');
    expect(row?.matched_child_id).toBeNull();
    expect(row?.match_type).toBe('none');
    expect(counts.create).toBe(1);
  });

  it('matches Chinese names exactly, without transliterating', () => {
    const { entries } = reconcileRoster([student('张伟')], ROSTER);
    const row = entries.find((e) => e.name_raw === '张伟');

    expect(row?.suggested_action).toBe('update');
    expect(row?.matched_child_id).toBe('c-zhang');
  });
});

describe('reconcileRoster — departures', () => {
  it('proposes archive for an active child missing from the uploaded list', () => {
    const { entries, counts } = reconcileRoster([student('Austin')], ROSTER);

    const departed = entries.filter((e) => e.kind === 'departed');
    expect(departed.map((e) => e.matched_child_id).sort()).toEqual(['c-emily', 'c-zhang']);
    expect(departed.every((e) => e.suggested_action === 'archive')).toBe(true);
    expect(counts.archive).toBe(2);
  });

  it('proposes no archives when every child is on the list', () => {
    const { counts } = reconcileRoster(
      [student('Emily Chen'), student('Austin'), student('张伟')],
      ROSTER,
    );

    expect(counts.archive).toBe(0);
    expect(counts.update).toBe(3);
  });
});

describe('reconcileRoster — the empty-extraction guard', () => {
  // 🚨 Without this, an unreadable upload proposes archiving the entire class.
  it('throws rather than proposing to archive everyone', () => {
    expect(() => reconcileRoster([], ROSTER)).toThrow(EmptyExtractionError);
  });

  it('treats blank/whitespace names as no students at all', () => {
    expect(() => reconcileRoster([student('   '), student('')], ROSTER)).toThrow(EmptyExtractionError);
  });
});

describe('reconcileRoster — duplicate matches', () => {
  it('lets only the strongest row claim a child; the loser becomes a create', () => {
    // Two lines both resolve toward Austin. One record must not receive two
    // conflicting updates.
    const { entries } = reconcileRoster([student('Austin'), student('Austen')], ROSTER);

    const claimants = entries.filter((e) => e.matched_child_id === 'c-austin');
    expect(claimants).toHaveLength(1);
    expect(claimants[0].name_raw).toBe('Austin'); // exact beats fuzzy

    const demoted = entries.find((e) => e.name_raw === 'Austen');
    expect(demoted?.suggested_action).toBe('create');
    expect(demoted?.matched_child_id).toBeNull();
  });
});

describe('reconcileRoster — field normalisation', () => {
  it('keeps a valid ISO birthday and derives the age from it', () => {
    const dob = `${new Date().getUTCFullYear() - 4}-01-01`;
    const { entries } = reconcileRoster([student('Priya', { date_of_birth: dob })], ROSTER);
    const row = entries.find((e) => e.name_raw === 'Priya');

    expect(row?.date_of_birth).toBe(dob);
    expect(row?.age).toBe(ageFromDob(dob));
  });

  it('drops an impossible or non-ISO birthday instead of storing garbage', () => {
    const { entries } = reconcileRoster(
      [student('A', { date_of_birth: '2019-02-31' }), student('B', { date_of_birth: '05/03/2019' })],
      ROSTER,
    );

    expect(entries.find((e) => e.name_raw === 'A')?.date_of_birth).toBeNull();
    expect(entries.find((e) => e.name_raw === 'B')?.date_of_birth).toBeNull();
  });

  it('only accepts boy/girl for gender', () => {
    const { entries } = reconcileRoster(
      [student('A', { gender: 'boy' }), student('B', { gender: 'unknown' as 'boy' })],
      ROSTER,
    );

    expect(entries.find((e) => e.name_raw === 'A')?.gender).toBe('boy');
    expect(entries.find((e) => e.name_raw === 'B')?.gender).toBeNull();
  });
});

describe('ageFromDob', () => {
  it('returns null for missing or malformed input', () => {
    expect(ageFromDob(null)).toBeNull();
    expect(ageFromDob('not a date')).toBeNull();
    expect(ageFromDob('2019/03/05')).toBeNull();
  });

  it('computes whole years', () => {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 5);
    expect(ageFromDob(fiveYearsAgo.toISOString().slice(0, 10))).toBe(5);
  });
});
