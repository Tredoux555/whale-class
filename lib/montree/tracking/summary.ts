// lib/montree/tracking/summary.ts
//
// Rule 9: TEMPLATES BEFORE AI. The English weekly summary is assembled from
// ticks, in code, with a hard 40-word cap counted here. AI may rephrase what
// this returns; it may never add a fact this file did not produce.
//
// Rules 8/9 together: the summary reads ONLY dp: and ws: keys. A Language
// work with any other key — "Beginning Sounds — Vocabulary", "Blue Series
// blends", anything a retired 1–128 pointer would have surfaced — cannot
// reach a parent, because it is filtered out before a sentence is built.

import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import { replayBefore, tzOf } from './ledger';
import {
  childCurrent,
  isLetterMastered,
  nextLetter,
  weekEnd,
  weekTicks,
  type ChildCurrent,
  type Tick,
} from './derive';
import type { Child, Ledger } from './types';

/** Rule 9's "starting to" phrases, keyed by the 1–5 work number. */
export const STARTING_TO: Record<number, string> = {
  1: 'recognise the characters and follow the story',
  2: 'match the pictures to the sentences',
  3: 'match whole sentences to their pictures',
  4: 'build the sentence by choosing the changing word',
  5: 'build full sentences from single words',
};

/** The Writing Shelf's middle sentence — the constitution leaves it as "…". */
export const WRITING_SHELF_PHRASE = 'form the letters with more control';

export const WORD_CAP = 40;

const LETTER_ORDER = new Map(TRACKER_LETTERS.map((l, i) => [l.letter, i]));

