/**
 * Dark Phonics Live — the Writing Shelf, digitised (trays 1–4).
 *
 * Pure content derivation for the four live-classroom activities:
 *   tray 1  sound-boxes   — Elkonin boxes: hear the word, push a counter per sound
 *   tray 2  word-builder  — movable alphabet: build the word one grapheme at a time
 *   tray 3  word-chains   — change ONE sound, read the new word
 *   tray 4  dictation     — hear it, write it on paper, then reveal to check
 *
 * DESIGN (mirrors live-lesson.ts exactly): NO content is authored here. Every
 * word comes from the lesson RAW data — this lesson's `decodable` list, the
 * cumulative decodable ledger (everything the child can read SO FAR), and
 * `heartWords`. Both classroom surfaces derive identical content from the
 * lesson number; only the tiny activity CURSOR travels over the live-state row
 * (see migration 341). Everything in this file is deterministic and pure — no
 * Math.random, no Date — so teacher and parent always compute the same thing.
 */

import { RAW, type RawLesson } from '@/lib/montree/dark-phonics/lessons';
import { rawLessonNumber } from '@/lib/montree/dark-phonics/live-lesson';
import {
  getSentenceBank,
  getWordTin,
  SEQUENCE_SETS,
} from '@/lib/montree/dark-phonics/writing-shelf-language';

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/** Mirrors the migration-343 CHECK constraint. 'none' = normal lesson slides. */
export type ActivityType =
  | 'none'
  | 'book-works'
  | 'sound-boxes'
  | 'word-builder'
  | 'word-chains'
  | 'dictation'
  | 'sentence-builder'
  | 'story-books'
  | 'authors-chair'
  | 'grammar-symbols';

/** The eight trays, in shelf order (shelf 1 = daily loop, shelf 2 = composition). */
export const TRAY_ORDER = [
  'sound-boxes',
  'word-builder',
  'word-chains',
  'dictation',
  'sentence-builder',
  'story-books',
  'authors-chair',
  'grammar-symbols',
] as const;

/**
 * Every activity the stage can carry, INCLUDING the ones that are not Writing
 * Shelf trays. 'book-works' (migration 343) is the pre-decodable Lesson 1 book
 * activity: it is deliberately NOT in TRAY_ORDER, because TRAY_ORDER is what
 * getWritingShelf() walks to build the shelf strip — a book lesson is not a
 * tray and must not appear there. Validation (client parse + the live-state
 * route) uses THIS list; the shelf UI uses TRAY_ORDER.
 */
export const ACTIVITY_TYPES = [...TRAY_ORDER, 'book-works'] as const;

/** The synced cursor — the ONLY activity data that crosses the wire. */
export interface LiveActivityState {
  /** Index into the activity's word list. */
  wordIndex: number;
  /** Progress within the word: boxes filled / letters placed / chain hops shown. */
  step: number;
  /** Answer shown (letters in boxes, completed word, dictation reveal). */
  revealed: boolean;
  /** Increments when the teacher fires TTS; the parent surface speaks on change. */
  sayNonce: number;
  /** Tray 5 (and carried into Tray 8): indices into the word tin's `all` list,
   *  in sentence order. Absent/[] = empty sentence line. */
  laid?: number[];
  /** Tray 5/8: index into PUNCTUATION_TILES (0 = no tile yet). */
  punct?: number;
  /** Tray 6: frame arrangement — SOURCE frame index per placed position. */
  order?: number[];
  /** Tray 8: symbol per sentence word (0 none, 1 naming, 2 doing, 3 describing). */
  marks?: number[];
  /** Tray 7: the scribed story, word for word. Capped server-side. */
  text?: string;

  /* ---- book-works (Lesson 1) --------------------------------------------- */
  /** Step 2: which phrase round (0..3). TEACHER-owned. */
  round?: number;
  /** Step 3: which yes/no question (0..5). TEACHER-owned. */
  qIndex?: number;
  /**
   * Step 1: card ids the STUDENT has matched, in the order they landed.
   * 🚨 STUDENT-OWNED — written by the parent device, merged server-side. A
   * teacher PATCH must not carry this key except on an explicit Reset.
   */
  matched?: string[];
  /**
   * Step 2: the card id the STUDENT dropped into the frame ('' = still empty).
   * 🚨 STUDENT-OWNED, same rule as `matched`.
   */
  drop?: string;
}

export const DEFAULT_ACTIVITY_STATE: LiveActivityState = {
  wordIndex: 0,
  step: 0,
  revealed: false,
  sayNonce: 0,
};

export interface ActivityWord {
  word: string;
  /** Digraph-aware grapheme split — one entry per SOUND, not per letter. */
  graphemes: string[];
}

