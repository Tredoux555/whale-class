// tests/lens-action-items.test.ts
// Recommendations becoming follow-ups.
//
// The property that earns this file is IDEMPOTENCE. Finalise can be pressed
// twice — a lost response, a double tap, a reopen-and-refinalise — and the
// second press must add nothing. Getting that wrong does not look like a bug at
// first: it looks like the follow-up list quietly doubling every time she
// corrects a typo, and then like an item she marked done coming back from the
// dead. Both are worse than a crash.

import { describe, expect, it } from 'vitest';
import {
  normaliseDue,
  seedActionItems,
  sortByPriority,
} from '@/lib/lens/reports/action-items';
import type { ReportListItem } from '@/lib/lens/reports/schema';
import type { LensActionItem } from '@/lib/lens/types';

const REPORT_ID = 'rep-1';
const ROOM_ID = '11111111-1111-4111-8111-111111111111';

function rec(text: string, extra: Partial<ReportListItem> = {}): ReportListItem {
  return { text_en: text, evidence: [], ...extra };
}

function existing(text: string, sortOrder = 0): Pick<LensActionItem, 'text' | 'sort_order'> {
  return { text, sort_order: sortOrder };
}

function seed(options: Partial<Parameters<typeof seedActionItems>[0]> = {}) {
  return seedActionItems({
    reportId: REPORT_ID,
    classroomId: ROOM_ID,
    recommendations: [],
    existing: [],
    ...options,
  });
}

describe('seedActionItems', () => {
  it('turns each recommendation into an open item on the report’s classroom', () => {
    const rows = seed({
      recommendations: [rec('Complete the maths shelf.'), rec('Protect the work cycle.')],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      report_id: REPORT_ID,
      classroom_id: ROOM_ID,
      text: 'Complete the maths shelf.',
      status: 'open',
      sort_order: 0,
      carried_from_id: null,
    });
    expect(rows[1].sort_order).toBe(1);
  });

  it('puts REQUIRED ACTIONS ahead of recommendations', () => {
    // A compliance item that was not tracked is the one that gets missed.
    const rows = seed({
      recommendations: [rec('Consider re-siting the shelf.')],
      requiredActions: [rec('Restore the required adult:child ratio.')],
    });
    expect(rows.map((r) => r.text)).toEqual([
      'Restore the required adult:child ratio.',
      'Consider re-siting the shelf.',
    ]);
  });

  it('puts CARRIED items first of all, with a pointer back to the original', () => {
    const rows = seed({
      recommendations: [rec('New thing.')],
      carried: [
        { id: 'old-1', text: 'The thing we asked for last time.', owner: 'Miss Chen', due_date: '2026-04-01' },
      ],
    });
    expect(rows[0]).toMatchObject({
      text: 'The thing we asked for last time.',
      owner: 'Miss Chen',
      due_date: '2026-04-01',
      carried_from_id: 'old-1',
    });
    expect(rows[1].text).toBe('New thing.');
  });

  it('IS IDEMPOTENT — a second finalise adds nothing', () => {
    const recommendations = [rec('Complete the maths shelf.'), rec('Protect the work cycle.')];
    const first = seed({ recommendations });
    const second = seed({
      recommendations,
      existing: first.map((r) => existing(r.text, r.sort_order)),
    });
    expect(second).toEqual([]);
  });

  it('does not resurrect an item she has since edited or completed', () => {
    // The comparison is on TEXT, so an item already on the report — whatever
    // status it now has — is never re-created.
    const rows = seed({
      recommendations: [rec('Complete the maths shelf.')],
      existing: [existing('Complete the maths shelf.', 0)],
    });
    expect(rows).toEqual([]);
  });

  it('matches loosely enough to survive trailing punctuation and casing', () => {
    const rows = seed({
      recommendations: [rec('Complete the Maths Shelf')],
      existing: [existing('complete the maths shelf.', 0)],
    });
    expect(rows).toEqual([]);
  });

  it('continues the existing numbering rather than restarting at zero', () => {
    // She added an item by hand at sort_order 5; the next seed must land after
    // it, not interleave with it.
    const rows = seed({
      recommendations: [rec('A new recommendation.')],
      existing: [existing('Her own item.', 5)],
    });
    expect(rows[0].sort_order).toBe(6);
  });

  it('collapses a duplicate WITHIN one batch', () => {
    const rows = seed({
      recommendations: [rec('Same thing.'), rec('Same thing.')],
    });
    expect(rows).toHaveLength(1);
  });

  it('skips an empty or whitespace-only recommendation', () => {
    const rows = seed({ recommendations: [rec('   '), rec('Real one.')] });
    expect(rows.map((r) => r.text)).toEqual(['Real one.']);
  });

  it('carries owner and due through from the item when it has them', () => {
    const rows = seed({
      recommendations: [rec('Do the thing.', { owner: 'The head', due: '2026-05-01' })],
    });
    expect(rows[0].owner).toBe('The head');
    expect(rows[0].due_date).toBe('2026-05-01');
  });

  it('refuses to invent a date from prose', () => {
    // "end of term" in a school's file as 2026-11-30 would be a deadline
    // nobody agreed to. NULL, and she sets it herself.
    const rows = seed({ recommendations: [rec('Do the thing.', { due: 'end of term' })] });
    expect(rows[0].due_date).toBeNull();
  });
});

describe('sortByPriority', () => {
  it('orders by priority, 1 first', () => {
    const sorted = sortByPriority([
      rec('third', { priority: 3 }),
      rec('first', { priority: 1 }),
      rec('second', { priority: 2 }),
    ]);
    expect(sorted.map((r) => r.text_en)).toEqual(['first', 'second', 'third']);
  });

  it('puts UNPRIORITISED items after prioritised ones, in report order', () => {
    // An unprioritised recommendation is not urgent, it is unlabelled — putting
    // it first would invent an urgency the observer did not assign.
    const sorted = sortByPriority([
      rec('no priority a'),
      rec('priority two', { priority: 2 }),
      rec('no priority b'),
      rec('priority one', { priority: 1 }),
    ]);
    expect(sorted.map((r) => r.text_en)).toEqual([
      'priority one',
      'priority two',
      'no priority a',
      'no priority b',
    ]);
  });

  it('is stable among equal priorities', () => {
    const sorted = sortByPriority([
      rec('a', { priority: 1 }),
      rec('b', { priority: 1 }),
      rec('c', { priority: 1 }),
    ]);
    expect(sorted.map((r) => r.text_en)).toEqual(['a', 'b', 'c']);
  });
});

describe('normaliseDue', () => {
  it('accepts a clean ISO date', () => {
    expect(normaliseDue('2026-05-01')).toBe('2026-05-01');
  });

  it('rejects prose, empty, null and the wrong format', () => {
    for (const bad of ['end of term', 'within 30 days', '', '01/05/2026', '2026-5-1', null, undefined]) {
      expect(normaliseDue(bad as string | null)).toBeNull();
    }
  });

  it('rejects a date that does not exist', () => {
    // Date() happily rolls 2026-02-31 into March; the round-trip check catches
    // it, so a school never gets a deadline on a day that is not in the year.
    expect(normaliseDue('2026-02-31')).toBeNull();
    expect(normaliseDue('2026-13-01')).toBeNull();
  });

  it('accepts a leap day in a leap year and refuses it otherwise', () => {
    expect(normaliseDue('2028-02-29')).toBe('2028-02-29');
    expect(normaliseDue('2026-02-29')).toBeNull();
  });
});
