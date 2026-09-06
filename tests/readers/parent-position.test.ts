// tests/readers/parent-position.test.ts
//
// Rule 8: the parent's reading sentence is DERIVED, and rule 11: nothing is
// guessed. The retired montree_child_english_progress pointer could tell a
// parent their child was on "lesson 54 — Magic e" while the child's actual
// work was 't Dark Phonics work 3'. These tests pin the two — and only two —
// things a parent may now be told, word for word.

import { describe, it, expect } from 'vitest';
import { readingPosition, readingPositionForWeek } from '@/lib/montree/reports/reading-position';
import { buildLedger, WEEK_STARTS } from '../tracking/fixture';

const ledger = buildLedger();

describe('the parent-facing reading position', () => {
  it("says which book the child is working on, with its title", () => {
    // Chris is mid-'a' in week 8 (works 1-3 done, 4-5 to come).
    const pos = readingPositionForWeek(ledger, 'chris', WEEK_STARTS[7]);
    expect(pos).not.toBeNull();
    expect(pos!.state).toBe('working');
    expect(pos!.letter).toBe('a');
    expect(pos!.phrase).toBe("currently working on the 'a' book (Ant on My Apple)");
    expect(pos!.sentence).toBe("Chris is currently working on the 'a' book (Ant on My Apple).");
  });

  it("says 'finished' for a book completed inside the period", () => {
    // Chris's fifth 's' work lands in week 5 — that week's news is the finish.
    const pos = readingPositionForWeek(ledger, 'chris', WEEK_STARTS[4]);
    expect(pos).not.toBeNull();
    expect(pos!.state).toBe('finished');
    expect(pos!.phrase).toBe("finished the 's' book");
    expect(pos!.sentence).toBe("Chris finished the 's' book this period.");
  });

  it('never contains a lesson number, a phase or a reading level', () => {
    for (const childId of ['mei', 'chris', 'li', 'sara', 'noor']) {
      for (const week of WEEK_STARTS) {
        const pos = readingPositionForWeek(ledger, childId, week);
        if (!pos) continue;
        expect(pos.sentence).not.toMatch(/lesson/i);
        expect(pos.sentence).not.toMatch(/\bpink\b|\bblue\b|\bgreen\b/i);
        expect(pos.sentence).not.toMatch(/\b\d{1,3}\s*of\s*\d{1,3}\b/i);
      }
    }
  });

  it('stays silent for a child who has opened no Dark Phonics book', () => {
    // Tom is Writing Shelf only — there is no book to name, so nothing is said.
    expect(readingPosition(ledger, 'tom')).toBeNull();
  });

  it('stays silent for a child who is not in the ledger at all', () => {
    expect(readingPosition(ledger, 'nobody')).toBeNull();
  });

  it('reports the current book when the period had no finish', () => {
    // Li stalls on 's' work 4 — working, never finished.
    const pos = readingPositionForWeek(ledger, 'li', WEEK_STARTS[6]);
    expect(pos!.state).toBe('working');
    expect(pos!.phrase).toBe("currently working on the 's' book (Snake in My Sock)");
  });

  it('with no period given, reports where the child stands overall', () => {
    // Sara: s/a/t backfilled, 'p' current.
    const pos = readingPosition(ledger, 'sara');
    expect(pos!.state).toBe('working');
    expect(pos!.letter).toBe('p');
  });
});
