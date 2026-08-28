/**
 * The English Journey — v2: a PLAYER, not a directory.
 *
 * v1 was a map of links out to thirty differently-styled games; the feedback
 * that killed it: "too much information — if the parents or I feel 'too much'
 * they will skip it. Think like the digital platform you created." So v2 is
 * the Writing Shelf model applied to the whole journey: six stages, each a
 * handful of STEPS, and every step is ONE WORK rendered INSIDE the same lit
 * stage (Midnight Studio skin) — the song plays there, the letter card shows
 * there, matching and I Spy run there, the writing trays ARE the tray
 * components. Nothing navigates away. Shelf-setup and printables exist per
 * step but stay collapsed behind a small 🧺 / 🖨️ toggle.
 *
 * Works are a closed union the player renders:
 *   song    — the lesson songs (video → picture fallback), stepping a range
 *   letter  — big letter card + phoneme TTS + "starts with" objects
 *   match   — picture-pair matching (pre-formal)
 *   i-spy   — oral first-sound game, by ear, no letters
 *   hearts  — heart-word ring with TTS
 *   books   — cover wall of letter books / readers for a lesson range
 *   tray    — one Writing Shelf tray, local state (ActivityStage)
 *   guide   — a single beautiful teacher card (no interaction)
 */

import type { ActivityType } from '@/lib/montree/dark-phonics/live-activities';

/* -------------------------------------------------------------------------- */

export type JourneyWork =
  | { kind: 'song'; lessons: [number, number] }
  | { kind: 'letter'; lessons: [number, number] }
  | { kind: 'match' }
  | { kind: 'i-spy' }
  | { kind: 'hearts' }
  | { kind: 'books'; which: 'books' | 'readers'; lessons: [number, number] }
  | { kind: 'tray'; tray: Exclude<ActivityType, 'none'> }
  | { kind: 'guide'; lines: string[] };

export interface JourneyLink {
  label: string;
  href: string;
}

export interface JourneyStep {
  slug: string;
  title: string;
  /** One line. The whole pitch. */
  goal: string;
  /** The "you say, once" line. */
  script?: string;
  work: JourneyWork;
  /** Collapsed behind 🧺 — the physical-shelf mirror of this step. */
  shelf?: { tray: string; make?: JourneyLink[] };
  /** Collapsed behind 🖨️ — what parents/teachers print. */
  print?: JourneyLink[];
}

export interface JourneyStage {
  slug: string;
  number: number;
  title: string;
  ages: string;
  steps: JourneyStep[];
}

/* -------------------------------------------------------------------------- */

