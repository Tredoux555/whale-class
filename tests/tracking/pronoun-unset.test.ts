// tests/tracking/pronoun-unset.test.ts
//
// THE WHALE-CLASS BUG, 2026-09-06. All nineteen children on the roster carried
// no gender, so pronounFrom() fell back to 'they' for every one of them and the
// weekly document — the thing the school actually prints — read:
//
//   "Brilla did Dark Phonics 's' work 1. They are starting to recognise…"
//
// nineteen times over. Rule 11 forbids the obvious fix (guessing 'he' or 'she'
// from a name), so the engine repeats the CHILD'S NAME instead, and the tracker
// grows a He · She toggle so a teacher can end the repetition in one tap.
//
// These tests pin both halves: the name is used only when the pronoun is
// genuinely unstated, and a stated pronoun — including a stated 'they' — is
// still narrated as a pronoun.

import { describe, expect, it } from 'vitest';
import { englishSummary } from '@/lib/montree/tracking/summary';
import { buildWorks, ev, WEEK_STARTS } from './fixture';
import type { Child, Ledger, ProgressEvent } from '@/lib/montree/tracking/types';

const WEEK = WEEK_STARTS[0];

function ledgerOf(children: Child[], events: ProgressEvent[]): Ledger {
  return {
    children,
    works: buildWorks(),
    events,
    weekStarts: WEEK_STARTS,
    classWeekLetter: 's',
  };
}

/** The same child three ways: unstated, stated 'they', stated 'she'. */
const UNSTATED: Child = { id: 'brilla', name: 'Brilla', pronoun: 'they', pronounSet: false };
const STATED_THEY: Child = { id: 'brilla', name: 'Brilla', pronoun: 'they', pronounSet: true };
const STATED_SHE: Child = { id: 'brilla', name: 'Brilla', pronoun: 'she', pronounSet: true };
/** A hand-built ledger that never said either way keeps the old behaviour. */
const LEGACY: Child = { id: 'brilla', name: 'Brilla', pronoun: 'they' };

const ONE_WORK = [ev('brilla', 'dp:s:1', 1, 0, { status: 'presented' })];

describe('englishSummary — no stated pronoun', () => {
  it("repeats the child's name instead of opening the second sentence with 'They'", () => {
    const { text } = englishSummary(ledgerOf([UNSTATED], ONE_WORK), 'brilla', WEEK);

    expect(text).toBe(
      "Brilla did Dark Phonics 's' work 1. Brilla is starting to recognise the characters and follow the story. Next week we will try to complete the series.",
    );
    // The exact string the school could not print.
    expect(text).not.toContain('They are');
    expect(text).not.toContain('They ');
  });

  it("never guesses 'he' or 'she' to avoid the repetition (rule 11)", () => {
    const { text } = englishSummary(ledgerOf([UNSTATED], ONE_WORK), 'brilla', WEEK);
    expect(text).not.toMatch(/\b(He|She|his|her)\b/);
  });

  it('drops the possessive rather than writing "on Brilla\'s own" when the letter finishes', () => {
    const done = [1, 2, 3, 4, 5].map((n) => ev('brilla', `dp:s:${n}`, 1, n - 1));
    const { text } = englishSummary(ledgerOf([UNSTATED], done), 'brilla', WEEK);

    expect(text).toContain('Brilla can now build the sentences without help.');
    expect(text).not.toContain("Brilla's own");
    expect(text).not.toContain('their own');
  });

  it('uses the name on the Writing Shelf sentence too', () => {
    const tray = [ev('brilla', 'ws:3', 1, 0, { status: 'presented' })];
    const { text } = englishSummary(ledgerOf([UNSTATED], tray), 'brilla', WEEK);

    expect(text).toContain('Brilla is starting to form the letters with more control.');
    expect(text).not.toContain('They are');
  });

  it('stays inside the 40-word cap despite the longer sentence', () => {
    const { text, words } = englishSummary(ledgerOf([UNSTATED], ONE_WORK), 'brilla', WEEK);
    expect(words).toBeLessThanOrEqual(40);
    expect(text.endsWith('.')).toBe(true);
  });
});

describe('englishSummary — a stated pronoun is still a pronoun', () => {
  it("narrates a teacher's chosen 'they' rather than the name", () => {
    const { text } = englishSummary(ledgerOf([STATED_THEY], ONE_WORK), 'brilla', WEEK);
    expect(text).toContain('They are starting to');
    // The name still opens the summary, but only once.
    expect(text.split('Brilla').length - 1).toBe(1);
  });

  it('is unchanged for he/she', () => {
    const { text } = englishSummary(ledgerOf([STATED_SHE], ONE_WORK), 'brilla', WEEK);
    expect(text).toContain('She is starting to');
  });

  it('leaves ledgers that never carried the flag alone', () => {
    const { text } = englishSummary(ledgerOf([LEGACY], ONE_WORK), 'brilla', WEEK);
    expect(text).toContain('They are starting to');
  });
});
