/**
 * Dark Phonics — Writing Shelf language data (shelf 2: trays 5–8).
 *
 * Three closed data sets over the SAME 61-word decodable ledger the rest of
 * the shelf uses (lessons.ts RAW), nothing outside it:
 *
 *   WORD_CLASSES     — every ledger + heart word classified the way Tray 5's
 *                      word tin is sorted (naming / doing / describing /
 *                      little). Powers the tin's three compartments AND
 *                      Tray 8's grammar control cards.
 *   SENTENCE_BANK    — short sentences AUTHORED here (sentence composition is
 *                      inherently authored) but machine-checked: every word
 *                      must exist in WORD_CLASSES, and each sentence's unlock
 *                      lesson is COMPUTED from the ledger (the latest lesson
 *                      any of its words is introduced), never hand-set.
 *   SEQUENCE_SETS    — Tray 6's four-frame wordless picture sequences. Art
 *                      ships as emoji scene cards today; each frame carries a
 *                      bucket path (shelf/sequences/<set>/<n>.png) so real
 *                      illustrations dropped into the dark-phonics bucket
 *                      take over automatically, emoji as the fallback.
 *
 * Pure data + pure helpers. No React, no side effects.
 */

import { RAW } from '@/lib/montree/dark-phonics/lessons';
import { displayLessonNumber } from '@/lib/montree/dark-phonics/live-lesson';

/* -------------------------------------------------------------------------- */
/* Word classes — Tray 5's tin sorting and Tray 8's control cards              */
/* -------------------------------------------------------------------------- */

/** The physical tin's compartments (grammar-symbol colours in brackets). */
export type WordClass =
  | 'naming' // black triangle
  | 'doing' // red circle
  | 'describing' // small dark-blue triangle
  | 'little'; // no symbol at this level — articles, prepositions, pronouns

/**
 * Every word the shelf can lay on the sentence line. Closed set: the 61-word
 * decodable ledger + the heart words (a, I, ate) + "the" (taught by the four
 * "THE ___" letter books from lesson 3 even though RAW tracks it via books,
 * not heartWords). Ambiguous words take the class the CLASSROOM uses first
 * ("zip it!" is doing; the zip on a bag comes later).
 */
export const WORD_CLASSES: Record<string, WordClass> = {
  // little words (articles, prepositions, pronouns, verbs-to-be)
  a: 'little', I: 'little', the: 'little', at: 'little', it: 'little',
  is: 'little', in: 'little', an: 'little', under: 'little', off: 'little',
  // doing words
  sat: 'doing', sit: 'doing', sip: 'doing', spit: 'doing', spat: 'doing',
  tap: 'doing', pat: 'doing', nap: 'doing', naps: 'doing', snap: 'doing',
  nip: 'doing', dig: 'doing', run: 'doing', zip: 'doing', ate: 'doing',
  // describing words
  sad: 'describing', sick: 'describing', stuck: 'describing', big: 'describing',
  // naming words
  sap: 'naming', ant: 'naming', pan: 'naming', tin: 'naming', mat: 'naming',
  pad: 'naming', pig: 'naming', pit: 'naming', pot: 'naming', dog: 'naming',
  cot: 'naming', cat: 'naming', kit: 'naming', sock: 'naming', egg: 'naming',
  duck: 'naming', mud: 'naming', rug: 'naming', rat: 'naming', hat: 'naming',
  hen: 'naming', bed: 'naming', bug: 'naming', fan: 'naming', log: 'naming',
  croc: 'naming', jug: 'naming', jam: 'naming', van: 'naming', wig: 'naming',
  box: 'naming', fox: 'naming', yam: 'naming', bag: 'naming', quilt: 'naming',
  squid: 'naming',
};

/* -------------------------------------------------------------------------- */
/* Word → unlock lesson (DISPLAY number). Computed once from RAW.              */
/* -------------------------------------------------------------------------- */

function buildUnlockMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const lesson of RAW) {
    const display = displayLessonNumber(lesson.n);
    for (const w of [...(lesson.decodable ?? []), ...(lesson.heartWords ?? [])]) {
      const key = w === 'I' ? 'I' : w.toLowerCase();
      if (map[key] === undefined) map[key] = display;
    }
  }
  // "the": carried by the letter books (the-sat / the-tall at n=7 → display 3),
  // not by any heartWords entry — the one hand-set unlock in the file.
  if (map.the === undefined) map.the = 3;
  return map;
}

/** First DISPLAY lesson at which each shelf word is teachable. */
export const WORD_UNLOCK: Record<string, number> = buildUnlockMap();

const unlockOf = (word: string): number => {
  const key = word === 'I' ? 'I' : word.toLowerCase();
  return WORD_UNLOCK[key] ?? 999;
};

/* -------------------------------------------------------------------------- */
/* Tray 5 — the word tin                                                       */
/* -------------------------------------------------------------------------- */

export interface TinWord {
  word: string;
  cls: WordClass;
}

/**
 * The word tin for a DISPLAY lesson: every classified word unlocked so far,
 * grouped the way the physical tin is sorted. Stable order (ledger order
 * within each compartment) so teacher and parent surfaces always agree.
 */
export function getWordTin(displayLessonNum: number): {
  naming: TinWord[];
  doing: TinWord[];
  little: TinWord[];
  describing: TinWord[];
  /** Flat list in a FIXED order — sentence-line `laid` indices point here. */
  all: TinWord[];
} {
  const all: TinWord[] = Object.entries(WORD_CLASSES)
    .filter(([word]) => unlockOf(word) <= displayLessonNum)
    .map(([word, cls]) => ({ word, cls }));
  // Deterministic: sort by (unlock lesson, then alphabet) — newest words last
  // would churn earlier indices, so unlock-then-alpha keeps indices stable as
  // long as both sides use the same lesson number (they do — it's synced).
  all.sort((x, y) => unlockOf(x.word) - unlockOf(y.word) || x.word.localeCompare(y.word));
  return {
    naming: all.filter((w) => w.cls === 'naming'),
    doing: all.filter((w) => w.cls === 'doing'),
    little: all.filter((w) => w.cls === 'little'),
    describing: all.filter((w) => w.cls === 'describing'),
    all,
  };
}

/** The three punctuation tiles, in tray order. Index 0 = no tile yet. */
export const PUNCTUATION_TILES = ['', '.', '?', '!'] as const;

/* -------------------------------------------------------------------------- */
/* Sentence bank — authored, machine-checked                                   */
/* -------------------------------------------------------------------------- */

export interface ShelfSentence {
  words: string[];
  punct: '.' | '?' | '!';
  /** COMPUTED: the latest unlock lesson among the words. */
  unlockLesson: number;
}

const SENTENCE_SOURCE: Array<{ words: string[]; punct?: '.' | '?' | '!' }> = [
  { words: ['a', 'cat', 'sat'] },
  { words: ['I', 'sat', 'in', 'it'] },
  { words: ['the', 'pig', 'is', 'big'] },
  { words: ['a', 'rat', 'sat', 'in', 'a', 'pit'] },
  { words: ['the', 'cat', 'is', 'sad'] },
  { words: ['a', 'dog', 'is', 'in', 'the', 'mud'] },
  { words: ['the', 'fox', 'is', 'in', 'a', 'box'] },
  { words: ['a', 'duck', 'is', 'stuck', 'in', 'the', 'mud'] },
  { words: ['the', 'duck', 'is', 'sick'] },
  { words: ['a', 'hen', 'sat', 'in', 'the', 'pan'] },
  { words: ['I', 'ate', 'the', 'egg'] },
  { words: ['the', 'bug', 'is', 'in', 'the', 'jug'] },
  { words: ['a', 'rat', 'naps', 'in', 'a', 'hat'] },
  { words: ['I', 'dig', 'in', 'the', 'mud'] },
  { words: ['the', 'croc', 'ate', 'the', 'yam'] },
  { words: ['is', 'the', 'squid', 'big'], punct: '?' },
  { words: ['I', 'sit', 'in', 'the', 'van'] },
  { words: ['the', 'pig', 'sat', 'in', 'the', 'pot'] },
];