export const JOURNEY: JourneyStage[] = [
  {
    slug: 'before-letters',
    number: 0,
    title: 'Before Letters',
    ages: '2½–4',
    steps: [
      {
        slug: 'songs',
        title: 'Just Sing',
        goal: 'The songs as pure joy — months before any formal work, the hooks do the teaching.',
        script: 'We just sing.',
        work: { kind: 'song', lessons: [1, 12] },
      },
      {
        slug: 'match',
        title: 'Match the Pictures',
        goal: 'Same and different — the pre-work of all reading.',
        script: 'Find the one that is the same.',
        work: { kind: 'match' },
        shelf: { tray: 'Object-to-picture baskets: 6 miniatures, 6 matching cards per basket.' },
      },
      {
        slug: 'i-spy',
        title: 'I Spy, By Ear',
        goal: 'Hearing the first sound of a word — entirely oral, no letters anywhere.',
        script: 'I spy, with my little eye, something that begins with /s/.',
        work: { kind: 'i-spy' },
        shelf: { tray: 'Sound baskets: 6 objects per sound — the same baskets Stage 1 puts letters to.' },
      },
    ],
  },
  {
    slug: 'sounds',
    number: 1,
    title: 'Sounds',
    ages: '3½–5',
    steps: [
      {
        slug: 'sound-of-the-day',
        title: 'The Sound of the Day',
        goal: 'One lesson, one sound: play the song, say the catchphrase, echo it back.',
        script: 'Model the sound twice; they echo.',
        work: { kind: 'song', lessons: [1, 27] },
        shelf: { tray: 'Sandpaper letter + the matching sound basket, one pair out per current sound.' },
      },
      {
        slug: 'the-letter',
        title: 'The Letter',
        goal: 'The shape that carries the sound — see it huge, hear it, find what starts with it.',
        work: { kind: 'letter', lessons: [1, 27] },
        shelf: { tray: 'Sand tray beside the sandpaper letters; metal insets for pencil control.' },
      },
      {
        slug: 'letter-books',
        title: 'The Letter Books',
        goal: 'The first "reading": I read the words, you shout the pictures.',
        script: 'I read the words; you shout the pictures!',
        work: { kind: 'books', which: 'books', lessons: [1, 18] },
        print: [{ label: 'Print the books at home', href: '/dark-phonics-books.html' }],
        shelf: { tray: 'Book corner: the current letter book with its printed works beneath it.' },
      },
    ],
  },
  {
    slug: 'first-words',
    number: 2,
    title: 'First Words',
    ages: '4–5½',
    steps: [
      {
        slug: 'sound-boxes',
        title: 'Sound Boxes',
        goal: 'Say the word slowly; push one counter into a box for every sound you hear.',
        work: { kind: 'tray', tray: 'sound-boxes' },
        shelf: {
          tray: 'Sound-box mats and counters — Writing Shelf tray 1.',
          make: [{ label: 'Sound-box mats', href: '/dark-phonics-shelf/01-sound-box-mats.pdf' }],
        },
      },
      {
        slug: 'movable-alphabet',
        title: 'The Movable Alphabet',
        goal: 'Build cat with three sounds; change one and it becomes bat.',
        script: 'Say the word. Find the sounds. Build it — then read it back.',
        work: { kind: 'tray', tray: 'word-builder' },
        shelf: { tray: 'Movable alphabet + CVC object boxes, one per vowel.' },
      },
      {
        slug: 'word-chains',
        title: 'Word Chains',
        goal: 'Change ONE sound, read the new word — the fastest decoding drill there is.',
        work: { kind: 'tray', tray: 'word-chains' },
        shelf: {
          tray: 'Chain board and cards — Writing Shelf tray 3.',
          make: [
            { label: 'Chain board', href: '/dark-phonics-shelf/02-chain-board.pdf' },
            { label: 'Chain cards', href: '/dark-phonics-shelf/03-chain-cards.pdf' },
          ],
        },
      },
    ],
  },
  {
    slug: 'reading',
    number: 3,
    title: 'Reading',
    ages: '4½–6',
    steps: [
      {
        slug: 'easy-readers',
        title: 'The Easy Readers',
        goal: 'Real books, 100% decodable the day they appear — every word is yours.',
        script: 'This whole book is yours — every word. Off you go.',
        work: { kind: 'books', which: 'readers', lessons: [13, 30] },
        print: [
          { label: 'Print the readers at home', href: '/dark-phonics-readers.html' },
          { label: 'Reading log', href: '/montree/library/tools/reading-log' },
        ],
        shelf: { tray: 'Reader basket: the current reader, the conquered ones, the log clipped behind.' },
      },
      {
        slug: 'heart-words',
        title: 'Heart Words',
        goal: 'The un-decodable few, learned by heart — never sounded out, never guessed.',
        work: { kind: 'hearts' },
        shelf: {
          tray: 'Heart-word ring on its own hook.',
          make: [{ label: 'Heart-word ring cards', href: '/dark-phonics-shelf/05-heart-word-ring-cards.pdf' }],
        },
      },
      {
        slug: 'sentences',
        title: 'First Sentences',
        goal: 'Lay the sentence out first — the composing is finished before the pencil comes out.',
        script: 'A sentence tells you who did what. Read me yours.',
        work: { kind: 'tray', tray: 'sentence-builder' },
        shelf: {
          tray: 'Word tin, sentence line, punctuation tiles, blank strips — Writing Shelf tray 5.',
          make: [
            { label: 'Punctuation tiles', href: '/dark-phonics-shelf/06-punctuation-tiles.pdf' },
            { label: 'Sentence strips', href: '/dark-phonics-shelf/07-lined-sentence-strips.pdf' },
          ],
        },
      },
    ],
  },
  {
    slug: 'writing',
    number: 4,
    title: 'Writing',
    ages: '4½–6',
    steps: [
      {
        slug: 'daily-loop',
        title: 'The Daily Loop',
        goal: 'Fifteen minutes, every day, same order — the routine is the lesson.',
        work: {
          kind: 'guide',
          lines: [
            '1 · Sound boxes — hear the sounds',
            '2 · Word chains — change one sound',
            '3 · Dictation — write it on paper',
            '4 · Free write — your story, your spelling',
            'Not a calendar. A signal.',
          ],
        },
        print: [{ label: 'Teacher script card', href: '/dark-phonics-shelf/11-teacher-script-card.pdf' }],
      },
      {
        slug: 'dictation',
        title: 'Dictation',
        goal: 'Hear it, say it back, write it on paper — then reveal and check yourself.',
        script: 'Listen. Say it back. Write it on your paper.',
        work: { kind: 'tray', tray: 'dictation' },
        shelf: {
          tray: 'Dictation flip cards feed the loop — Writing Shelf tray 4.',
          make: [{ label: 'Dictation flip cards', href: '/dark-phonics-shelf/04-dictation-flip-cards.pdf' }],
        },
      },
      {
        slug: 'story-books',
        title: 'Story Books',
        goal: 'Four pictures in story order, one line under each — spelled the way it sounds, never corrected.',
        script: 'Spell it the way it sounds. I want your story, not perfect letters.',
        work: { kind: 'tray', tray: 'story-books' },
        shelf: {
          tray: 'Picture-sequence envelopes + blank fold-books — Writing Shelf tray 6.',
          make: [
            { label: 'Picture sequences', href: '/dark-phonics-shelf/08-picture-sequence-sets.pdf' },
            { label: 'Fold-book template', href: '/dark-phonics-shelf/09-fold-book-template.pdf' },
          ],
        },
      },
      {
        slug: 'authors-chair',
        title: "Author's Chair",
        goal: 'He talks, you write word for word — the only tray that pays the child instead of costing him.',
        script: "Tell me the story. I'll write down exactly what you say.",
        work: { kind: 'tray', tray: 'authors-chair' },
        shelf: {
          tray: 'A chair kept for this and nothing else; story sheets on a clipboard.',
          make: [{ label: 'Story dictation sheet', href: '/dark-phonics-shelf/10-story-dictation-sheet.pdf' }],
        },
      },
      {
        slug: 'grammar-symbols',
        title: 'Grammar Symbols',
        goal: 'Grammar last, and smallest — the symbols land on sentences the child built himself.',
        script: 'Bring me the pig… now RUN with the pig!',
        work: { kind: 'tray', tray: 'grammar-symbols' },
        shelf: {
          tray: 'Symbol dish + control cards — Writing Shelf tray 8.',
          make: [
            { label: 'Symbol tokens', href: '/dark-phonics-shelf/12-grammar-symbol-tokens.pdf' },
            { label: 'Control cards', href: '/dark-phonics-shelf/13-grammar-control-cards.pdf' },
          ],
        },
      },
    ],
  },
  {
    slug: 'beyond-cvc',
    number: 5,
    title: 'Beyond CVC',
    ages: '5–6½',
    steps: [
      {
        slug: 'vowel-contrast',
        title: 'Short Vowels, Side by Side',
        goal: 'Review the code, then minimal pairs make the five short vowels unmistakable — cat? cot? cut?',
        work: { kind: 'song', lessons: [28, 37] },
      },
      {
        slug: 'digraphs',
        title: 'The Two-Letter Sounds',
        goal: 'sh, ch, th, wh — two letters, one sound.',
        work: { kind: 'song', lessons: [38, 42] },
      },
      {
        slug: 'blends',
        title: 'Blends to the Finish',
        goal: 'Ending blends, s/l/r blends — the last stretch of the code.',
        work: { kind: 'song', lessons: [43, 49] },
      },
      {
        slug: 'big-readers',
        title: 'The Big Readers',
        goal: 'Cat? Cot? Cut? to Big Splash — the readers that prove the journey is done.',
        work: { kind: 'books', which: 'readers', lessons: [36, 49] },
        print: [{ label: 'Print the readers at home', href: '/dark-phonics-readers.html' }],
      },
    ],
  },
];

export const JOURNEY_STEP_COUNT = JOURNEY.reduce((n, s) => n + s.steps.length, 0);
