/**
 * English Curriculum — WeekSpec schema (THE single source of truth)
 *
 * Authored per docs/handoffs/PLAN_CURRICULUM_STUDIO_JUL10.md §5.
 * Every generator (Studio tab, build-week.mjs CLI, Montree pack seeder,
 * Conductor's Score manual) reads ONLY these types + the week-NN.json files.
 *
 * 🚨 CONTENT RULES (enforced by scripts/curriculum/validate-specs.mjs):
 * - Decodability: book text + material words use only letters taught ≤ this
 *   week + glue words already introduced. Weeks with book.readAloud=true are
 *   exempt for BOOK TEXT ONLY (materials always decodable).
 * - One song = one pattern, ~10–15 unique words.
 * - Every image referenced anywhere MUST appear in assets[].
 */

export type SoundType = 'vowel' | 'consonant' | 'digraph';

export interface SongSpec {
  /** 'sound' = stutter-pattern sound isolation; 'word' = sentence-frame song */
  role: 'sound' | 'word';
  title: string;
  /** Full lyric sheet, Suno-ready ([Verse]/[Hook] tags allowed). */
  lyrics: string;
  /** Style string passed to Suno (locked dark-trap base + per-song flavour). */
  sunoStyle: string;
  /** Extra Suno instructions (pronunciation guards, e.g. "never 'tuh'"). */
  sunoNotes?: string;
  /** Hosted mp3/video URL once produced (QR cards point here). */
  audioUrl?: string;
}

export interface BookSpread {
  /** 1-based spread number. */
  n: number;
  /** Left-page text (dark page). Empty string = wordless. */
  text: string;
  /** Word (lowercase) of the full-bleed right-page image — must match an assets[] entry. */
  image: string;
  /** Art direction note for the illustrator/MJ beyond the base prompt. */
  artNote?: string;
}

export interface BookSpec {
  title: string;
  /** true = teacher-read/echo-read (weeks 1–3 only). false = child-decodable. */
  readAloud: boolean;
  spreads: BookSpread[];
  /** Word list printed on the back cover. */
  backCoverWords: string[];
}

export interface AssetSpec {
  /** Exact filename: "<word>.png" or "<word>-coloring.png". */
  file: string;
  /** Where it's used: "book:3", "cards", "bingo", "coloring", "basket". */
  usedBy: string[];
  /** Ready-to-run Midjourney prompt (includes the locked style suffix). */
  mjPrompt: string;
}

export interface MaterialsSpec {
  /** Words on the 3-part cards (each needs an image asset). */
  threePartCards: string[];
  /** Full sentences for strips + matching (decodable for this week). */
  sentences: string[];
  /** word↔picture matching sheet words. */
  matching: string[];
  /** Bingo word pool (≥9; boards sample from it). */
  bingoPool: string[];
  /** Tracing worksheet: the letter + words to trace. */
  tracing: { letter: string; words: string[] };
  /** Coloring page words (each needs a *-coloring.png asset). */
  coloring: string[];
  /** Dictionary journal words (color + trace + write). */
  dictionary: string[];
  /** Free-form week extras (e.g. "vowel wall A poster", "Big Map"). */
  extras?: string[];
}

export interface WeekSpec {
  week: number;            // 1..26
  level: 1;
  sound: string;           // "a", "t", "qu"
  letterDisplay: string;   // "Aa", "Qu qu"
  soundType: SoundType;
  /** The story word of the week (drives the book + word song). */
  anchorWord: string;
  /** The ~4 new core vocabulary words introduced this week. */
  newWords: string[];
  /** Cumulative decodable pool available for review games (excl. newWords). */
  reviewBank: string[];
  /** Sight/glue words: introduced this week vs already known. */
  glue: { new: string[]; known: string[] };
  /** Heard-only words permitted in songs/oral work, never in print materials. */
  oralWords: string[];
  /** The week's sentence frame (the word-song + sentence-strip backbone). */
  sentenceFrame: string;
  /** Initial-sound object basket (oral work — NOT decodability-constrained). */
  soundBasket: string[];
  cast: { introduces: string | null; present: string[] };
  /** Celebration moment, if any ("FIRST DECODABLE BOOK", "VOWEL WALL COMPLETE"). */
  celebration: string | null;
  /** Vowel-wall event: which vowel lights up this week (null if none). */
  vowelLights: string | null;
  songs: SongSpec[];       // W1: one song; W2+: exactly two (sound, word)
  book: BookSpec;
  materials: MaterialsSpec;
  assets: AssetSpec[];
  /** One-line teacher focus for the week (full scripts live in the manual). */
  teacherFocus: string;
  /** Equivalent lesson-map lesson numbers (interop with the 128-lesson tracker). */
  lessonMapEquivalents: number[];
}

/** Level 2/3 skeleton entries — design only, no content yet. */
export interface SkeletonWeek {
  week: number;
  level: 2 | 3;
  unit: number;            // 1..4 within the level
  focus: string;           // "sh", "magic-e a_e", "vowel team ai/ay"
  notes: string;
}
