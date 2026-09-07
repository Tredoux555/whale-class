// tests/tracking/fuzz/guidance.fuzz.test.ts
//
// Rule 7 for every area: "next" is computed from position + status, gaps are
// flagged not filled, an unpublished book is never proposed, and two runs over
// the same ledger are byte-identical.

import { describe, expect, it } from 'vitest';
import {
  classGuidance,
  effectiveSequence,
  isWritingShelf,
  nextWorks,
  normaliseArea,
  parseDpKey,
  asOfLedger,
} from '@/lib/montree/tracking/guidance';
import { childCurrent, withImpliedDarkPhonics } from '@/lib/montree/tracking/derive';
import { replay } from '@/lib/montree/tracking/ledger';
import type { CurriculumWork, Status } from '@/lib/montree/tracking/types';
import { COMING, forEachSeed, genLedger, LIVE, WEEK_STARTS, show } from './gen';

const CASES = 2000;
const LIVE_SET = new Set(LIVE);

function compare(a: CurriculumWork, b: CurriculumWork): number {
  const d = effectiveSequence(a) - effectiveSequence(b);
  if (d !== 0) return d;
  const n = a.name.localeCompare(b.name);
  return n !== 0 ? n : a.work_key.localeCompare(b.work_key);
}

// nextWorks() answers "as of" a day: rows journalled later are invisible to
// it, so every expectation below is computed from the SAME scoped journal.
describe('guidance fuzz', () => {
  it('never proposes an unpublished (coming) letter the child has not touched (2000 cases)', () => {
    forEachSeed(CASES, 41_000_000, (rng) => {
      const ledger = genLedger(rng, {
        letters: [...LIVE.slice(0, rng.between(1, 3)), rng.pick(COMING)],
        trays: rng.between(0, 4),
        count: rng.between(0, 35),
      });
      const asOf = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      for (const child of ledger.children) {
        // Rule 7's Dark Phonics amendment: the engine reads current state with the
        // earlier works of an observed book filled in, so every expectation below
        // is computed from the same derived state rather than the raw journal.
        const cur = withImpliedDarkPhonics(
          childCurrent(replay(asOfLedger(ledger, asOf).events).state.current, child.id),
          ledger.works
        );
        for (const g of nextWorks(ledger, child.id, { asOf })) {
          if (!g.next) continue;
          const dp = parseDpKey(g.next.work_key);
          if (!dp || LIVE_SET.has(dp.letter)) continue;
          const status = cur.get(g.next.work_key) ?? 'not_started';
          expect(
            status !== 'not_started',
            `proposed untouched '${dp.letter}' (coming) work ${g.next.work_key}\n${show(g)}`
          ).toBe(true);
        }
      }
    });
  });

  it("a work below a mastered one is only ever proposed with reason 'gap-below' (2000 cases)", () => {
    forEachSeed(CASES, 42_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 35), trays: rng.between(0, 4) });
      const asOf = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      for (const child of ledger.children) {
        // Rule 7's Dark Phonics amendment: the engine reads current state with the
        // earlier works of an observed book filled in, so every expectation below
        // is computed from the same derived state rather than the raw journal.
        const cur = withImpliedDarkPhonics(
          childCurrent(replay(asOfLedger(ledger, asOf).events).state.current, child.id),
          ledger.works
        );
        const statusOf = (w: CurriculumWork): Status => cur.get(w.work_key) ?? 'not_started';
        for (const g of nextWorks(ledger, child.id, { asOf })) {
          if (!g.next) continue;
          // The Writing Shelf is a gated PARALLEL track (rule 6 of guidance.ts):
          // a mastered tray is not "above" a letter work, so the bar is read
          // within the same track the proposal came from.
          const nextWork = ledger.works.find((w) => w.work_key === g.next!.work_key)!;
          const area = ledger.works.filter(
            (w) => normaliseArea(w.area) === g.area && isWritingShelf(w) === isWritingShelf(nextWork)
          );
          const mastered = area.filter((w) => statusOf(w) === 'mastered');
          if (mastered.length === 0) continue;
          const highest = mastered.reduce((a, b) => (compare(a, b) >= 0 ? a : b));
          if (g.next.sequence >= effectiveSequence(highest)) continue;
          // Below the bar. Legal only as a flagged gap, or because the child is
          // already working on it (rule 1 beats rule 4).
          const legal =
            g.reason === 'gap-below' ||
            g.reason === 'continue-practising' ||
            g.reason === 're-present';
          expect(
            legal,
            `proposed ${g.next.work_key} below mastered ${highest.work_key} with reason '${g.reason}'\n${show(g)}`
          ).toBe(true);
          if (g.reason === 'gap-below') {
            expect(g.next.status).toBe('not_started');
            expect(g.gaps.some((x) => x.work_key === g.next!.work_key)).toBe(true);
          }
        }
      }
    });
  });

  it('a fresh proposal is always the FIRST proposable unmastered work in its track (2000 cases)', () => {
    forEachSeed(CASES, 43_000_000, (rng) => {
      const ledger = genLedger(rng, {
        letters: [...LIVE.slice(0, rng.between(1, 3)), rng.pick(COMING)],
        trays: rng.between(0, 4),
        count: rng.between(0, 35),
      });
      const asOf = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      for (const child of ledger.children) {
        // Rule 7's Dark Phonics amendment: the engine reads current state with the
        // earlier works of an observed book filled in, so every expectation below
        // is computed from the same derived state rather than the raw journal.
        const cur = withImpliedDarkPhonics(
          childCurrent(replay(asOfLedger(ledger, asOf).events).state.current, child.id),
          ledger.works
        );
        const statusOf = (w: CurriculumWork): Status => cur.get(w.work_key) ?? 'not_started';
        const proposable = (w: CurriculumWork) => {
          const dp = parseDpKey(w.work_key);
          return dp && !LIVE_SET.has(dp.letter) ? statusOf(w) !== 'not_started' : true;
        };
        for (const g of nextWorks(ledger, child.id, { asOf })) {
          if (!g.next) continue;
          if (g.reason !== 'present-next' && g.reason !== 'gap-below') continue;
          const nextWork = ledger.works.find((w) => w.work_key === g.next!.work_key)!;
          const pool = ledger.works.filter(
            (w) =>
              normaliseArea(w.area) === g.area &&
              isWritingShelf(w) === isWritingShelf(nextWork) &&
              statusOf(w) !== 'mastered' &&
              proposable(w)
          );
          const first = pool.sort(compare)[0];
          expect(
            first.work_key,
            `skipped ${first.work_key} to propose ${g.next.work_key} (${g.reason})\n${show(g)}`
          ).toBe(g.next.work_key);
          // Never more than one rung: nothing unmastered+proposable sits between.
          const between = pool.filter((w) => effectiveSequence(w) < g.next!.sequence);
          expect(between.length, `jumped over ${between.map((w) => w.work_key).join(', ')}`).toBe(0);
        }
      }
    });
  });

  it('nextWorks is deterministic across shuffled events and curriculum order (2000 cases)', () => {
    forEachSeed(CASES, 44_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 30), trays: rng.between(0, 4) });
      const asOf = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      const child = rng.pick(ledger.children);
      const base = JSON.stringify(nextWorks(ledger, child.id, { asOf }));
      for (let k = 0; k < 2; k++) {
        const shuffled = {
          ...ledger,
          events: rng.shuffle(ledger.events),
          works: rng.shuffle(ledger.works),
        };
        const got = JSON.stringify(nextWorks(shuffled, child.id, { asOf }));
        expect(got, 'shuffling the input changed the guidance').toBe(base);
      }
    });
  });

  it('every gap is a not_started work strictly below a mastered one (2000 cases)', () => {
    forEachSeed(CASES, 45_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 35) });
      const asOf = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      for (const child of ledger.children) {
        // Rule 7's Dark Phonics amendment: the engine reads current state with the
        // earlier works of an observed book filled in, so every expectation below
        // is computed from the same derived state rather than the raw journal.
        const cur = withImpliedDarkPhonics(
          childCurrent(replay(asOfLedger(ledger, asOf).events).state.current, child.id),
          ledger.works
        );
        for (const g of nextWorks(ledger, child.id, { asOf })) {
          for (const gap of g.gaps) {
            expect(cur.get(gap.work_key) ?? 'not_started').toBe('not_started');
            expect(gap.status).toBe('not_started');
            expect(ledger.works.some((w) => w.work_key === gap.work_key)).toBe(true);
            const mastered = ledger.works.filter(
              (w) => normaliseArea(w.area) === g.area && cur.get(w.work_key) === 'mastered'
            );
            expect(mastered.length).toBeGreaterThan(0);
            const bar = Math.max(...mastered.map(effectiveSequence));
            expect(gap.sequence).toBeLessThan(bar);
          }
          expect(g.because.trim().length).toBeGreaterThan(0);
          expect(g.because).not.toContain('undefined');
        }
      }
    });
  });

  it('classGuidance agrees with per-child nextWorks (2000 cases)', () => {
    forEachSeed(CASES, 46_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 25), trays: rng.between(0, 3) });
      const asOf = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      const cls = classGuidance(ledger, { asOf });
      const per = new Map(
        ledger.children.map((c) => [c.id, nextWorks(ledger, c.id, { asOf })])
      );

      // presentTogether groups: every child listed really has that work next on
      // the main track, and no group has fewer than two children.
      for (const group of cls.presentTogether) {
        expect(group.childIds.length).toBeGreaterThanOrEqual(2);
        expect(new Set(group.childIds).size).toBe(group.childIds.length);
        for (const id of group.childIds) {
          const gs = per.get(id)!;
          expect(
            gs.some((g) => g.track === 'main' && g.next?.work_key === group.work_key),
            `${id} is grouped on ${group.work_key} but nextWorks disagrees`
          ).toBe(true);
        }
        // Completeness: nobody with that main-track next is left out.
        for (const [id, gs] of per) {
          const has = gs.some((g) => g.track === 'main' && g.next?.work_key === group.work_key);
          if (has) expect(group.childIds).toContain(id);
        }
      }

      // readyForNextLetter rows mirror a real 'present-next' on work 1.
      for (const r of cls.readyForNextLetter) {
        const gs = per.get(r.childId)!;
        expect(
          gs.some(
            (g) => g.next?.work_key === r.work_key && g.reason === 'present-next'
          ),
          `readyForNextLetter ${r.childId}/${r.work_key} has no matching guidance`
        ).toBe(true);
        expect(parseDpKey(r.work_key)).toEqual({ letter: r.letter, n: 1 });
      }

      // idleWorks: nobody has touched them, and no unpublished letter is listed.
      const touched = new Set(
        asOfLedger(ledger, asOf)
          .events.filter((e) => e.work_key)
          .map((e) => e.work_key!)
      );
      for (const w of cls.idleWorks) {
        expect(touched.has(w.work_key)).toBe(false);
        const dp = parseDpKey(w.work_key);
        if (dp) expect(LIVE_SET.has(dp.letter)).toBe(true);
      }
    });
  });

  it('classGuidance is deterministic across shuffled input (2000 cases)', () => {
    forEachSeed(CASES, 47_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 20), trays: rng.between(0, 3) });
      const asOf = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      const base = JSON.stringify(classGuidance(ledger, { asOf }));
      const shuffled = {
        ...ledger,
        events: rng.shuffle(ledger.events),
        works: rng.shuffle(ledger.works),
      };
      expect(JSON.stringify(classGuidance(shuffled, { asOf }))).toBe(base);
    });
  });
});
