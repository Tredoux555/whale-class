/**
 * Journey works — pure data/helpers behind the in-stage works of the English
 * Journey player. Everything derives from Dark Phonics sources only: the
 * owner's own photo bank (dark-bank.ts, DARK_BANK) for pictures, and the
 * Dark Phonics RAW lessons for books/songs. Deterministic throughout — no
 * Math.random, no Date — so rounds are stable and testable; variety comes
 * from a round counter the player owns.
 *
 * No emoji, no MASTER_CVC_WORDS, no BEGINNING_SOUND_OBJECTS. This should
 * draw exclusively from the Dark Phonics system.
 */

import { RAW } from '@/lib/montree/dark-phonics/lessons';
import { displayLessonNumber, mediaProxyUrl } from '@/lib/montree/dark-phonics/live-lesson';
import { DARK_BANK, type DarkPicture } from '@/lib/montree/journey/dark-bank';

/* -------------------------------------------------------------------------- */
/* Picture bank — re-export under the name the player components already use  */
/* -------------------------------------------------------------------------- */

/** Alias kept for the player components — same shape as DarkPicture, now
 *  carrying `imageUrl` (Dark Phonics photo art) instead of `emoji`. */
export type PictureWord = DarkPicture;

/** Deterministic shuffle shared by the works (same helper family as the shelf). */
export function seededOrder(n: number, seed: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  let s = (seed * 2654435761) >>> 0 || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* -------------------------------------------------------------------------- */
/* Match the Pictures — rounds of 3 pairs                                      */
/* -------------------------------------------------------------------------- */

export interface MatchRound {
  /** The 3 words in this round; the board shows each twice. */
  words: PictureWord[];
  /** Card layout: 6 slots, each an index 0-2 into `words`. */
  layout: number[];
}

export function getMatchRound(round: number): MatchRound {
  const order = seededOrder(DARK_BANK.length, round + 1);
  const words = order.slice(0, 3).map((i) => DARK_BANK[i]);
  const layout = seededOrder(6, round + 101).map((slot) => slot % 3);
  return { words, layout };
}

/* -------------------------------------------------------------------------- */
/* I Spy, By Ear — one target + two distractors with different first sounds    */
/* -------------------------------------------------------------------------- */

export interface ISpyRound {
  target: PictureWord;
  /** 3 options in display order (target included). */
  options: PictureWord[];
}

export function getISpyRound(round: number): ISpyRound {
  const order = seededOrder(DARK_BANK.length, round + 7);
  const target = DARK_BANK[order[0]];
  const distractors: PictureWord[] = [];
  // Prefer distinct first sounds from each other AND the target — DARK_BANK
  // spans 14 first-sound groups, so this always has options.
  for (const i of order.slice(1)) {
    const cand = DARK_BANK[i];
    if (cand.firstSound !== target.firstSound && !distractors.some((d) => d.firstSound === cand.firstSound)) {
      distractors.push(cand);
      if (distractors.length === 2) break;
    }
  }
  // Fallback (never expected to trigger with the current 38-word bank, but
  // keeps the round well-formed if the bank ever shrinks to <3 sound groups):
  // fill remaining slots with any word that merely differs from the target.
  if (distractors.length < 2) {
    for (const i of order.slice(1)) {
      const cand = DARK_BANK[i];
      if (cand.word !== target.word && !distractors.some((d) => d.word === cand.word)) {
        distractors.push(cand);
        if (distractors.length === 2) break;
      }
    }
  }
  const options = [target, ...distractors];
  const placed = seededOrder(options.length, round + 31).map((i) => options[i]);
  return { target, options: placed };
}

/* -------------------------------------------------------------------------- */
/* Books & readers — cover walls per lesson range                              */
/* -------------------------------------------------------------------------- */

export interface JourneyBook {
  slug: string;
  title: string;
  coverUrl: string;
  displayN: number;
  kind: 'book' | 'reader';
  /** Readers: the actual decodable book (PDF in the bucket) — open and read it. */
  pdfUrl?: string;
}

export function getJourneyBooks(which: 'books' | 'readers', lessons: [number, number]): JourneyBook[] {
  const out: JourneyBook[] = [];
  for (const lesson of RAW) {
    const displayN = displayLessonNumber(lesson.n);
    if (displayN < lessons[0] || displayN > lessons[1]) continue;
    if (which === 'books') {
      for (const b of lesson.books ?? []) {
        out.push({
          slug: b.slug,
          title: b.title,
          coverUrl: b.cover ?? mediaProxyUrl(`books/covers/${b.slug}.png`),
          displayN,
          kind: 'book',
        });
      }
    } else if (lesson.reader) {
      out.push({
        slug: lesson.reader.slug,
        title: lesson.reader.title,
        coverUrl: mediaProxyUrl(`books/covers/${lesson.reader.slug}.png`),
        displayN,
        kind: 'reader',
        // Same bucket path + version the library page's READ pill uses.
        pdfUrl: mediaProxyUrl(`readers/${lesson.reader.slug}.pdf`, 3),
      });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Songs — lesson media + catchphrase for the song player                      */
/* -------------------------------------------------------------------------- */

export interface JourneySong {
  displayN: number;
  sound: string;
  title: string;
  catchphrase: string;
  videoUrl: string;
  pictureUrl: string;
}

export function getJourneySong(displayN: number): JourneySong | null {
  const lesson = RAW.find((l) => displayLessonNumber(l.n) === displayN);
  if (!lesson) return null;
  const nn = String(lesson.n).padStart(2, '0');
  return {
    displayN,
    sound: lesson.sound,
    title: lesson.title,
    catchphrase: lesson.catchphrase,
    videoUrl: mediaProxyUrl(`videos/lesson-${nn}.mp4`),
    pictureUrl: mediaProxyUrl(`pictures/lesson-${nn}.png`),
  };
}

/* -------------------------------------------------------------------------- */
/* "Starts with" objects — the Letter work's bottom row                        */
/* -------------------------------------------------------------------------- */

/** A lesson's `sound` field ('c', 'k', 'ck', …) and DARK_BANK's firstSound
 *  ('c' or 'k' — segmentGraphemes never yields 'ck', since kit/cat/cot all
 *  segment to their single leading consonant) don't line up 1:1 for the c/k/ck
 *  family — the classroom teaches all three as "the same sound". Widen the
 *  match for exactly that family; every other sound matches literally. */
function soundKeys(sound: string): string[] {
  const s = sound.toLowerCase();
  return s === 'c' || s === 'k' || s === 'ck' ? ['c', 'k'] : [s];
}

/**
 * Photo cards for words that start with a sound — the Letter work's bottom
 * row. Sourced entirely from DARK_BANK (Dark Phonics photo art). Sounds with
 * no matching photo yet (e.g. 'qu', 'w', 'x', 'y', or the descriptive review
 * sounds) simply return an empty list — the row hides, no emoji fallback.
 */
export function startsWith(sound: string, max = 4): PictureWord[] {
  const keys = soundKeys(sound);
  return DARK_BANK.filter((w) => keys.includes(w.firstSound)).slice(0, max);
}
