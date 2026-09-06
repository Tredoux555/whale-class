// tests/tracking/class-route-perf.test.ts
//
// THE 29-SECOND CLASS ROUTE (audit 08-verify-tracking §4).
//
// GET /api/montree/tracking/class derives everything it returns (rule 8), and
// derivation means replaying the journal. It replayed the WHOLE classroom journal
// roughly 1 + 8N times per request:
//
//   flags()            1 + 3N replays  (highestDpOfWeek → weekTicks → replay)
//   weekTicks          N
//   englishSummary     3N  — two of them over a FRESHLY FILTERED array per call
//   planLanguageCell   2N  — likewise
//
// Measured by the audit on this exact fixture shape (22 children, 30 weeks,
// 3,300 events): 29,045 ms of CPU, of which flags 10.4 s, englishSummary 9.8 s,
// planLanguageCell 6.6 s. An array-identity memo alone only reaches ~10 s, because
// the filtered calls build a new array every time; adding the cutoff-keyed cache
// (replayBefore) reaches ~35 ms.
//
// This test is the regression guard. The budget is deliberately loose — 500 ms,
// an order of magnitude above the measured figure and far below anything a human
// would call slow — so it fails on a lost cache, not on a slow CI runner.

import { describe, it, expect } from 'vitest';
import { TRACKER_LETTERS, workId, workName } from '@/lib/montree/dark-phonics/tracker-works';
import { flags, planLanguageCell, weekTicks } from '@/lib/montree/tracking/derive';
import { englishSummary } from '@/lib/montree/tracking/summary';
import { rebuildCurrent } from '@/lib/montree/tracking/ledger';
import { mondayOf } from '@/lib/montree/tracking/persistence';
import type { Child, CurriculumWork, Ledger, ProgressEvent, Source, Status } from '@/lib/montree/tracking/types';

const CHILDREN = 22;
const WEEKS = 30;
const PER_CHILD_PER_WEEK = 5;
const BUDGET_MS = 500;

const LIVE = TRACKER_LETTERS.filter((l) => l.status === 'live');

function buildFixture(): { ledger: Ledger; weekStart: string; asOf: string } {
  const works: CurriculumWork[] = [];
  LIVE.forEach((letter, li) => {
    for (let n = 1; n <= 5; n++) {
      works.push({
        work_key: workId(letter.letter, n),
        name: workName(letter.letter, n),
        area: 'Language',
        sequence: li * 10 + n,
        group: 'dark-phonics',
      });
    }
  });

  const children: Child[] = Array.from({ length: CHILDREN }, (_, i) => ({
    id: `child-${i}`,
    name: `Child ${i}`,
    pronoun: (['he', 'she', 'they'] as const)[i % 3],
  }));

  const ladder: Status[] = ['presented', 'practicing', 'mastered'];
  const sources: Source[] = ['tap', 'photo', 'ai', 'digital'];
  const weekStarts: string[] = [];
  const start = Date.UTC(2026, 1, 2); // a Monday
  for (let w = 0; w < WEEKS + 1; w++) {
    weekStarts.push(new Date(start + w * 7 * 86400000).toISOString().slice(0, 10));
  }

  const events: ProgressEvent[] = [];
  children.forEach((child, ci) => {
    for (let w = 0; w < WEEKS; w++) {
      for (let k = 0; k < PER_CHILD_PER_WEEK; k++) {
        const step = w * PER_CHILD_PER_WEEK + k;
        const letter = LIVE[Math.floor(step / 5) % LIVE.length].letter;
        const n = (step % 5) + 1;
        const rung = ladder[k % ladder.length];
        const at = new Date(start + (w * 7 + (k % 5)) * 86400000 + 3600000 * (2 + ci % 6));
        events.push({
          child_id: child.id,
          classroom_id: 'room',
          work_key: workId(letter, n),
          work_name: workName(letter, n),
          area: 'language',
          old_status: null,
          new_status: rung,
          source: sources[step % sources.length],
          actor: 't',
          created_at: at.toISOString(),
          reason: null,
          evidence_id: null,
        });
      }
    }
  });

  const asOf = weekStarts[weekStarts.length - 1];
  return {
    ledger: {
      events,
      works,
      children,
      classWeekLetter: LIVE[0].letter,
      weekStarts,
      timezone: 'Asia/Shanghai',
    },
    weekStart: mondayOf(weekStarts[WEEKS - 1]),
    asOf,
  };
}

describe('performance — the class route derives a whole classroom in one replay', () => {
  it(`22 children / 30 weeks / ${CHILDREN * WEEKS * PER_CHILD_PER_WEEK} events under ${BUDGET_MS} ms`, () => {
    const { ledger, weekStart, asOf } = buildFixture();
    expect(ledger.events.length).toBe(CHILDREN * WEEKS * PER_CHILD_PER_WEEK);

    const started = performance.now();

    // Exactly what app/api/montree/tracking/class/route.ts does, in order.
    const state = rebuildCurrent(ledger.events, ledger.timezone);
    const allFlags = flags(ledger, asOf);
    for (const child of ledger.children) {
      weekTicks(ledger.events, child.id, weekStart, ledger.timezone);
      allFlags.filter((f) => f.childId === child.id);
      englishSummary(ledger, child.id, weekStart);
      planLanguageCell(ledger, child.id, weekStart);
    }

    const elapsed = performance.now() - started;
    expect(state.size).toBe(CHILDREN);
    expect(
      elapsed,
      `the class-route derivation took ${Math.round(elapsed)} ms. Budget is ${BUDGET_MS} ms; ` +
        'the audit measured 29,045 ms without the replay caches in lib/montree/tracking/ledger.ts ' +
        '(replay + replayBefore). If this fails, something is replaying a freshly built array.',
    ).toBeLessThan(BUDGET_MS);
  });

  it('a repeated derivation is served from the cache, not recomputed', () => {
    const { ledger, weekStart } = buildFixture();
    const first = timed(() => englishSummary(ledger, ledger.children[0].id, weekStart));
    const again = timed(() => {
      for (const child of ledger.children) englishSummary(ledger, child.id, weekStart);
    });
    // 22 more children must not cost 22 more first-calls.
    expect(again).toBeLessThan(Math.max(first, 5) * 10);
  });
});

function timed(fn: () => unknown): number {
  const at = performance.now();
  fn();
  return performance.now() - at;
}
