// lib/montree/english-sequence/lesson-map.ts
//
// 🚨 Session 119 (post-overnight) — canonical catalog of the 128-lesson
// English progression that Tredoux built into the Library at
// /public/whale-reading-content.html (Pink Phase) +
// /public/whale-reading-content-blue.html (Blue) +
// /public/whale-reading-content-green.html (Green).
//
// THIS IS THE SOURCE OF TRUTH for everything position-related. The DB
// only stores `current_lesson` (1..128) + `mastered_lessons` (int[]);
// this file maps those numbers to lesson names, phases, letter/sound
// pools, and (Phase 2) the curriculum-work names that should auto-
// advance a child when confirmed in photo audit.
//
// Architectural rule (#231, Session 119):
// LESSON_MAP is a CONSTANT. New lessons get appended only with explicit
// approval — the order is load-bearing and changes would invalidate
// every existing child's `current_lesson` and `mastered_lessons`. If
// the underlying curriculum HTML changes order, this file MUST be
// updated in lockstep.

export type EnglishPhase = 'pink' | 'blue' | 'green';

export interface EnglishLesson {
  /** 1..128 — load-bearing. Don't renumber. */
  num: number;
  phase: EnglishPhase;
  /** Letter or grapheme introduced this lesson, e.g. 's', 'th', 'sh', 'ai'. */
  letter: string;
  /** IPA sound, e.g. '/s/', '/θ/', '/ʃ/', '/eɪ/'. */
  sound: string;
  /** Short human label used in UI: "s", "sh", "Magic e", "long ee". */
  label: string;
}

