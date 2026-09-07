// tests/tracking/fuzz/derive.fuzz.test.ts
//
// Property-based tests for rule 7 (sequence is data) and rule 8 (everything a
// human reads is derived).

import { describe, expect, it } from 'vitest';
import { workId, workName, TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import {
  childCurrent,
  currentLetter,
  flags,
  isLetterMastered,
  LIVE_LETTERS,
  nextLetter,
  planLanguageCell,
  ribbon,
  weekTicks,
  withImpliedDarkPhonics,
} from '@/lib/montree/tracking/derive';
import { dayOf, replay } from '@/lib/montree/tracking/ledger';
import { forEachSeed, genLedger, LIVE, WEEK_STARTS, show } from './gen';

const CASES = 2000;
const LETTER_ORDER = new Map(TRACKER_LETTERS.map((l, i) => [l.letter, i]));

describe('derive fuzz', () => {
  it("ribbon: a letter is 'mastered' exactly when its five works are (2000 cases)", () => {
    forEachSeed(CASES, 11_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 30) });
      const { state } = replay(ledger.events);
      for (const child of ledger.children) {
        // Rule 7's Dark Phonics amendment: a letter is gold when its five works
        // read as mastered — implied ones included, since the ribbon is derived.
        const cur = withImpliedDarkPhonics(childCurrent(state.current, child.id), ledger.works);
        const r = ribbon(cur, ledger.works);
        for (const def of TRACKER_LETTERS) {
          const keys = [1, 2, 3, 4, 5]
            .map((n) => workId(def.letter, n))
            .filter((k) => ledger.works.some((w) => w.work_key === k));
          const allFive = keys.length === 5 && keys.every((k) => cur.get(k) === 'mastered');
          expect(r[def.letter] === 'mastered').toBe(allFive);
          expect(r[def.letter] === 'mastered').toBe(isLetterMastered(cur, ledger.works, def.letter));
          // Every letter has a state, and it is one of the four.
          expect(['mastered', 'in-progress', 'not-started', 'coming']).toContain(r[def.letter]);
        }
      }
    });
  });

  it('ribbon is monotone: mastering one more work never un-masters a letter (2000 cases)', () => {
    forEachSeed(CASES, 11_500_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 24) });
      const { state } = replay(ledger.events);
      const child = rng.pick(ledger.children);
      const cur = childCurrent(state.current, child.id);
      const before = ribbon(cur, ledger.works);
      // Master one more work by hand — nothing may go backwards.
      const work = rng.pick(ledger.works);
      if (!work) return;
      const after = ribbon(new Map(cur).set(work.work_key, 'mastered'), ledger.works);
      for (const def of TRACKER_LETTERS) {
        if (before[def.letter] === 'mastered') expect(after[def.letter]).toBe('mastered');
        if (before[def.letter] === 'in-progress') expect(after[def.letter]).not.toBe('not-started');
      }
    });
  });

  it('nextLetter is the first unmastered live letter after the one given (2000 cases)', () => {
    forEachSeed(CASES, 12_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 30) });
      const { state } = replay(ledger.events);
      for (const child of ledger.children) {
        const cur = childCurrent(state.current, child.id);
        const from = currentLetter(cur, ledger.works);
        const got = nextLetter(cur, ledger.works, from);
        const fromIdx = from != null ? (LETTER_ORDER.get(from) ?? -1) : -1;
        const expected =
          LIVE_LETTERS.filter((l) => (LETTER_ORDER.get(l) ?? -1) > fromIdx).find(
            (l) => !isLetterMastered(cur, ledger.works, l)
          ) ?? null;
        expect(got).toBe(expected);
        if (got != null) {
          expect(LIVE_LETTERS).toContain(got);
          expect(isLetterMastered(cur, ledger.works, got)).toBe(false);
          expect(LETTER_ORDER.get(got)!).toBeGreaterThan(fromIdx);
        }
        // currentLetter is always a live letter the child has not finished.
        if (from != null) {
          expect(LIVE_LETTERS).toContain(from);
          expect(isLetterMastered(cur, ledger.works, from)).toBe(false);
        }
      }
    });
  });

  it('flags only reference works/letters the child actually has events for (2000 cases)', () => {
    forEachSeed(CASES, 13_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 40) });
      const asOf = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      const all = flags(ledger, asOf);
      for (const f of all) {
        expect(ledger.children.some((c) => c.id === f.childId)).toBe(true);
        if (f.code === 'no-observation') continue;
        const keys = new Set(
          ledger.events.filter((e) => e.child_id === f.childId && e.work_key).map((e) => e.work_key!)
        );
        if (f.workKey) {
          expect(
            keys.has(f.workKey),
            `${f.code} names ${f.workKey}, but ${f.childId} has no event for it\n${show(f)}`
          ).toBe(true);
        }
        if (f.letter) {
          const touched = [...keys].some((k) => k.startsWith(`dp:${f.letter}:`));
          expect(touched, `${f.code} names letter '${f.letter}' with no events\n${show(f)}`).toBe(true);
        }
      }
    });
  });

  it('planLanguageCell returns a real curriculum name or the canonical fallback (2000 cases)', () => {
    forEachSeed(CASES, 14_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 30) });
      const names = new Set(ledger.works.map((w) => w.name));
      const fallbacks = new Set<string>();
      for (const l of LIVE) for (let n = 1; n <= 5; n++) fallbacks.add(workName(l, n));
      for (const child of ledger.children) {
        for (const week of WEEK_STARTS) {
          const cell = planLanguageCell(ledger, child.id, week);
          if (cell === null) continue;
          expect(typeof cell).toBe('string');
          expect(cell.length).toBeGreaterThan(0);
          // Either a curriculum name, the canonical fallback, or (for an event
          // whose key the classroom curriculum no longer carries) that row's
          // own recorded work_name — the documented `?? best.work_name` fallback.
          const orphanNames = new Set(
            ledger.events
              .filter(
                (e) =>
                  e.child_id === child.id &&
                  !!e.work_key &&
                  (e.work_key.startsWith('dp:') || e.work_key.startsWith('ws:'))
              )
              .map((e) => e.work_name)
          );
          expect(
            names.has(cell) || fallbacks.has(cell) || orphanNames.has(cell),
            `plan cell "${cell}" is neither a curriculum work, a canonical fallback, nor a journalled dp/ws name`
          ).toBe(true);
          // Rule 9: never a non-dp/ws work.
          const work = ledger.works.find((w) => w.name === cell);
          if (work) {
            expect(
              work.work_key.startsWith('dp:') || work.work_key.startsWith('ws:'),
              `plan cell surfaced ${work.work_key}`
            ).toBe(true);
          }
          // Rule 9 restated on the key side: whatever the cell names, it can
          // only have come from a dp:/ws: row.
          const sourceKeys = new Set([
            ...ledger.works.filter((w) => w.name === cell).map((w) => w.work_key),
            ...ledger.events.filter((e) => e.work_name === cell && e.work_key).map((e) => e.work_key!),
          ]);
          if (sourceKeys.size > 0) {
            expect(
              [...sourceKeys].some((k) => k.startsWith('dp:') || k.startsWith('ws:')),
              `plan cell "${cell}" traces to no dp:/ws: key`
            ).toBe(true);
          }
        }
      }
    });
  });

  it('weekTicks only reports rows inside the week, for the child, with a key (2000 cases)', () => {
    forEachSeed(CASES, 15_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 30) });
      const child = rng.pick(ledger.children);
      const week = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      for (const t of weekTicks(ledger.events, child.id, week)) {
        expect(t.event.child_id).toBe(child.id);
        expect(t.work_key).toBeTruthy();
        expect(t.day).toBe(dayOf(t.event.created_at));
        expect(t.day >= week).toBe(true);
      }
    });
  });
});
