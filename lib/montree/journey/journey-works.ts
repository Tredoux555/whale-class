/**
 * Journey works — pure data/helpers behind the in-stage works of the English
 * Journey player. Everything derives from sources that already exist:
 * MASTER_CVC_WORDS (the master word list with emoji + miniatures) and the
 * Dark Phonics RAW lessons. Deterministic throughout — no Math.random, no
 * Date — so rounds are stable and testable; variety comes from a round
 * counter the player owns.
 */

import { BEGINNING_SOUND_OBJECTS, MASTER_CVC_WORDS } from '@/lib/data/master-words';
import { RAW } from '@/lib/montree/dark-phonics/lessons';
import { displayLessonNumber, mediaProxyUrl } from '@/lib/montree/dark-phonics/live-lesson';
import { segmentGraphemes } from '@/lib/montree/dark-phonics/live-activities';

/* -------------------------------------------------------------------------- */
/* Picture bank — every master word with its emoji, first sound precomputed    */
/* -------------------------------------------------------------------------- */

export interface PictureWord {
  word: string;
  emoji: string;
  firstSound: string;
}

export const PICTURE_BANK: PictureWord[] = MASTER_CVC_WORDS.flatMap((group) =>
  group.words.map((w) => ({
    word: w.word,
    emoji: w.image,
    firstSound: segmentGraphemes(w.word)[0] ?? w.word[0],
  }))
);

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
  const order = seededOrder(PICTURE_BANK.length, round + 1);
  const words = order.slice(0, 3).map((i) => PICTURE_BANK[i]);
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
  const order = seededOrder(PICTURE_BANK.length, round + 7);
  const target = PICTURE_BANK[order[0]];
  const distractors: PictureWord[] = [];
  for (const i of order.slice(1)) {
    const cand = PICTURE_BANK[i];
    if (cand.firstSound !== target.firstSound && !distractors.some((d) => d.firstSound === cand.firstSound)) {
      distractors.push(cand);
      if (distractors.length === 2) break;
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
/* "Starts with" objects — the sound-basket objects, on screen                 */
/* -------------------------------------------------------------------------- */

/** Emoji for the sound-basket object words (BEGINNING_SOUND_OBJECTS). Words
 *  without a solid, widely-supported emoji are simply left out. */
const EMOJI_FOR: Record<string, string> = {
  sun: '☀️', sock: '🧦', soap: '🧼', spoon: '🥄', star: '⭐', snake: '🐍',
  moon: '🌙', mouse: '🐭', map: '🗺️', mug: '☕',
  fish: '🐟', fork: '🍴', frog: '🐸', fox: '🦊', feather: '🪶',
  net: '🥅', nut: '🥜', nose: '👃', necklace: '📿',
  pen: '🖊️', pig: '🐷', pot: '🍲', pin: '📌', pear: '🍐', pan: '🍳',
  tent: '⛺', tiger: '🐯', tooth: '🦷', toy: '🧸',
  cup: '🥤', cat: '🐱', car: '🚗', cap: '🧢', key: '🔑', can: '🥫',
  hat: '🎩', hen: '🐔', horse: '🐴', house: '🏠', hammer: '🔨', hand: '✋',
  ball: '⚽', bat: '🦇', bed: '🛏️', bus: '🚌', bug: '🐛', box: '📦',
  dog: '🐶', duck: '🦆', door: '🚪', drum: '🥁', dish: '🍽️',
  goat: '🐐', gift: '🎁', grape: '🍇', guitar: '🎸', gold: '🪙',
  jet: '✈️', jeep: '🚙',
  van: '🚐', vest: '🦺', vase: '🏺', violin: '🎻', vine: '🌿',
  ring: '💍', rat: '🐀', rain: '🌧️', rabbit: '🐰', rocket: '🚀',
  leg: '🦵', lamp: '💡', log: '🪵', leaf: '🍃', lemon: '🍋',
  zebra: '🦓',
  ant: '🐜', apple: '🍎', ax: '🪓', alligator: '🐊', astronaut: '👨\u200d🚀', anchor: '⚓',
  egg: '🥚', elf: '🧝', elephant: '🐘', envelope: '✉️',
  insect: '🐞',
  octopus: '🐙', ox: '🐂', otter: '🦦', orange: '🍊',
  umbrella: '☂️', unicorn: '🦄',
};

/**
 * Objects that start with a sound — the Letter work's bottom row. Sourced
 * from the SOUND BASKETS (BEGINNING_SOUND_OBJECTS — the same objects the
 * physical baskets hold), rendered as emoji; falls back to the CVC picture
 * bank for the few sounds the baskets don't cover (w, x, y, qu).
 */
export function startsWith(sound: string, max = 4): PictureWord[] {
  const key = sound.toLowerCase() === 'c' || sound.toLowerCase() === 'ck' ? 'k' : sound.toLowerCase();
  const group = BEGINNING_SOUND_OBJECTS.find((g) => g.sound === key);
  const fromBaskets: PictureWord[] = (group?.objects ?? [])
    .filter((word) => EMOJI_FOR[word])
    .slice(0, max)
    .map((word) => ({ word, emoji: EMOJI_FOR[word], firstSound: key }));
  if (fromBaskets.length >= 2) return fromBaskets;
  return PICTURE_BANK.filter((w) => w.firstSound === sound.toLowerCase()).slice(0, max);
}
