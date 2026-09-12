/**
 * Dark Phonics — Writing Shelf language data (shelf 2: trays 5–8).
 *
 * Four closed data sets. The first three sit over the SAME 61-word decodable
 * ledger the rest of the shelf uses (lessons.ts RAW), nothing outside it; the
 * fourth is an illustrated Tray 5 set whose vocabulary comes from the picture
 * books instead, and says so:
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
 *   SEQUENCE_SETS    — Tray 6's four-frame wordless picture sequences. Real
 *                      photo art (the owner's own Dark Phonics photography),
 *                      three sets: A (seed → flower), B (egg → hen), C
 *                      (apple → core). Frame URLs come from
 *                      lib/montree/journey/dark-bank.ts's seqFrameUrl — the
 *                      SAME public photo-bank bucket the journey player
 *                      reads from. No emoji, ever.
 *   SENTENCE_BUILDER_CARDS
 *                    — Tray 5's ILLUSTRATED two-tier sentence cards, ADDITIVE
 *                      to and independent of the word tin above. Twelve cards,
 *                      one reused image each, pink (3-letter CVC) and blue
 *                      (4-letter). Its words come from the Dark Phonics picture
 *                      books, so three of them (see SENTENCE_BUILDER_GAPS) are
 *                      outside the tin — computed and exposed, not hidden.
 *
 * Pure data + pure helpers. No React, no side effects.
 */

import { RAW } from '@/lib/montree/dark-phonics/lessons';
import { displayLessonNumber } from '@/lib/montree/dark-phonics/live-lesson';
import { seqFrameUrl } from '@/lib/montree/journey/dark-bank';

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
  /** Public photo-bank URL for this frame's real photo art. */
  imageUrl: string;
  /** One-line teacher-only caption (never shown to the child — wordless!). */
  hint: string;
}

export interface SequenceSet {
  slug: string;
  /** Teacher-only title. */
  title: string;
  frames: [SequenceFrame, SequenceFrame, SequenceFrame, SequenceFrame];
}

const seq = (slug: string, title: string, set: 'A' | 'B' | 'C' | 'D' | 'E', hints: [string, string, string, string]): SequenceSet => ({
  slug,
  title,
  frames: hints.map((hint, i) => ({
    hint,
    imageUrl: seqFrameUrl(set, (i + 1) as 1 | 2 | 3 | 4),
  })) as SequenceSet['frames'],
});

/** Five sets — the owner's own real photo sequences, mirroring the physical
 *  envelopes: A (seed → flower), B (egg → hen), C (apple → core),
 *  D (egg → butterfly), E (egg → frog). */
export const SEQUENCE_SETS: SequenceSet[] = [
  seq('seq-a', 'The seed and the flower', 'A', [
    'a seed is planted',
    'it is watered',
    'a little shoot comes up',
    'it grows into a flower',
  ]),
  seq('seq-b', 'The egg and the hen', 'B', [
    'an egg',
    'it cracks',
    'a chick pops out',
    'the hen and her chick',
  ]),
  seq('seq-c', 'The apple and the core', 'C', [
    'a whole apple',
    'she takes a bite',
    'she eats it down',
    'just the core is left',
  ]),
  seq('seq-d', 'The egg and the butterfly', 'D', [
    'a tiny egg on a leaf',
    'a caterpillar hatches and grows',
    'it makes a chrysalis',
    'a butterfly comes out',
  ]),
  seq('seq-e', 'The egg and the frog', 'E', [
    'frog eggs in the pond',
    'a tadpole hatches and swims',
    'it grows little legs',
    'a frog sits on a lily pad',
  ]),
];

/* -------------------------------------------------------------------------- */
/* Tray 5 — the ILLUSTRATED sentence builder (two tiers)                       */
/* -------------------------------------------------------------------------- */

/**
 * A SECOND, additive Tray 5 content set, independent of the word tin above.
 *
 * The tin (WORD_CLASSES / SENTENCE_BANK) is a sorting-and-composing work: loose
 * word cards, a blank line, no picture. These twelve cards are the step BEFORE
 * that for a child who cannot yet hold a whole sentence in his head — one
 * picture, one sentence, printed together. He reads the sentence off the card,
 * builds it, and the picture is the meaning that makes him want to.
 *
 * TWO TIERS, and the tier IS the difficulty, shown by colour so a child picks
 * his own level off the tray without asking:
 *   tier 1 · PINK — pure three-letter CVC (cat, sat, ant, sun, sad, hot, pig, wig)
 *   tier 2 · BLUE — four-letter words (naps, digs) and the two -ox rhymes
 *
 * ONE IMAGE PER CARD — the whole scene, not a picture per word. Every one of
 * the twelve reuses art the repo already has; no new artwork was drawn.
 *
 * TWO PATHS PER CARD, and they are not interchangeable:
 *   imageUrl — the committed, web-served, downscaled copy under
 *              public/dark-phonics-live/pages/. This is what the app renders.
 *              🚨 Same rule as book-works.ts: the art MUST live under
 *              public/dark-phonics-live/, which is a plain committed public
 *              directory. phonics-images/ is gitignored and never reaches the
 *              Docker image; art referenced there would 404 in a real class.
 *   printArt — the full-resolution original, repo-relative, for the print
 *              builder ONLY (scripts/curriculum/writing-shelf/
 *              build_14_sentence_builder_cards.py). Mostly gitignored; that is
 *              fine, because the PDF is built on the owner's Mac and it is the
 *              PDF, not the source art, that ships.
 */

export type BuilderTier = 1 | 2;

