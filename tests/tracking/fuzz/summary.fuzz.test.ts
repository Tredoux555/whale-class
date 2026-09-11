// tests/tracking/fuzz/summary.fuzz.test.ts
//
// Rule 9: TEMPLATES BEFORE AI, hard 40-word cap counted in code, and never a
// work a parent should not be told about.

import { describe, expect, it } from 'vitest';
import { englishSummary, countWords, WORD_CAP } from '@/lib/montree/tracking/summary';
import { forEachSeed, genLedger, WEEK_STARTS, show } from './gen';

const CASES = 2000;

const BANNED = ['undefined', 'null', 'NaN', '[object'];

const PRONOUNS: Record<string, { subject: string; wrong: string[] }> = {
  he: { subject: 'He', wrong: ['She ', 'They '] },
  she: { subject: 'She', wrong: ['He ', 'They '] },
  they: { subject: 'They', wrong: ['He ', 'She '] },
};

describe('summary fuzz', () => {
  it('englishSummary obeys every rule-9 constraint (2000 cases)', () => {
    forEachSeed(CASES, 21_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 30) });
      const child = rng.pick(ledger.children);
      const week = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      const s = englishSummary(ledger, child.id, week);
      const ctx = () => `child=${child.id} week=${week}\ntext=${JSON.stringify(s.text)}`;

      // Non-empty.
      expect(s.text.trim().length, `empty summary\n${ctx()}`).toBeGreaterThan(0);
      // The cap is counted in code, and the reported count matches.
      expect(s.words, `word count mismatch\n${ctx()}`).toBe(countWords(s.text));
      expect(s.words, `over the ${WORD_CAP}-word cap\n${ctx()}`).toBeLessThanOrEqual(WORD_CAP);
      // No placeholder ever reaches a parent.
      for (const bad of BANNED) {
        expect(s.text.includes(bad), `contains "${bad}"\n${ctx()}`).toBe(false);
      }
      // The child's name, once: at the start when there is something to report,
      // inside the "No observations were recorded for <Name> this week." line
      // when there is not.
      const named = s.text.startsWith(`${child.name} did `)
        || s.text === `No observations were recorded for ${child.name} this week.`;
      expect(named, `unexpected shape\n${ctx()}`).toBe(true);
      const occurrences = s.text.split(child.name).length - 1;
      expect(occurrences, `name appears ${occurrences} times\n${ctx()}`).toBe(1);
      // 2026-09-11: the summary carries no pronoun clause at all, so no pronoun
      // — right or wrong — may appear.
      for (const p of [...PRONOUNS[child.pronoun].wrong, `${PRONOUNS[child.pronoun].subject} `]) {
        expect(s.text.includes(` ${p}`), `pronoun "${p.trim()}"\n${ctx()}`).toBe(false);
      }
      for (const other of ledger.children) {
        if (other.id === child.id || other.name === child.name) continue;
        expect(s.text.includes(other.name), `mentions ${other.name}\n${ctx()}`).toBe(false);
      }
      // No invented progress and no invented plan, ever.
      for (const re of [/has not started/i, /Next week/i, /starting to/i, /can now/i]) {
        expect(re.test(s.text), `invented clause ${re}\n${ctx()}`).toBe(false);
      }
      // Sentence-shaped: ends with a stop, no double spaces, no dangling comma.
      expect(/[.!?]$/.test(s.text.trim()), `no terminal punctuation\n${ctx()}`).toBe(true);
      expect(/\s{2,}/.test(s.text), `double space\n${ctx()}`).toBe(false);
      expect(/,\s*\./.test(s.text), `dangling comma before the stop\n${ctx()}`).toBe(false);
    });
  });

  it('englishSummary is idempotent — same input, byte-identical output (2000 cases)', () => {
    forEachSeed(CASES, 22_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 24) });
      const child = rng.pick(ledger.children);
      const week = WEEK_STARTS[rng.int(WEEK_STARTS.length)];
      const a = englishSummary(ledger, child.id, week);
      const b = englishSummary(ledger, child.id, week);
      expect(b).toEqual(a);
      // And independent of the arrival order of the journal.
      const shuffled = { ...ledger, events: rng.shuffle(ledger.events) };
      const c = englishSummary(shuffled, child.id, week);
      expect(c, `shuffling arrival order changed the summary\n${show({ a, c })}`).toEqual(a);
    });
  });

  it('an unknown child yields an empty summary, never a crash (2000 cases)', () => {
    forEachSeed(CASES, 23_000_000, (rng) => {
      const ledger = genLedger(rng, { count: rng.between(0, 12) });
      const s = englishSummary(ledger, `ghost-${rng.int(1000)}`, WEEK_STARTS[rng.int(12)]);
      expect(s).toEqual({ text: '', words: 0 });
    });
  });
});