// ───────────────────────────────────────────────────────────────
// PINK PHASE — Lessons 1-53.
// UFLI-aligned SATPIN-first ordering. See:
//   /public/whale-reading-content.html
//   /scripts/lesson-content/build_pink.py
// Mandarin-L1 articulation notes live in the HTML, not here.
// ───────────────────────────────────────────────────────────────
const PINK: EnglishLesson[] = [
  // Phase 1 — The Alphabet (L1-34, UFLI SATPIN order then high-frequency)
  { num: 1,  phase: 'pink', letter: 's',  sound: '/s/',  label: 's' },
  { num: 2,  phase: 'pink', letter: 'a',  sound: '/ă/',  label: 'a (short)' },
  { num: 3,  phase: 'pink', letter: 't',  sound: '/t/',  label: 't' },
  { num: 4,  phase: 'pink', letter: 'p',  sound: '/p/',  label: 'p' },
  { num: 5,  phase: 'pink', letter: 'i',  sound: '/ĭ/',  label: 'i (short)' },
  { num: 6,  phase: 'pink', letter: 'n',  sound: '/n/',  label: 'n' },
  { num: 7,  phase: 'pink', letter: 'm',  sound: '/m/',  label: 'm' },
  { num: 8,  phase: 'pink', letter: 'd',  sound: '/d/',  label: 'd' },
  { num: 9,  phase: 'pink', letter: 'g',  sound: '/g/',  label: 'g (hard)' },
  { num: 10, phase: 'pink', letter: 'o',  sound: '/ŏ/',  label: 'o (short)' },
  { num: 11, phase: 'pink', letter: 'c',  sound: '/k/',  label: 'c (hard)' },
  { num: 12, phase: 'pink', letter: 'k',  sound: '/k/',  label: 'k' },
  { num: 13, phase: 'pink', letter: 'ck', sound: '/k/',  label: 'ck' },
  { num: 14, phase: 'pink', letter: 'e',  sound: '/ĕ/',  label: 'e (short)' },
  { num: 15, phase: 'pink', letter: 'u',  sound: '/ŭ/',  label: 'u (short)' },
  { num: 16, phase: 'pink', letter: 'r',  sound: '/r/',  label: 'r' },
  { num: 17, phase: 'pink', letter: 'h',  sound: '/h/',  label: 'h' },
  { num: 18, phase: 'pink', letter: 'b',  sound: '/b/',  label: 'b' },
  { num: 19, phase: 'pink', letter: 'f',  sound: '/f/',  label: 'f' },
  { num: 20, phase: 'pink', letter: 'l',  sound: '/l/',  label: 'l' },
  { num: 21, phase: 'pink', letter: 'j',  sound: '/j/',  label: 'j' },
  { num: 22, phase: 'pink', letter: 'v',  sound: '/v/',  label: 'v' },
  { num: 23, phase: 'pink', letter: 'w',  sound: '/w/',  label: 'w' },
  { num: 24, phase: 'pink', letter: 'x',  sound: '/ks/', label: 'x' },
  { num: 25, phase: 'pink', letter: 'y',  sound: '/y/',  label: 'y (consonant)' },
  { num: 26, phase: 'pink', letter: 'z',  sound: '/z/',  label: 'z' },
  { num: 27, phase: 'pink', letter: 'qu', sound: '/kw/', label: 'qu' },
  // Lessons 28-34: review + heart words + sentence building (no new graphemes)
  { num: 28, phase: 'pink', letter: '—',  sound: '—',    label: 'CVC review · the / a / is' },
  { num: 29, phase: 'pink', letter: '—',  sound: '—',    label: 'CVC review · I / and / to' },
  { num: 30, phase: 'pink', letter: '—',  sound: '—',    label: 'CVC review · was / for / on' },
  { num: 31, phase: 'pink', letter: '—',  sound: '—',    label: 'Sentence building · short a/i' },
  { num: 32, phase: 'pink', letter: '—',  sound: '—',    label: 'Sentence building · short o/u' },
  { num: 33, phase: 'pink', letter: '—',  sound: '—',    label: 'Sentence building · short e' },
  { num: 34, phase: 'pink', letter: '—',  sound: '—',    label: 'All-vowels review + heart words' },
  // Phase 2 — CVC consolidation + FLSZ doubling (L35-41)
  { num: 35, phase: 'pink', letter: '—',  sound: '/ă/',  label: 'CVC drill — short a' },
  { num: 36, phase: 'pink', letter: '—',  sound: '/ĭ/',  label: 'CVC drill — short i' },
  { num: 37, phase: 'pink', letter: '—',  sound: '/ŏ/',  label: 'CVC drill — short o' },
  { num: 38, phase: 'pink', letter: '—',  sound: '/ĕ/',  label: 'CVC drill — short e' },
  { num: 39, phase: 'pink', letter: '—',  sound: '/ŭ/',  label: 'CVC drill — short u' },
  { num: 40, phase: 'pink', letter: '—',  sound: '—',    label: 'Mixed minimal pairs · cat/cot/cut' },
  { num: 41, phase: 'pink', letter: 'ff/ll/ss/zz', sound: '—', label: 'FLSZ doubling rule' },
  // Phase 3 — Digraphs + Blends (L42-53)
  { num: 42, phase: 'pink', letter: 'sh', sound: '/ʃ/',  label: 'sh' },
  { num: 43, phase: 'pink', letter: 'ch', sound: '/tʃ/', label: 'ch' },
  { num: 44, phase: 'pink', letter: 'th', sound: '/θ/',  label: 'th (voiceless)' },
  { num: 45, phase: 'pink', letter: 'th', sound: '/ð/',  label: 'th (voiced)' },
  { num: 46, phase: 'pink', letter: 'wh', sound: '/w/',  label: 'wh' },
  { num: 47, phase: 'pink', letter: '—',  sound: '—',    label: 'Ending blends · -st/-nd/-mp/-nt' },
  { num: 48, phase: 'pink', letter: 's-', sound: '—',    label: 'Beginning s-blends · sp/st/sn/sm/sw' },
  { num: 49, phase: 'pink', letter: 'l-', sound: '—',    label: 'l-blends · bl/cl/fl/gl/pl/sl' },
  { num: 50, phase: 'pink', letter: 'r-', sound: '—',    label: 'r-blends · br/cr/dr/fr/gr/pr/tr' },
  { num: 51, phase: 'pink', letter: 'str/spl', sound: '—', label: 'Triple blends · str/spl/spr/scr' },
  { num: 52, phase: 'pink', letter: 'thr/shr', sound: '—', label: 'thr / shr' },
  { num: 53, phase: 'pink', letter: '—',  sound: '—',    label: 'Pink Phase consolidation' },
];

