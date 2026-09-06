// lib/montree/reports/reading-position.ts
//
// Rule 8: EVERYTHING A HUMAN READS IS DERIVED. This is the ONE place that
// turns a child's ledger into the sentence a parent reads about reading.
//
// It replaces the retired montree_child_english_progress pointer + the
// 1-128 lesson-map. A parent is never shown a lesson number again — the
// only two things they are told are:
//
//   working  → "currently working on the '<letter>' book (<book title>)"
//   finished → "finished the '<letter>' book"
//
// Both are computed from Dark Phonics work keys (rule 1) via the engine's
// ribbon derivation (rule 7: a letter is finished when its five works are
// mastered). Nothing here can invent a progression: if the child has touched
// no dp: work, the result is null and every caller stays silent.

import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import { replay, dayOf } from '@/lib/montree/tracking/ledger';
import {
  childCurrent,
  currentLetter,
  isLetterMastered,
  weekEnd,
} from '@/lib/montree/tracking/derive';
import type { Ledger } from '@/lib/montree/tracking/types';

export type ReadingPositionState = 'working' | 'finished';

export interface ReadingPosition {
  letter: string;
  bookTitle: string;
  state: ReadingPositionState;
  /** The exact parent-facing fragment. Never a lesson number. */
  phrase: string;
  /** The fragment as a whole sentence, with the child's first name. */
  sentence: string;
}

function bookTitleOf(letter: string): string {
  return TRACKER_LETTERS.find((l) => l.letter === letter)?.bookTitle ?? '';
}

/**
 * Where the child stands, as of the end of `periodEnd` (a 'YYYY-MM-DD').
 * When `periodStart` is given, a letter that BECAME mastered inside the
 * period reads as "finished" — that is this period's news. Otherwise the
 * child is described as working on their current letter.
 *
 * Returns null when there is nothing derived to say, so a caller that omits
 * the sentence entirely is always the correct fallback (rule 11: nothing is
 * guessed).
 */
export function readingPosition(
  ledger: Ledger,
  childId: string,
  periodStart?: string | null,
  periodEnd?: string | null,
): ReadingPosition | null {
  const endExclusive = periodEnd ?? null;
  const upTo = endExclusive
    ? ledger.events.filter((e) => dayOf(e.created_at) <= endExclusive)
    : ledger.events;

  const after = childCurrent(replay(upTo).state.current, childId);

  if (periodStart) {
    const before = childCurrent(
      replay(ledger.events.filter((e) => dayOf(e.created_at) < periodStart)).state.current,
      childId,
    );
    const finished = TRACKER_LETTERS.map((l) => l.letter).filter(
      (letter) =>
        isLetterMastered(after, ledger.works, letter) &&
        !isLetterMastered(before, ledger.works, letter),
    );
    if (finished.length > 0) {
      const letter = finished[finished.length - 1];
      return position(letter, 'finished', childName(ledger, childId));
    }
  }

  const letter = currentLetter(after, ledger.works);
  if (!letter) return null;

  // Never describe a child as "working on" a book they have not opened.
  const touched = [1, 2, 3, 4, 5].some(
    (n) => (after.get(`dp:${letter}:${n}`) ?? 'not_started') !== 'not_started',
  );
  if (!touched) return null;

  return position(letter, 'working', childName(ledger, childId));
}

/** Convenience for a Monday-anchored week. */
export function readingPositionForWeek(
  ledger: Ledger,
  childId: string,
  weekStart: string,
): ReadingPosition | null {
  const end = weekEnd(weekStart);
  const endInclusive = new Date(`${end}T00:00:00.000Z`);
  endInclusive.setUTCDate(endInclusive.getUTCDate() - 1);
  return readingPosition(ledger, childId, weekStart, endInclusive.toISOString().slice(0, 10));
}

function childName(ledger: Ledger, childId: string): string {
  const full = ledger.children.find((c) => c.id === childId)?.name ?? '';
  return full.trim().split(/\s+/)[0] || 'Your child';
}

function position(letter: string, state: ReadingPositionState, first: string): ReadingPosition {
  const title = bookTitleOf(letter);
  const phrase =
    state === 'finished'
      ? `finished the '${letter}' book`
      : `currently working on the '${letter}' book${title ? ` (${title})` : ''}`;
  const sentence =
    state === 'finished'
      ? `${first} ${phrase} this period.`
      : `${first} is ${phrase}.`;
  return { letter, bookTitle: title, state, phrase, sentence };
}
