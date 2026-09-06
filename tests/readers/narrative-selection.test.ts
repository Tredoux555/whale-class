// tests/readers/narrative-selection.test.ts
//
// Rule 9: TEMPLATES BEFORE AI — and rule 7: SEQUENCE IS DATA.
//
// The audit's headline reader bug was the weekly summary picking Language
// works by STATUS only, which is how "Beginning Sounds" ended up printed
// next to "Blue Series blends". These tests pin the decision that fixes it:
//
//   a classroom WITH Dark Phonics  → engine template, no model, ≤40 words
//   a classroom WITHOUT it         → AI path, fed a list ordered by the
//                                    curriculum's own `sequence`
//
// The decision itself lives in ONE module (weekly-admin/language-narrative)
// so the legacy auto-fill route and the aggregator engine cannot disagree.

import { describe, it, expect } from 'vitest';
import {
  AI_LANGUAGE_GUARDRAIL,
  classroomHasDarkPhonics,
  engineLanguagePlanCell,
  engineLanguageSummary,
  languageNarrativeMode,
  sequenceLookup,
  sequenceOrderedLanguageWorks,
} from '@/lib/montree/weekly-admin/language-narrative';
import { WORD_CAP, countWords } from '@/lib/montree/tracking/summary';
import { buildLedger, WEEK_STARTS } from '../tracking/fixture';
import type { CurriculumWork, Ledger } from '@/lib/montree/tracking/types';

/** A school not on the books: Language works with no dp:/ws: key at all. */
function nonDpLedger(): Ledger {
  const base = buildLedger();
  const works: CurriculumWork[] = [
    { work_key: 'lang:blue-series-blends', name: 'Blue Series blends', area: 'Language', sequence: 40, group: 'other' },
    { work_key: 'lang:beginning-sounds-vocab', name: 'Beginning Sounds — Vocabulary', area: 'Language', sequence: 10, group: 'other' },
    { work_key: 'lang:sandpaper', name: 'Sandpaper letters', area: 'Language', sequence: 20, group: 'other' },
  ];
  return { ...base, works, events: [] };
}

describe('which Language narrative path a classroom takes', () => {
  it('a classroom carrying Dark Phonics works takes the engine template', () => {
    const ledger = buildLedger();
    expect(classroomHasDarkPhonics(ledger)).toBe(true);
    expect(languageNarrativeMode(ledger)).toBe('engine-template');
  });

  it('a classroom with no dp:/ws: work at all still takes the AI path', () => {
    const ledger = nonDpLedger();
    expect(classroomHasDarkPhonics(ledger)).toBe(false);
    expect(languageNarrativeMode(ledger)).toBe('ai');
  });
});

describe('the engine template (Dark Phonics classroom)', () => {
  const ledger = buildLedger();

  it('writes the constitution sentence from the ticks, under the 40-word cap', () => {
    // Chris did 's' work 3 in week 3 (fixture: one work a week).
    const summary = engineLanguageSummary(ledger, 'chris', WEEK_STARTS[2]);
    expect(summary.text).toContain("Chris did Dark Phonics 's' work 3.");
    expect(summary.text).toContain('He is starting to match whole sentences to their pictures.');
    expect(summary.words).toBeLessThanOrEqual(WORD_CAP);
    expect(countWords(summary.text)).toBe(summary.words);
  });

  it('never lets a legacy Language work into the sentence', () => {
    // Week 5: Chris finishes 's' AND has a 'Beginning Sounds — Vocabulary' row.
    const summary = engineLanguageSummary(ledger, 'chris', WEEK_STARTS[4]);
    expect(summary.text).not.toMatch(/Beginning Sounds/i);
    expect(summary.text).not.toMatch(/Blue Series/i);
    expect(summary.text).toContain("Next week we will start the 'a' book.");
  });

  it('falls back to the class book for a child with no observation', () => {
    // Amir is absent from week 4 on; the class is on 't'. He has never had a 't'
    // event, so the fallback says so rather than claiming he "continued" (the
    // 2026-09-06 burn-in: that sentence went to 14 Whale children who had never
    // opened the class book, four of them unseen for 15-88 days).
    const summary = engineLanguageSummary(ledger, 'amir', WEEK_STARTS[8]);
    expect(summary.text).toBe(
      "Amir has not started the Dark Phonics 't' book yet. Next week we will introduce 't' work 1.",
    );
  });


  it('fills the Weekly Plan Language cell from the same journal', () => {
    expect(engineLanguagePlanCell(ledger, 'chris', WEEK_STARTS[2])).toBe('s Dark Phonics work 3');
    // Tom's only week-4 activity is Writing Shelf tray 1 — plus a legacy
    // "Blue Series blends" row that must never win the cell.
    expect(engineLanguagePlanCell(ledger, 'tom', WEEK_STARTS[3])).toBe('Writing Shelf tray 1');
  });
});

describe('the AI path (classroom without Dark Phonics)', () => {
  const ledger = nonDpLedger();
  const seqOf = sequenceLookup(ledger);

  it('orders the works list by curriculum sequence, not by status', () => {
    // Status-only ordering would put the "practicing" work first. Sequence
    // ordering is the whole point of rule 7.
    const rows = [
      { name: 'Blue Series blends', status: 'practicing', ...seqOf('Blue Series blends') },
      { name: 'Sandpaper letters', status: 'presented', ...seqOf('Sandpaper letters') },
      { name: 'Beginning Sounds — Vocabulary', status: 'mastered', ...seqOf('Beginning Sounds — Vocabulary') },
    ];
    expect(sequenceOrderedLanguageWorks(ledger, rows).map((r) => r.name)).toEqual([
      'Beginning Sounds — Vocabulary',
      'Sandpaper letters',
      'Blue Series blends',
    ]);
  });

  it('sorts a name the curriculum does not know to the END, never to the front', () => {
    const rows = [
      { name: 'Something a teacher typed', status: 'presented', ...seqOf('Something a teacher typed') },
      { name: 'Sandpaper letters', status: 'presented', ...seqOf('Sandpaper letters') },
    ];
    expect(sequenceOrderedLanguageWorks(ledger, rows).map((r) => r.name)).toEqual([
      'Sandpaper letters',
      'Something a teacher typed',
    ]);
  });

  it("drops 'other' Language works once the classroom does carry Dark Phonics", () => {
    const dpLedger = buildLedger();
    const dpSeq = sequenceLookup(dpLedger);
    const rows = [
      { name: 'Blue Series blends', status: 'practicing', sequence: 9002, workKey: 'lang:blue-series-blends' },
      { name: 't Dark Phonics work 3', status: 'presented', ...dpSeq('t Dark Phonics work 3') },
    ];
    expect(sequenceOrderedLanguageWorks(dpLedger, rows).map((r) => r.name)).toEqual([
      't Dark Phonics work 3',
    ]);
  });

  it('carries a guardrail sentence for every prompt', () => {
    expect(AI_LANGUAGE_GUARDRAIL).toContain('Use ONLY the works listed; never invent progression');
    expect(AI_LANGUAGE_GUARDRAIL).toMatch(/lesson numbers/i);
  });
});