// ───────────────────────────────────────────────────────────────
// BLUE PHASE — Lessons 54-83 (30 lessons).
// VCe / soft c-g / r-controlled vowels / open syllables / -le.
// See /public/whale-reading-content-blue.html.
// ───────────────────────────────────────────────────────────────
const BLUE: EnglishLesson[] = [
  // VCe — Magic e (L54-57)
  { num: 54, phase: 'blue', letter: 'a_e', sound: '/ā/', label: 'Magic e — a_e' },
  { num: 55, phase: 'blue', letter: 'i_e', sound: '/ī/', label: 'Magic e — i_e' },
  { num: 56, phase: 'blue', letter: 'o_e', sound: '/ō/', label: 'Magic e — o_e' },
  { num: 57, phase: 'blue', letter: 'u_e', sound: '/ū/', label: 'Magic e — u_e' },
  // Soft c / g (L58-59)
  { num: 58, phase: 'blue', letter: 'c',   sound: '/s/', label: 'Soft c (before e/i/y)' },
  { num: 59, phase: 'blue', letter: 'g',   sound: '/j/', label: 'Soft g (before e/i/y)' },
  // -tch / -dge (L60-61)
  { num: 60, phase: 'blue', letter: '-tch', sound: '/tʃ/', label: '-tch (after short vowel)' },
  { num: 61, phase: 'blue', letter: '-dge', sound: '/j/',  label: '-dge (after short vowel)' },
  // y as a vowel (L62-64)
  { num: 62, phase: 'blue', letter: 'y',   sound: '/ī/', label: 'y as long i (end of word)' },
  { num: 63, phase: 'blue', letter: 'y',   sound: '/ē/', label: 'y as long e (end of word)' },
  { num: 64, phase: 'blue', letter: 'y',   sound: '/ĭ/', label: 'y as short i (middle)' },
  // Inflections (L65-67)
  { num: 65, phase: 'blue', letter: '-s',  sound: '—',   label: 'Plural -s' },
  { num: 66, phase: 'blue', letter: '-ing', sound: '—',  label: '-ing (add to base)' },
  { num: 67, phase: 'blue', letter: '-ed', sound: '—',   label: '-ed (three sounds: /t/, /d/, /ɪd/)' },
  // Compounds + 2-syllable + doubling (L68-70)
  { num: 68, phase: 'blue', letter: '—',   sound: '—',   label: 'Compound words' },
  { num: 69, phase: 'blue', letter: '—',   sound: '—',   label: 'Two-syllable words' },
  { num: 70, phase: 'blue', letter: '—',   sound: '—',   label: 'Doubling rule (FLSZ + 1-syl CVC)' },
  // R-controlled vowels (L71-75)
  { num: 71, phase: 'blue', letter: 'ar',  sound: '/ɑr/', label: 'ar' },
  { num: 72, phase: 'blue', letter: 'or',  sound: '/ɔr/', label: 'or' },
  { num: 73, phase: 'blue', letter: 'er',  sound: '/ɜr/', label: 'er' },
  { num: 74, phase: 'blue', letter: 'ir',  sound: '/ɜr/', label: 'ir' },
  { num: 75, phase: 'blue', letter: 'ur',  sound: '/ɜr/', label: 'ur' },
  // Open syllables + special endings (L76-83)
  { num: 76, phase: 'blue', letter: '—',   sound: '—',   label: 'Open syllables (long vowel + open)' },
  { num: 77, phase: 'blue', letter: '-ind/-ild/-old', sound: '—', label: '-ind / -ild / -old' },
  { num: 78, phase: 'blue', letter: 'C-le', sound: '—',  label: 'Consonant + -le' },
  { num: 79, phase: 'blue', letter: 'wa-/wo-', sound: '—', label: 'w-influenced a/o' },
  { num: 80, phase: 'blue', letter: '-all/-alk', sound: '—', label: '-all / -alk family' },
  { num: 81, phase: 'blue', letter: '—',   sound: '—',   label: 'Blue review — VCe + soft c/g' },
  { num: 82, phase: 'blue', letter: '—',   sound: '—',   label: 'Blue review — r-controlled' },
  { num: 83, phase: 'blue', letter: '—',   sound: '—',   label: 'Blue Phase consolidation' },
];

