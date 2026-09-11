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
    expect(s.text).toBe('Mei did Writing Shelf tray 9.');
    expect(/,\s*\./.test(s.text)).toBe(false);
    expect(/\(\s*\)/.test(s.text)).toBe(false);
  });

  it('a tray with a blank name and no description also drops the clause', () => {
    const works: CurriculumWork[] = [
      { work_key: 'ws:3', name: '   ', description: '  ', area: 'Language', sequence: 5003 },
    ];
    const s = englishSummary(ledgerWith(works, [tick('ws:3', '   ')]), 'c1', WEEK_STARTS[0]);
    expect(s.text).toBe('Mei did Writing Shelf tray 3.');
    expect(/,\s*\./.test(s.text)).toBe(false);
    expect(/\(\s*\)/.test(s.text)).toBe(false);
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
    expect(s.text).toContain('Writing Shelf tray 3 (Word chains)');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2026-09-11, the director's rule. The summary LISTS what the child did.
describe('the "say what they did" rule', () => {
  const works = (n: number): CurriculumWork[] =>
    Array.from({ length: n }, (_, i) => ({
      work_key: `custom_w${i}`,
      name: `Work ${i}`,
      area: 'Language',
      sequence: 100 + i,
    }));

  const at = (key: string, name: string, iso: string): ProgressEvent => ({
    ...tick(key, name),
    created_at: iso,
  });

  it('names a classroom-custom work — the Whale Class bug', () => {
    // custom_… keys were dropped before a sentence was built, so a child who
    // had worked all week was told she "has not started the Dark Phonics
    // 's' book yet".
    const s = englishSummary(
      ledgerWith(
        [{ work_key: 'custom_cvc', name: 'CVC Encoding', area: 'Language', sequence: 1 }],
        [tick('custom_cvc', 'CVC Encoding')],
      ),
      'c1',
      WEEK_STARTS[0],
    );
    expect(s.text).toBe('Mei did CVC Encoding.');
  });

  it('a photo-sourced observation counts as doing the work', () => {
    const photo: ProgressEvent = { ...tick('custom_w0', 'Work 0'), source: 'photo' };
    const s = englishSummary(ledgerWith(works(1), [photo]), 'c1', WEEK_STARTS[0]);
    expect(s.text).toBe('Mei did Work 0.');
  });

  it('a record correction is not a week of work', () => {
    const fix: ProgressEvent = {
      ...tick('custom_w0', 'Work 0'),
      source: 'correction',
      reason: 'ticked the wrong child',
    };
    const s = englishSummary(ledgerWith(works(1), [fix]), 'c1', WEEK_STARTS[0]);
    expect(s.text).toBe('No observations were recorded for Mei this week.');
  });

  it('orders by frequency, then recency', () => {
    const events = [
      at('custom_w0', 'Work 0', '2026-01-06T09:00:00.000Z'),
      at('custom_w1', 'Work 1', '2026-01-07T09:00:00.000Z'),
      at('custom_w1', 'Work 1', '2026-01-08T09:00:00.000Z'),
      at('custom_w2', 'Work 2', '2026-01-09T09:00:00.000Z'),
    ];
    const s = englishSummary(ledgerWith(works(3), events), 'c1', WEEK_STARTS[0]);
    // Work 1 twice first; then Work 2 (more recent) before Work 0.
    expect(s.text).toBe('Mei did Work 1, Work 2 and Work 0.');
  });

  it('caps the list and says honestly how many were left out', () => {
    const events = works(9).map((w, i) =>
      at(w.work_key, w.name, `2026-01-06T0${i}:00:00.000Z`),
    );
    const s = englishSummary(ledgerWith(works(9), events), 'c1', WEEK_STARTS[0]);
    expect(s.text).toMatch(/ and 3 more\.$/);
    expect(s.words).toBeLessThanOrEqual(40);
  });
});