export interface WritingShelfActivity {
  type: Exclude<ActivityType, 'none'>;
  trayNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  title: string;
  /** One-line teacher script, straight off the shelf's tray sign. */
  script: string;
  words: ActivityWord[];
  /** word-builder only: scrambled letter bank per word (parallel to `words`). */
  letterBanks?: string[][];
  /** sentence-builder + grammar-symbols: the word tin for this lesson. */
  tin?: ReturnType<typeof getWordTin>;
  /** grammar-symbols: decodable sentences unlocked at this lesson. */
  sentences?: ReturnType<typeof getSentenceBank>;
  /** story-books: the four-frame wordless sequence sets. */
  sequences?: typeof SEQUENCE_SETS;
}

/* -------------------------------------------------------------------------- */
/* Grapheme segmentation — digraph-aware, covers the 49-lesson sequence        */
/* -------------------------------------------------------------------------- */

/** Two-letter graphemes taught as ONE sound, longest-match-first scan. */
const DIGRAPHS = ['sh', 'ch', 'th', 'ck', 'ng', 'qu', 'ee', 'oo', 'ai', 'oa', 'ay', 'll', 'ss', 'ff', 'zz'];

/** Split a word into taught graphemes: "chick" → ['ch','i','ck']. */
export function segmentGraphemes(word: string): string[] {
  const w = word.toLowerCase();
  const out: string[] = [];
  let i = 0;
  while (i < w.length) {
    const two = w.slice(i, i + 2);
    if (DIGRAPHS.includes(two)) {
      out.push(two);
      i += 2;
    } else {
      out.push(w[i]);
      i += 1;
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Word sources — all from RAW, nothing authored                               */
/* -------------------------------------------------------------------------- */

const isPlainWord = (w: unknown): w is string => typeof w === 'string' && /^[a-z]+$/.test(w);

/** This lesson's own decodable words (may be empty for sound-only lessons). */
function lessonDecodable(lesson: RawLesson | undefined): string[] {
  return (lesson?.decodable ?? []).filter(isPlainWord);
}

/**
 * The cumulative decodable ledger — every decodable word introduced up to and
 * including this lesson. This is "what the child can actually read/spell so
 * far", the honest word bank for every tray (matches the library page's own
 * cumulative computation described in lessons.ts).
 */
export function decodableSoFar(displayLessonNum: number): string[] {
  const rawN = rawLessonNumber(displayLessonNum);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const lesson of RAW) {
    if (lesson.n > rawN) break;
    for (const w of lessonDecodable(lesson)) {
      if (!seen.has(w)) {
        seen.add(w);
        out.push(w);
      }
    }
  }
  return out;
}

export function heartWordsSoFar(displayLessonNum: number): string[] {
  const rawN = rawLessonNumber(displayLessonNum);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const lesson of RAW) {
    if (lesson.n > rawN) break;
    for (const w of lesson.heartWords ?? []) {
      if (isPlainWord(w) && !seen.has(w)) {
        seen.add(w);
        out.push(w);
      }
    }
  }
  return out;
}

/** Deterministic per-word shuffle — same order on both classroom surfaces. */
function seededShuffle<T>(items: T[], seedText: string): T[] {
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * The freshest slice of the ledger, newest lessons last: this lesson's own
 * decodable words first, topped up from the most recent earlier ones. Keeps
 * every tray anchored on TODAY'S teaching while still short enough for a
 * 25-minute class.
 */
function focusWords(displayLessonNum: number, max: number): string[] {
  const lesson = getRawLesson(displayLessonNum);
  const own = lessonDecodable(lesson ?? undefined);
  const ledger = decodableSoFar(displayLessonNum);
  const out = [...own];
  for (let i = ledger.length - 1; i >= 0 && out.length < max; i--) {
    if (!out.includes(ledger[i])) out.push(ledger[i]);
  }
  return out.slice(0, max);
}

function getRawLesson(displayLessonNum: number): RawLesson | null {
  const rawN = rawLessonNumber(displayLessonNum);
  return RAW.find((l) => l.n === rawN) ?? null;
}

const toActivityWords = (words: string[]): ActivityWord[] =>
  words.map((word) => ({ word, graphemes: segmentGraphemes(word) }));

/* -------------------------------------------------------------------------- */
/* Tray 3 — word chains: change one sound, read again                          */
/* -------------------------------------------------------------------------- */

/** Same grapheme count and exactly ONE differing position. */
function oneSoundApart(a: ActivityWord, b: ActivityWord): boolean {
  if (a.graphemes.length !== b.graphemes.length) return false;
  let diff = 0;
  for (let i = 0; i < a.graphemes.length; i++) {
    if (a.graphemes[i] !== b.graphemes[i]) diff += 1;
  }
  return diff === 1;
}

/**
 * Greedy chain walk over the cumulative ledger, starting from today's first
 * decodable word. Deterministic: candidates are tried in ledger order (the
 * teaching order), so the chain prefers recently-taught words. If the ledger
 * is still too small to chain (earliest lessons), the focus list itself is
 * served — the tray then works as "read the family" rather than a chain.
 */
export function buildWordChain(displayLessonNum: number, maxLength = 8): ActivityWord[] {
  const ledger = toActivityWords(decodableSoFar(displayLessonNum));
  const own = toActivityWords(lessonDecodable(getRawLesson(displayLessonNum) ?? undefined));

  const walk = (start: ActivityWord): ActivityWord[] => {
    const chain: ActivityWord[] = [start];
    const used = new Set<string>([start.word]);
    while (chain.length < maxLength) {
      const tail = chain[chain.length - 1];
      // Newest-taught candidates first — the chain should feel like this week.
      const next = [...ledger].reverse().find((c) => !used.has(c.word) && oneSoundApart(tail, c));
      if (!next) break;
      chain.push(next);
      used.add(next.word);
    }
    return chain;
  };

  // Today's words get first shot at starting the chain; when they can't chain
  // (late lessons introduce clustery words like "squid"), fall back through
  // the ledger newest-first and keep the best chain found. Deterministic.
  const starts = [...own, ...[...ledger].reverse().filter((l) => !own.some((o) => o.word === l.word))];
  let best: ActivityWord[] = [];
  for (const start of starts) {
    const chain = walk(start);
    if (chain.length > best.length) best = chain;
    if (best.length >= Math.min(6, maxLength)) break; // long enough — stop early, prefer today's start
  }

  if (best.length >= 3) return best;
  const fallback = toActivityWords(focusWords(displayLessonNum, maxLength));
  return fallback.length > 0 ? fallback : best;
}

/** Index of the grapheme that CHANGED from the previous chain word (-1 = none). */
export function chainDiffIndex(prev: ActivityWord | undefined, current: ActivityWord): number {
  if (!prev || prev.graphemes.length !== current.graphemes.length) return -1;
  let diff = -1;
  for (let i = 0; i < current.graphemes.length; i++) {
    if (prev.graphemes[i] !== current.graphemes[i]) {
      if (diff !== -1) return -1; // more than one change — don't pretend
      diff = i;
    }
  }
  return diff;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

const WORDS_PER_TRAY = 8;

/**
 * Build a tray's full content for a DISPLAY lesson number (1–49). Pure and
 * deterministic — call it identically on the teacher and parent surfaces.
 * Returns null only when the curriculum has no usable words yet (lessons 1–2
 * are sounds-only): the picker should disable those trays, not hide them.
 */
export function getWritingShelfActivity(
  type: Exclude<ActivityType, 'none'>,
  displayLessonNum: number
): WritingShelfActivity | null {
  // book-works is not a Writing Shelf tray — it has its own content module
  // (lib/montree/dark-phonics/book-works.ts) and its own stage component.
  if (type === 'book-works') return null;

  if (type === 'word-chains') {
    const chain = buildWordChain(displayLessonNum);
    if (chain.length === 0) return null;
    return {
      type,
      trayNumber: 3,
      title: 'Word Chains',
      script: 'Change one sound. Read the new word. Keep the chain going.',
      words: chain,
    };
  }

  const focus = focusWords(displayLessonNum, WORDS_PER_TRAY);

  if (type === 'sound-boxes') {
    if (focus.length === 0) return null;
    return {
      type,
      trayNumber: 1,
      title: 'Sound Boxes',
      script: 'Say the word slowly. Push one counter into a box for every sound you hear.',
      words: toActivityWords(focus),
    };
  }

  if (type === 'word-builder') {
    if (focus.length === 0) return null;
    const words = toActivityWords(focus);
    return {
      type,
      trayNumber: 2,
      title: 'Movable Alphabet',
      script: 'Say the word. Find the sounds. Build it — then read it back.',
      words,
      letterBanks: words.map((w) => seededShuffle(w.graphemes, w.word)),
    };
  }

  if (type === 'sentence-builder') {
    const tin = getWordTin(displayLessonNum);
    // A sentence needs at least a naming word, a little word and a doing word.
    if (tin.naming.length < 1 || tin.little.length < 1 || tin.doing.length < 1) return null;
    return {
      type,
      trayNumber: 5,
      title: 'Sentence Builder',
      script: 'A sentence tells you who did what. Lay it out first — then read me yours.',
      words: [],
      tin,
    };
  }

  if (type === 'story-books') {
    return {
      type,
      trayNumber: 6,
      title: 'Story Books',
      script: 'Put the four pictures in an order that tells a story. Then one line under each, in your book.',
      words: [],
      sequences: SEQUENCE_SETS,
    };
  }

  if (type === 'authors-chair') {
    return {
      type,
      trayNumber: 7,
      title: "Author's Chair",
      script: "Tell me the story. I'll write down exactly what you say.",
      words: [],
    };
  }

  if (type === 'grammar-symbols') {
    const sentences = getSentenceBank(displayLessonNum);
    const tin = getWordTin(displayLessonNum);
    // Works from the bank OR a sentence carried over from Tray 5 — but with no
    // bank at all (earliest lessons) the tray stays on the shelf.
    if (sentences.length === 0) return null;
    return {
      type,
      trayNumber: 8,
      title: 'Grammar Symbols',
      script: 'Read a sentence you built. Put the black triangle on the naming word, the red circle on the doing word.',
      words: [],
      sentences,
      tin,
    };
  }

  // tray 4 — dictation: decodable focus words plus the heart words so far
  const hearts = heartWordsSoFar(displayLessonNum);
  const dictation = [...focus, ...hearts.filter((h) => !focus.includes(h))].slice(0, WORDS_PER_TRAY + 2);
  if (dictation.length === 0) return null;
  return {
    type,
    trayNumber: 4,
    title: 'Dictation',
    script: 'Listen. Say it back. Write it on your paper — then we check together.',
    words: toActivityWords(dictation),
  };
}

/** Every tray for the picker, in shelf order; null = not enough words yet. */
export function getWritingShelf(displayLessonNum: number): Array<{
  type: (typeof TRAY_ORDER)[number];
  activity: WritingShelfActivity | null;
}> {
  return TRAY_ORDER.map((type) => ({
    type,
    activity: getWritingShelfActivity(type, displayLessonNum),
  }));
}

/* -------------------------------------------------------------------------- */
/* Parsing — the jsonb column arrives as unknown; never trust it              */
/* -------------------------------------------------------------------------- */

export function parseActivityType(raw: unknown): ActivityType {
  return typeof raw === 'string' && (ACTIVITY_TYPES as readonly string[]).includes(raw)
    ? (raw as ActivityType)
    : 'none';
}

/** Longest array the cursor may carry (a sentence line / frame order / marks row). */
export const ACTIVITY_ARRAY_MAX = 24;
/** Longest scribed story (Tray 7). Matches the route's validation cap. */
export const ACTIVITY_TEXT_MAX = 600;
/** Longest card id the book-works cursor may carry. Matches the route's cap. */
export const ACTIVITY_ID_MAX = 24;

function intArray(v: unknown): number[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: number[] = [];
  for (const x of v.slice(0, ACTIVITY_ARRAY_MAX)) {
    if (typeof x === 'number' && Number.isFinite(x)) out.push(Math.max(0, Math.round(x)));
  }
  return out;
}

export function parseActivityState(raw: unknown): LiveActivityState {
  const r = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : fallback;
  const state: LiveActivityState = {
    wordIndex: num(r.wordIndex, DEFAULT_ACTIVITY_STATE.wordIndex),
    step: num(r.step, DEFAULT_ACTIVITY_STATE.step),
    revealed: typeof r.revealed === 'boolean' ? r.revealed : DEFAULT_ACTIVITY_STATE.revealed,
    sayNonce: num(r.sayNonce, DEFAULT_ACTIVITY_STATE.sayNonce),
  };
  const laid = intArray(r.laid);
  if (laid !== undefined) state.laid = laid;
  const order = intArray(r.order);
  if (order !== undefined) state.order = order;
  const marks = intArray(r.marks);
  if (marks !== undefined) state.marks = marks;
  if (typeof r.punct === 'number' && Number.isFinite(r.punct)) {
    state.punct = Math.min(3, Math.max(0, Math.round(r.punct)));
  }
  if (typeof r.text === 'string') state.text = r.text.slice(0, ACTIVITY_TEXT_MAX);
  // book-works cursor. `round`/`qIndex` are teacher-owned; `matched`/`drop`
  // are the two student-owned keys (see LiveActivityState).
  if (r.round !== undefined) state.round = num(r.round, 0);
  if (r.qIndex !== undefined) state.qIndex = num(r.qIndex, 0);
  if (Array.isArray(r.matched)) {
    state.matched = r.matched
      .slice(0, ACTIVITY_ARRAY_MAX)
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.slice(0, ACTIVITY_ID_MAX));
  }
  if (typeof r.drop === 'string') state.drop = r.drop.slice(0, ACTIVITY_ID_MAX);
  return state;
}