// ───────────────────────────────────────────────────────────────
// GREEN PHASE — Lessons 84-128 (45 lessons).
// Vowel teams / diphthongs / silent letters / -tion / suffixes /
// prefixes / Greek+Latin roots / contractions.
// See /public/whale-reading-content-green.html.
// ───────────────────────────────────────────────────────────────
const GREEN: EnglishLesson[] = [
  // Vowel teams (L84-89)
  { num: 84, phase: 'green', letter: 'ai',  sound: '/ā/', label: 'ai' },
  { num: 85, phase: 'green', letter: 'ay',  sound: '/ā/', label: 'ay' },
  { num: 86, phase: 'green', letter: 'ee',  sound: '/ē/', label: 'ee' },
  { num: 87, phase: 'green', letter: 'ea',  sound: '/ē/', label: 'ea (long e)' },
  { num: 88, phase: 'green', letter: 'oa',  sound: '/ō/', label: 'oa' },
  { num: 89, phase: 'green', letter: 'ow',  sound: '/ō/', label: 'ow (long o)' },
  // -igh + diphthongs (L90-94)
  { num: 90, phase: 'green', letter: 'igh', sound: '/ī/', label: '-igh' },
  { num: 91, phase: 'green', letter: 'ow',  sound: '/aʊ/', label: 'ow (diphthong)' },
  { num: 92, phase: 'green', letter: 'ou',  sound: '/aʊ/', label: 'ou (diphthong)' },
  { num: 93, phase: 'green', letter: 'oi',  sound: '/ɔɪ/', label: 'oi' },
  { num: 94, phase: 'green', letter: 'oy',  sound: '/ɔɪ/', label: 'oy' },
  // oo two sounds + au/aw + ew + ie (L95-100)
  { num: 95, phase: 'green', letter: 'oo',  sound: '/uː/', label: 'oo (long)' },
  { num: 96, phase: 'green', letter: 'oo',  sound: '/ʊ/',  label: 'oo (short)' },
  { num: 97, phase: 'green', letter: 'au',  sound: '/ɔ/',  label: 'au' },
  { num: 98, phase: 'green', letter: 'aw',  sound: '/ɔ/',  label: 'aw' },
  { num: 99, phase: 'green', letter: 'ew',  sound: '/uː/', label: 'ew' },
  { num: 100, phase: 'green', letter: 'ie', sound: '/ē/', label: 'ie' },
  // ea alternate + r-controlled vowel teams (L101-103)
  { num: 101, phase: 'green', letter: 'ea', sound: '/ĕ/', label: 'ea (short e alternate)' },
  { num: 102, phase: 'green', letter: 'ear', sound: '/ɪər/', label: 'ear' },
  { num: 103, phase: 'green', letter: 'are/air/ore', sound: '—', label: 'are / air / ore' },
  // Silent letters (L104-108)
  { num: 104, phase: 'green', letter: 'kn', sound: '/n/', label: 'kn (silent k)' },
  { num: 105, phase: 'green', letter: 'wr', sound: '/r/', label: 'wr (silent w)' },
  { num: 106, phase: 'green', letter: 'mb', sound: '/m/', label: 'mb (silent b)' },
  { num: 107, phase: 'green', letter: 'gn', sound: '/n/', label: 'gn (silent g)' },
  { num: 108, phase: 'green', letter: 'ph', sound: '/f/', label: 'ph' },
  // -tion / -sion + schwa (L109-110)
  { num: 109, phase: 'green', letter: '-tion/-sion', sound: '/ʃən/', label: '-tion / -sion' },
  { num: 110, phase: 'green', letter: 'ə',  sound: '/ə/',  label: 'schwa + stress' },
  // Suffixes (L111-117)
  { num: 111, phase: 'green', letter: '-ly',   sound: '—', label: 'Suffix -ly' },
  { num: 112, phase: 'green', letter: '-er',   sound: '—', label: 'Suffix -er' },
  { num: 113, phase: 'green', letter: '-est',  sound: '—', label: 'Suffix -est' },
  { num: 114, phase: 'green', letter: '-ful',  sound: '—', label: 'Suffix -ful' },
  { num: 115, phase: 'green', letter: '-less', sound: '—', label: 'Suffix -less' },
  { num: 116, phase: 'green', letter: '-ness', sound: '—', label: 'Suffix -ness' },
  { num: 117, phase: 'green', letter: '-ment', sound: '—', label: 'Suffix -ment' },
  // Prefixes (L118-123)
  { num: 118, phase: 'green', letter: 'un-',  sound: '—', label: 'Prefix un-' },
  { num: 119, phase: 'green', letter: 're-',  sound: '—', label: 'Prefix re-' },
  { num: 120, phase: 'green', letter: 'pre-', sound: '—', label: 'Prefix pre-' },
  { num: 121, phase: 'green', letter: 'dis-', sound: '—', label: 'Prefix dis-' },
  { num: 122, phase: 'green', letter: 'mis-', sound: '—', label: 'Prefix mis-' },
  { num: 123, phase: 'green', letter: 'sub-', sound: '—', label: 'Prefix sub-' },
  // Roots + contractions + consolidation (L124-128)
  { num: 124, phase: 'green', letter: '—',  sound: '—', label: 'Greek roots — bio / geo / photo' },
  { num: 125, phase: 'green', letter: '—',  sound: '—', label: 'Latin roots — port / dict / spec' },
  { num: 126, phase: 'green', letter: '—',  sound: '—', label: 'Contractions' },
  { num: 127, phase: 'green', letter: '—',  sound: '—', label: 'Green review — vowel teams + silent letters' },
  { num: 128, phase: 'green', letter: '—',  sound: '—', label: 'Green Phase consolidation' },
];

