// lib/montree/weekly-admin/language-narrative.ts
//
// Rule 9: TEMPLATES BEFORE AI. This module decides, for ONE classroom, which
// of the two Language-narrative paths the weekly admin docs take — and it is
// the only place that decision is made, so the legacy route and the
// aggregator engine can never drift apart.
//
//   Classroom HAS Dark Phonics (any dp: or ws: curriculum work)
//     → engine template. summary.englishSummary() writes the sentence from
//       the journal's ticks. No model is called. Rule 9's 40-word cap is
//       already counted in code inside the engine; the route's trimToWords()
//       stays on as a final safety net.
//
//   Classroom has NO Dark Phonics (a school not on the books yet)
//     → the AI path survives, but it is fed a CURRICULUM-SEQUENCE-ORDERED
//       list of the child's Language works (rule 7), never a status-only
//       jumble. That jumble is exactly what put "Beginning Sounds" next to
//       "Blue Series blends" in the audit.
//
// The Weekly Plan's Language column comes from derive.planLanguageCell() in
// both cases — one cell, one rule.

import { planLanguageCell } from '@/lib/montree/tracking/derive';
import { englishSummary } from '@/lib/montree/tracking/summary';
import type { Ledger } from '@/lib/montree/tracking/types';

/** A Language work as the AI path is allowed to see it: name + position. */
export interface SequencedWork {
  name: string;
  sequence: number;
  status: string;
  workKey: string | null;
}

/**
 * Does this classroom track Dark Phonics at all? One dp: or ws: curriculum
 * work is enough — the works are seeded per classroom by migration 344.
 */
export function classroomHasDarkPhonics(ledger: Ledger): boolean {
  return ledger.works.some(
    (w) => w.work_key.startsWith('dp:') || w.work_key.startsWith('ws:'),
  );
}

export type LanguageNarrativeMode = 'engine-template' | 'ai';

export function languageNarrativeMode(ledger: Ledger): LanguageNarrativeMode {
  return classroomHasDarkPhonics(ledger) ? 'engine-template' : 'ai';
}

/**
 * The engine's Language summary for one child + week. Empty string when the
 * engine has nothing to say, so a caller can fall through to its own text.
 */
export function engineLanguageSummary(
  ledger: Ledger,
  childId: string,
  weekStart: string,
): { text: string; words: number } {
  return englishSummary(ledger, childId, weekStart);
}

/** The Weekly Plan's Language cell. Null = leave the cell empty. */
export function engineLanguagePlanCell(
  ledger: Ledger,
  childId: string,
  weekStart: string,
): string | null {
  return planLanguageCell(ledger, childId, weekStart);
}

/**
 * The AI path's works list: ordered by CURRICULUM SEQUENCE (rule 7), and —
 * when the classroom does carry Dark Phonics — with every 'other' Language
 * work dropped, so a legacy name can never be narrated beside a dp: work.
 *
 * `works` is whatever the caller collected for the child this period
 * (captured works, focus shelf, recent progress); this function only orders
 * and filters it.
 */
export function sequenceOrderedLanguageWorks(
  ledger: Ledger,
  works: readonly SequencedWork[],
): SequencedWork[] {
  const hasDp = classroomHasDarkPhonics(ledger);
  const keep = works.filter((w) => {
    if (!hasDp) return true;
    const key = w.workKey ?? '';
    return key.startsWith('dp:') || key.startsWith('ws:');
  });
  return [...keep].sort((a, b) => {
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Resolve a free-text work name to its curriculum sequence + key. Names are
 * for people, keys for the system (rule 1) — this is a best-effort lookup
 * for the AI path only; it never writes anything.
 */
export function sequenceLookup(ledger: Ledger): (name: string) => { sequence: number; workKey: string | null } {
  const byName = new Map<string, { sequence: number; workKey: string }>();
  for (const w of ledger.works) {
    byName.set(w.name.trim().toLowerCase(), { sequence: w.sequence, workKey: w.work_key });
  }
  return (name: string) => {
    const hit = byName.get(String(name ?? '').trim().toLowerCase());
    // Unmatched names sort last rather than first: an unknown position is
    // not position zero.
    return hit ? hit : { sequence: Number.MAX_SAFE_INTEGER, workKey: null };
  };
}

/** The one sentence every AI Language prompt must carry (rules 8/9). */
export const AI_LANGUAGE_GUARDRAIL =
  'Use ONLY the works listed; never invent progression. Do not mention lesson numbers, reading levels, phases, or any work not on the list.';
