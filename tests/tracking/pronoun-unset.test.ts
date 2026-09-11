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
// 2026-09-11 SUPERSEDED, and kept as a regression pin. The director's rule
// removed the second sentence altogether: the summary now states only WHICH
// WORKS the child did, so there is no clause left for a pronoun to sit in and
// the bug cannot come back in any of the three roster shapes. The He · She
// toggle still drives the other four areas' sentences in weekly-doc.ts.

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

describe('the weekly summary carries no pronoun clause at all', () => {
  const NO_PRONOUNS = /\b(He|She|They|his|her|their|he|she|they)\b/;

  it('an unstated pronoun cannot produce "They are starting to…"', () => {
    const { text } = englishSummary(ledgerOf([UNSTATED], ONE_WORK), 'brilla', WEEK);
    expect(text).toBe("Brilla did Dark Phonics 's' (work 1).");
    expect(text).not.toMatch(NO_PRONOUNS);
  });

  it("never guesses 'he' or 'she' either (rule 11)", () => {
    const { text } = englishSummary(ledgerOf([UNSTATED], ONE_WORK), 'brilla', WEEK);
    expect(text).not.toMatch(/\b(He|She|his|her)\b/);
  });

  it('a finished letter is still just the highest work observed', () => {
    const done = [1, 2, 3, 4, 5].map((n) => ev('brilla', `dp:s:${n}`, 1, n - 1));
    const { text } = englishSummary(ledgerOf([UNSTATED], done), 'brilla', WEEK);
    expect(text).toBe("Brilla did Dark Phonics 's' (work 5).");
    expect(text).not.toMatch(NO_PRONOUNS);
  });

  it('the Writing Shelf sentence names the tray and its material, nothing more', () => {
    const tray = [ev('brilla', 'ws:3', 1, 0, { status: 'presented' })];
    const { text } = englishSummary(ledgerOf([UNSTATED], tray), 'brilla', WEEK);
    expect(text).toBe('Brilla did Writing Shelf tray 3 (Word chains).');
    expect(text).not.toMatch(NO_PRONOUNS);
  });

  it('stays inside the 40-word cap and ends with a stop', () => {
    const { text, words } = englishSummary(ledgerOf([UNSTATED], ONE_WORK), 'brilla', WEEK);
    expect(words).toBeLessThanOrEqual(40);
    expect(text.endsWith('.')).toBe(true);
  });

  it('a stated pronoun changes nothing — the summary is identical for all three roster shapes', () => {
    const unstated = englishSummary(ledgerOf([UNSTATED], ONE_WORK), 'brilla', WEEK).text;
    for (const child of [STATED_THEY, STATED_SHE, LEGACY]) {
      expect(englishSummary(ledgerOf([child], ONE_WORK), 'brilla', WEEK).text).toBe(unstated);
    }
  });

  it('the name appears exactly once', () => {
    const { text } = englishSummary(ledgerOf([UNSTATED], ONE_WORK), 'brilla', WEEK);
    expect(text.split('Brilla').length - 1).toBe(1);
  });
});