/** Full bank, unlock lessons computed; throws at module load if a sentence
 *  uses a word outside WORD_CLASSES (a typo can never ship silently). */
export const SENTENCE_BANK: ShelfSentence[] = SENTENCE_SOURCE.map(({ words, punct }) => {
  for (const w of words) {
    if (WORD_CLASSES[w === 'I' ? 'I' : w.toLowerCase()] === undefined) {
      throw new Error(`writing-shelf-language: sentence word "${w}" is not in WORD_CLASSES`);
    }
  }
  return {
    words,
    punct: punct ?? '.',
    unlockLesson: Math.max(...words.map(unlockOf)),
  };
});

/** Sentences fully decodable at this DISPLAY lesson, easiest first. */
export function getSentenceBank(displayLessonNum: number): ShelfSentence[] {
  return SENTENCE_BANK.filter((s) => s.unlockLesson <= displayLessonNum).sort(
    (a, b) => a.unlockLesson - b.unlockLesson || a.words.length - b.words.length
  );
}

/* -------------------------------------------------------------------------- */
/* Tray 6 — four-frame wordless picture sequences                              */
/* -------------------------------------------------------------------------- */

export interface SequenceFrame {
  /** Emoji scene — the shipping art. */
  emoji: string;
  /** One-line teacher-only caption (never shown to the child — wordless!). */
  hint: string;
  /** Bucket path for real art: shelf/sequences/<set>/<frame>.png. */
  imagePath: string;
}

export interface SequenceSet {
  slug: string;
  /** Teacher-only title. */
  title: string;
  frames: [SequenceFrame, SequenceFrame, SequenceFrame, SequenceFrame];
}

const seq = (slug: string, title: string, frames: Array<[string, string]>): SequenceSet => ({
  slug,
  title,
  frames: frames.map(([emoji, hint], i) => ({
    emoji,
    hint,
    imagePath: `shelf/sequences/${slug}/${i + 1}.png`,
  })) as SequenceSet['frames'],
});

/** Four sets, mirroring the physical envelopes (dog-and-bus is the shelf
 *  guide's own worked example). Emoji today; bucket art wins when present. */
export const SEQUENCE_SETS: SequenceSet[] = [
  seq('dog-bus', 'The dog and the bus', [
    ['🐕', 'a dog waits'],
    ['🚌', 'the bus comes'],
    ['🐕🚌', 'the dog gets on'],
    ['🐕💺', 'the dog sits down'],
  ]),
  seq('egg-hen', 'The egg and the hen', [
    ['🥚', 'an egg'],
    ['🥚💥', 'it cracks'],
    ['🐣', 'a chick pops out'],
    ['🐔🐣', 'the hen and her chick'],
  ]),
  seq('cat-fish', 'The cat and the fish', [
    ['🐱', 'a hungry cat'],
    ['🎣', 'it goes fishing'],
    ['🐟', 'a fish!'],
    ['🐱😋', 'the cat is happy'],
  ]),
  seq('seed-tree', 'The seed and the tree', [
    ['🌱', 'a little seed'],
    ['🌧️', 'rain falls'],
    ['🌳', 'it grows tall'],
    ['🍎🌳', 'apples!'],
  ]),
];

/* -------------------------------------------------------------------------- */
/* Tray labels — ONE source for every picker on every surface                  */
/* -------------------------------------------------------------------------- */

export const TRAY_LABELS: Record<string, string> = {
  'sound-boxes': 'Sound Boxes',
  'word-builder': 'Movable Alphabet',
  'word-chains': 'Word Chains',
  dictation: 'Dictation',
  'sentence-builder': 'Sentence Builder',
  'story-books': 'Story Books',
  'authors-chair': "Author's Chair",
  'grammar-symbols': 'Grammar Symbols',
};