export interface SentenceBuilderCard {
  /** Stable id — also the card's name in the print builder. */
  slug: string;
  tier: BuilderTier;
  /** The tier's colour, on the card's border and its corner tab. */
  colour: 'pink' | 'blue';
  /** Exactly as it is printed and read. Sentence case, no full stop — the
   *  child ends it himself with a punctuation tile off the tray. */
  sentence: string;
  /** `sentence` split for the sentence line. */
  words: string[];
  /** Committed, web-served art. What the app renders. */
  imageUrl: string;
  /** Repo-relative full-resolution source. Print builder only. */
  printArt: string;
  /** COMPUTED: can this sentence be built out of the Tray 5 tin as it stands?
   *  False where a word is outside WORD_CLASSES — see SENTENCE_BUILDER_GAPS. */
  tinReady: boolean;
}

const PAGES = '/dark-phonics-live/pages';
const BOOKS = 'phonics-images/dark-phonics-books';
const STARTERS = 'phonics-images/satpin-v2/story-starters';

const card = (
  slug: string,
  tier: BuilderTier,
  sentence: string,
  imageUrl: string,
  printArt: string
): SentenceBuilderCard => {
  const words = sentence.split(' ');
  return {
    slug,
    tier,
    colour: tier === 1 ? 'pink' : 'blue',
    sentence,
    words,
    imageUrl,
    printArt,
    tinReady: words.every(
      (w) => WORD_CLASSES[w === 'I' ? 'I' : w.toLowerCase()] !== undefined
    ),
  };
};

/** The twelve illustrated cards, tier 1 then tier 2, easiest first in each. */
export const SENTENCE_BUILDER_CARDS: SentenceBuilderCard[] = [
  // ---- tier 1 · pink · pure three-letter CVC ----
  card('cat-sat', 1, 'The cat sat', `${PAGES}/the-sat/sat-p6.png`, 'scripts/curriculum/flashcards/tiles/SAT-p6.png'),
  card('ant-sat', 1, 'The ant sat', `${PAGES}/the-sat/sat-p1.png`, 'scripts/curriculum/flashcards/tiles/SAT-p1.png'),
  card('sun-sat', 1, 'The sun sat', `${PAGES}/the-sat/sat-p4.png`, 'scripts/curriculum/flashcards/tiles/SAT-p4.png'),
  card('ant-sad', 1, 'The ant is sad', `${PAGES}/the-sad/p1-ant.png`, `${BOOKS}/the-sad/p1-ant.png`),
  card('ant-hot', 1, 'The ant is hot', `${PAGES}/the-hot/p1-ant.png`, `${BOOKS}/the-hot/p1-ant.png`),
  card('pig-wig', 1, 'a pig in a wig', `${PAGES}/story-starters/pig-wig.png`, `${STARTERS}/pig-wig.png`),
  // ---- tier 2 · blue · four-letter words ----
  card('fox-box', 2, 'a fox in a box', `${PAGES}/story-starters/fox-box.png`, `${STARTERS}/fox-box.png`),
  card('ant-naps', 2, 'The ant naps', `${PAGES}/the-nap/p1-ant.png`, `${BOOKS}/the-nap/p1-ant.png`),
  card('ant-digs', 2, 'The ant digs', `${PAGES}/the-dig/p1-ant.png`, `${BOOKS}/the-dig/p1-ant.png`),
  card('cat-naps', 2, 'The cat naps', `${PAGES}/the-nap/p6-cat.png`, `${BOOKS}/the-nap/p6-cat.png`),
  card('cat-digs', 2, 'The cat digs', `${PAGES}/the-dig/p6-cat.png`, `${BOOKS}/the-dig/p6-cat.png`),
  card('sun-naps', 2, 'The sun naps', `${PAGES}/the-nap/p3-sun.png`, `${BOOKS}/the-nap/p3-sun.png`),
];

/**
 * Words these cards use that the Tray 5 tin does NOT yet hold, de-duplicated.
 * Computed, never hand-listed, so it empties itself the day the tin grows.
 *
 * This is a REAL gap, not a lint: a child handed "The sun naps" cannot build it
 * out of the tin, because there is no `sun` card in it. The cards still work as
 * reading-and-copying work (read the card, copy it onto a strip off sheet 05),
 * which is how they are used until the tin catches up. Surfaced here rather
 * than thrown on, because throwing would delete twelve usable cards over a
 * vocabulary decision that is the owner's to make, not this file's.
 */
export const SENTENCE_BUILDER_GAPS: string[] = [
  ...new Set(
    SENTENCE_BUILDER_CARDS.flatMap((c) => c.words).filter(
      (w) => WORD_CLASSES[w === 'I' ? 'I' : w.toLowerCase()] === undefined
    )
  ),
].sort();

/** Structural check — a typo can never ship silently, same rule as the bank. */
(() => {
  const seen = new Set<string>();
  for (const c of SENTENCE_BUILDER_CARDS) {
    if (seen.has(c.slug)) {
      throw new Error(`writing-shelf-language: duplicate builder card slug "${c.slug}"`);
    }
    seen.add(c.slug);
    if (c.colour !== (c.tier === 1 ? 'pink' : 'blue')) {
      throw new Error(`writing-shelf-language: card "${c.slug}" tier/colour disagree`);
    }
    if (!c.imageUrl.startsWith(`${PAGES}/`)) {
      throw new Error(
        `writing-shelf-language: card "${c.slug}" imageUrl must be a committed ` +
          `${PAGES}/ path — gitignored art 404s in the build`
      );
    }
  }
})();

/** The cards for one tier, or all twelve in tray order when tier is omitted. */
export function getSentenceBuilderCards(tier?: BuilderTier): SentenceBuilderCard[] {
  return tier === undefined
    ? SENTENCE_BUILDER_CARDS
    : SENTENCE_BUILDER_CARDS.filter((c) => c.tier === tier);
}

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
