// tests/tracking/fuzz/regression.test.ts
//
// Counterexamples the fuzzers found, frozen as ordinary examples so the bug
// cannot come back without a named test failing.

import { describe, expect, it } from 'vitest';
import { englishSummary } from '@/lib/montree/tracking/summary';
import type { Child, CurriculumWork, Ledger, ProgressEvent } from '@/lib/montree/tracking/types';
import { WEEK_STARTS } from './gen';

const CHILD: Child = { id: 'c1', name: 'Mei', pronoun: 'she' };

function ledgerWith(works: CurriculumWork[], events: ProgressEvent[]): Ledger {
  return { events, works, children: [CHILD], classWeekLetter: 's', weekStarts: WEEK_STARTS };
}

function tick(workKey: string, workName: string): ProgressEvent {
  return {
    child_id: 'c1',
    classroom_id: 'class-1',
    work_key: workKey,
    work_name: workName,
    area: 'Language',
    old_status: null,
    new_status: 'presented',
    source: 'tap',
    actor: 'teacher:ruth',
    created_at: '2026-01-06T09:15:00.000Z',
    reason: null,
    evidence_id: null,
  };
}

describe('regressions found by the fuzzers', () => {
  // Found by summary.fuzz.test.ts, seed 21000022.
  //   "Mei worked on Writing Shelf tray 9, . She is starting to ..."
  // A ws: event whose tray row this classroom's curriculum does not carry left
  // trayNameOf() returning '' and wsSummary() interpolated it anyway, so a
  // parent-facing sentence shipped with a dangling comma before the full stop.
  it('a Writing Shelf tray with no curriculum row never produces "tray N, ."', () => {
    const ledger = ledgerWith([], [tick('ws:9', 'Writing Shelf tray 9')]);
    const s = englishSummary(ledger, 'c1', WEEK_STARTS[0]);
    expect(s.text).toBe(
      'Mei worked on Writing Shelf tray 9. She is starting to form the letters with more control. Next week we will continue with tray 9.'
    );
    expect(/,\s*\./.test(s.text)).toBe(false);
  });

  it('a tray with a blank name and no description also drops the clause', () => {
    const works: CurriculumWork[] = [
      { work_key: 'ws:3', name: '   ', description: '  ', area: 'Language', sequence: 5003 },
    ];
    const s = englishSummary(ledgerWith(works, [tick('ws:3', '   ')]), 'c1', WEEK_STARTS[0]);
    expect(s.text.startsWith('Mei worked on Writing Shelf tray 3. ')).toBe(true);
    expect(/,\s*\./.test(s.text)).toBe(false);
  });

  it('a tray that DOES carry its material still names it', () => {
    const works: CurriculumWork[] = [
      {
        work_key: 'ws:3',
        name: 'Writing Shelf tray 3',
        description: 'Word chains',
        area: 'Language',
        sequence: 5003,
      },
    ];
    const s = englishSummary(
      ledgerWith(works, [tick('ws:3', 'Writing Shelf tray 3')]),
      'c1',
      WEEK_STARTS[0]
    );
    expect(s.text).toContain('Writing Shelf tray 3, Word chains.');
  });
});