function subject(child: Child): string {
  return child.pronoun === 'he' ? 'He' : child.pronoun === 'she' ? 'She' : 'They';
}
function possessive(child: Child): string {
  return child.pronoun === 'he' ? 'his' : child.pronoun === 'she' ? 'her' : 'their';
}
function toBe(child: Child): string {
  return child.pronoun === 'they' ? 'are' : 'is';
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Drop whole sentences from the end until the text fits the cap. */
export function capToWords(sentences: readonly string[], cap = WORD_CAP): string {
  const kept: string[] = [];
  for (const s of sentences) {
    const candidate = [...kept, s].join(' ');
    if (countWords(candidate) > cap) break;
    kept.push(s);
  }
  if (kept.length === 0 && sentences.length > 0) {
    // A single opening sentence longer than the cap: trim words, keep the stop.
    const words = sentences[0].trim().split(/\s+/).slice(0, cap);
    const last = words[words.length - 1];
    if (!/[.!?]$/.test(last)) words[words.length - 1] = `${last.replace(/[.,;:]$/, '')}.`;
    return words.join(' ');
  }
  return kept.join(' ');
}

function dpParts(key: string): { letter: string; n: number } | null {
  const m = /^dp:([a-z]{1,2}):([1-5])$/.exec(key);
  return m ? { letter: m[1], n: Number(m[2]) } : null;
}

function wsTray(key: string): number | null {
  const m = /^ws:([0-9]+)$/.exec(key);
  return m ? Number(m[1]) : null;
}

function dpRank(key: string): number {
  const p = dpParts(key);
  return p ? (LETTER_ORDER.get(p.letter) ?? 999) * 10 + p.n : -1;
}

/** "work 3" · "works 1 to 5" · "work 2 and work 4" · "work 1, work 3 and work 5" */
export function workPhrase(ns: readonly number[]): string {
  const sorted = [...new Set(ns)].sort((a, b) => a - b);
  if (sorted.length === 1) return `work ${sorted[0]}`;
  const contiguous = sorted[sorted.length - 1] - sorted[0] + 1 === sorted.length;
  if (contiguous) return `works ${sorted[0]} to ${sorted[sorted.length - 1]}`;
  const parts = sorted.map((n) => `work ${n}`);
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The tray's MATERIAL. Real curriculum rows (migration 346) carry it in
 * `description` — name 'Writing Shelf tray 3', description 'Word chains'.
 * Older/hand-made rows packed both into the name ("Writing Shelf tray 3 —
 * Metal insets"), so the " — " split stays as the fallback.
 */
function trayNameOf(ledger: Ledger, key: string): string {
  const work = ledger.works.find((w) => w.work_key === key);
  const description = (work?.description ?? '').trim();
  if (description) return description;
  const name = work?.name ?? '';
  const parts = name.split(/\s+[—–-]\s+/);
  return (parts[1] ?? parts[0] ?? '').trim();
}

export interface Summary {
  text: string;
  words: number;
}

export function englishSummary(ledger: Ledger, childId: string, weekStart: string): Summary {
  const child = ledger.children.find((c) => c.id === childId);
  if (!child) return { text: '', words: 0 };
  const tz = tzOf(ledger);

  // Rules 8/9: only the two shelves a parent is told about, and never a
  // record correction — a correction fixes the ledger, it is not a week's work.
  const narratable = (t: Tick) =>
    (t.work_key.startsWith('dp:') || t.work_key.startsWith('ws:')) && t.event.source !== 'correction';
  const ticks = weekTicks(ledger.events, childId, weekStart, tz).filter(narratable);

  // §4b: both of these used to build a fresh filtered array per child per week —
  // 9.8 s of the class route's 29 s. replayBefore caches on (events, cutoff, tz).
  const before = childCurrent(replayBefore(ledger.events, weekStart, tz).state.current, childId);
  const after = childCurrent(
    replayBefore(ledger.events, weekEnd(weekStart), tz).state.current,
    childId
  );

  // Nothing seen this week — fall back to the class's book (scenario "Amir").
  //
  // TWO fallbacks, not one (2026-09-06 Whale-class burn-in). "continued with the
  // Dark Phonics 's' book this week" went to all nineteen children, including the
  // fourteen who have never had a single 's' event and the four flagged as unseen
  // for 15–88 days. "Continued" is a FACT about a week that did not happen —
  // rule 9 lets AI rephrase what this file produces and never add to it, so this
  // file must not invent it either (rule 11: nothing is guessed).
  //
  //   the child HAS been presented at least one work of the class letter
  //     → "continued with the … book this week"  (Amir: in the book, absent)
  //   the child has NOTHING on that letter
  //     → "has not started … yet. Next week we will introduce … work 1."
  if (ticks.length === 0) {
    const letter = ledger.classWeekLetter;
    const started = [1, 2, 3, 4, 5].some((n) => (after.get(`dp:${letter}:${n}`) ?? 'not_started') !== 'not_started');
    const sentences = started
      ? [
          `${child.name} continued with the Dark Phonics '${letter}' book this week.`,
          'Next week we will try to complete the series.',
        ]
      : [
          `${child.name} has not started the Dark Phonics '${letter}' book yet.`,
          `Next week we will introduce '${letter}' work 1.`,
        ];
    const text = capToWords(sentences);
    return { text, words: countWords(text) };
  }

  const dp = ticks.filter((t) => dpParts(t.work_key));
  if (dp.length > 0) return dpSummary(ledger, child, dp, before, after);
  return wsSummary(ledger, child, ticks);
}

function dpSummary(
  ledger: Ledger,
  child: Child,
  dp: Tick[],
  before: ChildCurrent,
  after: ChildCurrent
): Summary {
  const top = dp.reduce((a, t) => (dpRank(t.work_key) > dpRank(a.work_key) ? t : a));
  const letter = dpParts(top.work_key)!.letter;
  const mine = dp.filter((t) => dpParts(t.work_key)!.letter === letter);

  const advancedNs = [...new Set(mine.filter((t) => t.advanced).map((t) => dpParts(t.work_key)!.n))].sort(
    (a, b) => a - b
  );
  const allNs = [...new Set(mine.map((t) => dpParts(t.work_key)!.n))].sort((a, b) => a - b);
  const highestN = (advancedNs.length ? advancedNs : allNs)[
    (advancedNs.length ? advancedNs : allNs).length - 1
  ];

  const becameMastered =
    isLetterMastered(after, ledger.works, letter) &&
    !isLetterMastered(before, ledger.works, letter);

  const first = advancedNs.length
    ? `${child.name} did Dark Phonics '${letter}' ${workPhrase(advancedNs)}.`
    : `${child.name} continued with Dark Phonics '${letter}' work ${highestN}.`;

  const second = becameMastered
    ? `${subject(child)} can now build the sentences on ${possessive(child)} own.`
    : `${subject(child)} ${toBe(child)} starting to ${STARTING_TO[highestN]}.`;

  const next = becameMastered ? nextLetter(after, ledger.works, letter) : null;
  const third =
    becameMastered && next
      ? `Next week we will start the '${next}' book.`
      : 'Next week we will try to complete the series.';

  const text = capToWords([first, second, third]);
  return { text, words: countWords(text) };
}

function wsSummary(ledger: Ledger, child: Child, ticks: Tick[]): Summary {
  const top = ticks.reduce((a, t) => ((wsTray(t.work_key) ?? 0) > (wsTray(a.work_key) ?? 0) ? t : a));
  const n = wsTray(top.work_key)!;
  const trayName = trayNameOf(ledger, top.work_key);
  // The material is optional: a tray whose curriculum row this classroom no
  // longer carries (or one with a blank name/description) has no material to
  // name, and a parent must not be shown "tray 9, ." — drop the clause.
  const sentences = [
    trayName
      ? `${child.name} worked on Writing Shelf tray ${n}, ${trayName}.`
      : `${child.name} worked on Writing Shelf tray ${n}.`,
    `${subject(child)} ${toBe(child)} starting to ${WRITING_SHELF_PHRASE}.`,
    `Next week we will continue with tray ${n}.`,
  ];
  const text = capToWords(sentences);
  return { text, words: countWords(text) };
}