/** Frozen canonical lesson list, 1..128. Numeric order load-bearing. */
export const LESSONS: readonly EnglishLesson[] = Object.freeze([...PINK, ...BLUE, ...GREEN]);

export const TOTAL_LESSONS = LESSONS.length; // 128
export const PINK_RANGE = { start: 1, end: PINK.length };               // 1..53
export const BLUE_RANGE = { start: PINK.length + 1, end: PINK.length + BLUE.length }; // 54..83
export const GREEN_RANGE = { start: PINK.length + BLUE.length + 1, end: TOTAL_LESSONS }; // 84..128

/** 1-indexed lookup. Returns null for out-of-range numbers. */
export function getLesson(num: number): EnglishLesson | null {
  if (!Number.isInteger(num) || num < 1 || num > TOTAL_LESSONS) return null;
  return LESSONS[num - 1] ?? null;
}

export function getPhaseFor(num: number): EnglishPhase | null {
  const l = getLesson(num);
  return l ? l.phase : null;
}

export interface PhaseProgress {
  phase: EnglishPhase;
  /** Lessons mastered IN THIS PHASE. */
  mastered: number;
  /** Total lessons IN THIS PHASE. */
  total: number;
  /** 0..1 (mastered / total). */
  fraction: number;
}

/**
 * Group a mastered_lessons array by phase + total counts. Used by the
 * Classroom Overview English Progress tab to render per-child phase
 * bars (Pink 12/53, Blue 0/30, Green 0/45) instead of a 128-cell grid.
 */
export function getPhaseProgress(masteredLessons: number[]): PhaseProgress[] {
  const set = new Set(masteredLessons);
  const phases: EnglishPhase[] = ['pink', 'blue', 'green'];
  const ranges = { pink: PINK_RANGE, blue: BLUE_RANGE, green: GREEN_RANGE };
  return phases.map(phase => {
    const r = ranges[phase];
    let count = 0;
    for (let n = r.start; n <= r.end; n += 1) {
      if (set.has(n)) count += 1;
    }
    const total = r.end - r.start + 1;
    return {
      phase,
      mastered: count,
      total,
      fraction: total === 0 ? 0 : count / total,
    };
  });
}

/**
 * Sanitize an int[] to enforce sorted + deduped + in-range. Used on
 * the server side before writing mastered_lessons. App-code invariant:
 *   mastered_lessons ⊇ [1..current_lesson - 1]
 */
export function sanitizeMastered(input: unknown, currentLesson: number): number[] {
  const arr = Array.isArray(input) ? input : [];
  const set = new Set<number>();
  for (const v of arr) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 1 && n <= TOTAL_LESSONS) set.add(n);
  }
  // Maintain the invariant: every lesson before current is mastered.
  for (let n = 1; n < currentLesson; n += 1) set.add(n);
  return [...set].sort((a, b) => a - b);
}
