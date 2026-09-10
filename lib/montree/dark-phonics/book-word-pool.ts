// lib/montree/dark-phonics/book-word-pool.ts
//
// ONE BOOK → THE WORDS IT DRILLS. The join the CVC Bingo tool needs, and the
// only place it is made.
//
// A Dark Phonics tracker row is keyed `dp:<letter>:<n>` (tracker-works.ts), so
// what the tracker knows about a room is a set of LETTERS. What a bingo board
// needs is WORDS. The bridge is lessons.ts's `RAW[].decodable` — the NEW-word
// list printed at the back of each letter's reader, i.e. exactly "the CVC words
// this book drills". It is machine-mirrored from the book generator
// (books_def.py / bookNN.py), so it stays right when a book is re-cut.
//
// 🚨 `decodable` IS THE SOURCE, NOT `cast[]`. book-works.ts's `cast[]` is the
// four PICTURE characters of the read-along ('ant', 'alligator', 'anteater',
// 'ambulance') — the art, not the drill. Lessons 1 and 2 (s, a) teach sounds
// only and carry no `decodable` at all; for those two the lesson's hard-card
// `words` are used, filtered down to the shelf's own decodable ledger
// (WORD_CLASSES) so 'snake' and 'apple' never reach a bingo square while
// 'sock' and 'ant' do.
//
// 🚨 PICTURES ARE DARK PHONICS PHOTOS OR NOTHING. `photoUrl()` from
// journey/dark-bank.ts is the ONLY image source here. A word with no photo of
// the owner's own gets a text square — never an emoji, never a stand-in from
// another bank.
//
// Pure data + pure helpers. Imported by the API route AND by the client page
// (the manual fallback picker needs the same answer offline), so nothing in
// here may touch the network, the clock or Math.random.

import { RAW } from '@/lib/montree/dark-phonics/lessons';
import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import { WORD_CLASSES } from '@/lib/montree/dark-phonics/writing-shelf-language';
import { photoUrl } from '@/lib/montree/journey/dark-bank';

/** One book a room has touched, as the tool names it. */
export interface PoolBook {
  /** The tracker letter — 's', 'ck', 'qu'. */
  letter: string;
  /** The book's slug, e.g. 'the-cot'. */
  slug: string;
  /** The book's printed title. */
  title: string;
  /** ISO timestamp of the most recent tracker event for this book, when known. */
  lastAt?: string;
}

/** One word, with the Dark Phonics photo if the owner has shot it. */
export interface PoolWord {
  word: string;
  hasPhoto: boolean;
  photoUrl?: string;
}

/** letter → the RAW lesson that teaches it. `sound` is the letter for the 27
 *  letter lessons; the later review/blend lessons carry labels instead and are
 *  simply never asked for here. */
const LESSON_BY_SOUND = new Map(RAW.map((l) => [l.sound, l]));

/**
 * The words a letter's book drills, lower-cased and de-duplicated, in the
 * book's own order. Empty for a letter with no book data yet.
 */
export function wordsForLetter(letter: string): string[] {
  const lesson = LESSON_BY_SOUND.get(letter);
  if (!lesson) return [];

  const source =
    lesson.decodable && lesson.decodable.length > 0
      ? lesson.decodable
      : // Sounds-only lessons (s, a): the hard-card vocab, kept only where the
        // shelf's ledger agrees the word is actually decodable.
        (lesson.words ?? []).filter((w) => w.toLowerCase() in WORD_CLASSES);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of source) {
    const word = raw.toLowerCase();
    if (seen.has(word)) continue;
    seen.add(word);
    out.push(word);
  }
  return out;
}

/** Every Dark Phonics book the tracker knows, in teaching order — the manual
 *  fallback picker's full list. Letters with no words yet are dropped: a
 *  checkbox that adds nothing is worse than no checkbox. */
export const ALL_POOL_BOOKS: readonly PoolBook[] = TRACKER_LETTERS.filter(
  (l) => wordsForLetter(l.letter).length > 0
).map((l) => ({ letter: l.letter, slug: l.slug, title: l.bookTitle }));

/** The tracker's own record for a letter, as a PoolBook. */
export function bookForLetter(letter: string): PoolBook | null {
  const def = TRACKER_LETTERS.find((l) => l.letter === letter);
  if (!def) return null;
  return { letter: def.letter, slug: def.slug, title: def.bookTitle };
}

/** Attach the Dark Phonics photo (or nothing) to each word, de-duplicating and
 *  preserving the order given. */
export function toPoolWords(words: readonly string[]): PoolWord[] {
  const seen = new Set<string>();
  const out: PoolWord[] = [];
  for (const raw of words) {
    const word = raw.toLowerCase();
    if (seen.has(word)) continue;
    seen.add(word);
    const url = photoUrl(word);
    out.push(url ? { word, hasPhoto: true, photoUrl: url } : { word, hasPhoto: false });
  }
  return out;
}

/** letters (most-recent book first) → the flat, de-duplicated word pool. */
export function poolWordsForLetters(letters: readonly string[]): PoolWord[] {
  const words: string[] = [];
  for (const letter of letters) words.push(...wordsForLetter(letter));
  return toPoolWords(words);
}
