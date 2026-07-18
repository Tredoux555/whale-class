/**
 * spec/index.ts — the WeekSpec loader + interop maps.
 *
 * getWeek(n)     — the authored week-NN.json (async; null if not authored yet).
 * getAllWeeks()  — every authored Level-1 week.
 * WEEK_META      — the 26-week rail summary (from MASTER_SPINE.md), always
 *                  available even before a week's full JSON exists.
 * weekToLessonMap — Week → lesson-map.ts lesson numbers (do NOT renumber lesson-map).
 *
 * 🚨 As each new week-NN.json is authored, add ONE line to WEEK_LOADERS. Static
 * imports keep the build honest (a missing file can't silently break the bundle)
 * and webpack/esbuild both tree-analyse them cleanly.
 */

import type { WeekSpec, SkeletonWeek } from './types';
import darkPhonicsData from './dark-phonics.json';

// ── Authored-week loaders (extend as weeks are written) ─────────────────
// JSON imports widen literal types (level → number), so the loaders are typed
// loosely and cast to WeekSpec in getWeek().
const WEEK_LOADERS: Record<number, () => Promise<{ default: unknown }>> = {
  1: () => import('./week-01.json'),
  2: () => import('./week-02.json'),
  3: () => import('./week-03.json'),
  4: () => import('./week-04.json'),
  5: () => import('./week-05.json'),
  6: () => import('./week-06.json'),
  7: () => import('./week-07.json'),
  8: () => import('./week-08.json'),
  9: () => import('./week-09.json'),
  10: () => import('./week-10.json'),
  11: () => import('./week-11.json'),
  12: () => import('./week-12.json'),
  13: () => import('./week-13.json'),
  14: () => import('./week-14.json'),
  15: () => import('./week-15.json'),
  16: () => import('./week-16.json'),
  17: () => import('./week-17.json'),
  18: () => import('./week-18.json'),
  19: () => import('./week-19.json'),
  20: () => import('./week-20.json'),
  21: () => import('./week-21.json'),
  22: () => import('./week-22.json'),
  23: () => import('./week-23.json'),
  24: () => import('./week-24.json'),
  25: () => import('./week-25.json'),
  26: () => import('./week-26.json'),

  // ── Level 2 / 3 (W27–58) — Phase C authoring slots ──────────────────────
  // 🚨 RULE (do NOT break it): a new week's JSON is INVISIBLE to every generator
  // until its loader line is uncommented here. Static imports keep the build
  // honest — importing a file that doesn't exist yet THROWS at bundle time, so
  // these stay commented until the matching week-NN.json actually lands. As each
  // spec is authored, delete the `// ` on its line (and only its line).
  27: () => import('./week-27.json'),
  28: () => import('./week-28.json'),
  29: () => import('./week-29.json'),
  30: () => import('./week-30.json'),
  31: () => import('./week-31.json'),
  32: () => import('./week-32.json'),
  33: () => import('./week-33.json'),
  34: () => import('./week-34.json'),
  35: () => import('./week-35.json'),
  36: () => import('./week-36.json'),
  37: () => import('./week-37.json'),
  38: () => import('./week-38.json'),
  39: () => import('./week-39.json'),
  40: () => import('./week-40.json'),
  41: () => import('./week-41.json'),
  42: () => import('./week-42.json'),
  43: () => import('./week-43.json'),
  44: () => import('./week-44.json'),
  45: () => import('./week-45.json'),
  46: () => import('./week-46.json'),
  47: () => import('./week-47.json'),
  48: () => import('./week-48.json'),
  49: () => import('./week-49.json'),
  50: () => import('./week-50.json'),
  51: () => import('./week-51.json'),
  52: () => import('./week-52.json'),
  53: () => import('./week-53.json'),
  54: () => import('./week-54.json'),
  55: () => import('./week-55.json'),
  56: () => import('./week-56.json'),
  57: () => import('./week-57.json'),
  58: () => import('./week-58.json'),

  // ── Grace & Courtesy Intro Weeks (Jul 16 2026) — the first two weeks of ─────
  // school, BEFORE Week 1. NOT phonics. They use sentinel week numbers (101/102)
  // so they can NEVER collide with, renumber, or leak into the 1–58 spine — every
  // publishing/seed script globs week-<NN>.json or loops 1..58, so intro-week-*.json
  // is invisible to all of them. The Studio renders them FIRST via INTRO_WEEK_META
  // and masks the number with WeekSpec.displayName; the sentinel is never shown.
  101: () => import('./intro-week-a.json'),
  102: () => import('./intro-week-b.json'),
};

// ── Grace & Courtesy Intro Weeks — sentinel-number helpers ────────────────
/** The two pre-Level-1 Grace & Courtesy weeks. Sentinel numbers (masked by
 *  displayName everywhere they surface). */
export const INTRO_WEEK_NUMBERS = [101, 102] as const;
/** True for a Grace & Courtesy Intro Week number (101/102). */
export function isIntroWeek(n: number): boolean {
  return (INTRO_WEEK_NUMBERS as readonly number[]).includes(n);
}

export interface IntroWeekMeta {
  week: number;
  label: string;       // strip-chip headline ("Intro A")
  word: string;        // strip sub-line ("Our Classroom")
  displayName: string; // full heading (masks the sentinel week number)
}

/** The Intro-Weeks rail metadata (rendered FIRST in the Studio, before Level 1). */
export const INTRO_WEEK_META: IntroWeekMeta[] = [
  { week: 101, label: 'Intro A', word: 'Our Classroom', displayName: 'Intro Week A — Grace & Courtesy: Our Classroom (Days 1–5)' },
  { week: 102, label: 'Intro B', word: 'Our Work', displayName: 'Intro Week B — Grace & Courtesy: Our Work (Days 6–10)' },
];

/** The authored WeekSpec for week n (1..26), or null if not written yet. */
export async function getWeek(n: number): Promise<WeekSpec | null> {
  const loader = WEEK_LOADERS[n];
  if (!loader) return null;
  try {
    const mod = (await loader()) as { default?: unknown };
    return (mod.default ?? mod) as WeekSpec;
  } catch {
    return null;
  }
}

/** Every authored Level-1 week, ascending. */
export async function getAllWeeks(): Promise<WeekSpec[]> {
  const out: WeekSpec[] = [];
  for (let n = 1; n <= 26; n++) {
    const w = await getWeek(n);
    if (w) out.push(w);
  }
  return out;
}

/** Which PHONICS weeks (the 1–58 spine) have full authored JSON right now.
 *  🚨 Intro weeks use sentinel numbers (101/102) and are DELIBERATELY excluded
 *  here so a caller can safely assume a contiguous 1–58 range — get the intro
 *  sentinels from INTRO_WEEK_NUMBERS instead. Don't drop the `< 100` filter. */
export function authoredWeekNumbers(): number[] {
  return Object.keys(WEEK_LOADERS)
    .map(Number)
    .filter((n) => n < 100)
    .sort((a, b) => a - b);
}

// ── The 26-week rail summary (locked spine, MASTER_SPINE.md) ─────────────
export interface WeekMeta {
  week: number;
  sound: string;
  letterDisplay: string;
  anchorWord: string;
  celebration: string | null;
  vowelLights: string | null;
  castIntro: string | null;
}

function displayFor(sound: string): string {
  if (sound === 'qu') return 'Qu qu';
  const c = sound.charAt(0);
  return c.toUpperCase() + c;
}

const SPINE_META: Omit<WeekMeta, 'letterDisplay'>[] = [
  { week: 1, sound: 'a', anchorWord: 'a', celebration: null, vowelLights: 'a', castIntro: null },
  { week: 2, sound: 't', anchorWord: 'at', celebration: null, vowelLights: null, castIntro: 'Segina' },
  { week: 3, sound: 'm', anchorWord: 'mat', celebration: null, vowelLights: null, castIntro: null },
  { week: 4, sound: 'c', anchorWord: 'cat', celebration: 'FIRST DECODABLE BOOK', vowelLights: null, castIntro: 'Cat' },
  { week: 5, sound: 's', anchorWord: 'sat', celebration: null, vowelLights: null, castIntro: 'Sam' },
  { week: 6, sound: 'n', anchorWord: 'ant', celebration: 'GLUE: I', vowelLights: null, castIntro: 'Ant' },
  { week: 7, sound: 'p', anchorWord: 'pat', celebration: null, vowelLights: null, castIntro: null },
  { week: 8, sound: 'i', anchorWord: 'it', celebration: null, vowelLights: 'i', castIntro: null },
  { week: 9, sound: 'h', anchorWord: 'hat', celebration: null, vowelLights: null, castIntro: null },
  { week: 10, sound: 'd', anchorWord: 'dad', celebration: 'AND DECODABLE', vowelLights: null, castIntro: null },
  { week: 11, sound: 'o', anchorWord: 'on', celebration: 'ON DECODABLE', vowelLights: 'o', castIntro: null },
  { week: 12, sound: 'g', anchorWord: 'dog', celebration: null, vowelLights: null, castIntro: 'Dog' },
  { week: 13, sound: 'b', anchorWord: 'big', celebration: null, vowelLights: null, castIntro: null },
  { week: 14, sound: 'e', anchorWord: 'pet', celebration: null, vowelLights: 'e', castIntro: null },
  { week: 15, sound: 'r', anchorWord: 'rat', celebration: null, vowelLights: null, castIntro: 'Rat' },
  { week: 16, sound: 'u', anchorWord: 'up', celebration: 'VOWEL WALL COMPLETE', vowelLights: 'u', castIntro: 'Pup' },
  { week: 17, sound: 'f', anchorWord: 'fun', celebration: null, vowelLights: null, castIntro: null },
  { week: 18, sound: 'l', anchorWord: 'leg', celebration: null, vowelLights: null, castIntro: 'Bug' },
  { week: 19, sound: 'w', anchorWord: 'wet', celebration: null, vowelLights: null, castIntro: null },
  { week: 20, sound: 'j', anchorWord: 'jam', celebration: null, vowelLights: null, castIntro: null },
  { week: 21, sound: 'k', anchorWord: 'kid', celebration: null, vowelLights: null, castIntro: 'Duck' },
  { week: 22, sound: 'v', anchorWord: 'vet', celebration: 'CAST REUNION', vowelLights: null, castIntro: null },
  { week: 23, sound: 'y', anchorWord: 'yes', celebration: null, vowelLights: null, castIntro: null },
  { week: 24, sound: 'x', anchorWord: 'fox', celebration: null, vowelLights: null, castIntro: 'Fox' },
  { week: 25, sound: 'qu', anchorWord: 'quiz', celebration: 'GLUE: says', vowelLights: null, castIntro: null },
  { week: 26, sound: 'z', anchorWord: 'zip', celebration: 'GRADUATION', vowelLights: null, castIntro: null },
];

export const WEEK_META: WeekMeta[] = SPINE_META.map((m) => ({
  ...m,
  letterDisplay: displayFor(m.sound),
}));

// ── Week → lesson-map equivalence (interop; never renumber lesson-map.ts) ─
export const weekToLessonMap: Record<number, number[]> = {
  // Level 1 (W1–26) — locked.
  1: [6], 2: [7], 3: [11], 4: [15], 5: [5], 6: [10], 7: [8], 8: [9], 9: [21],
  10: [12], 11: [14], 12: [13], 13: [22], 14: [18], 15: [20], 16: [19], 17: [23],
  18: [24], 19: [27], 20: [25], 21: [16, 17], 22: [26], 23: [29], 24: [28],
  25: [31], 26: [30],
  // Level 2 (W27–42) — from MASTER_SPINE "Week→lesson-map equivalence W27–58".
  27: [42], 28: [43], 29: [44, 46], 30: [41, 17], 31: [48], 32: [45],
  33: [49], 34: [50], 35: [51], 36: [47], 37: [47, 48],
  38: [54], 39: [55], 40: [56], 41: [57], 42: [58, 59, 60, 61],
  // Level 3 (W43–58). W50 is the EAL minimal-pair review (no lesson-map lesson).
  43: [84, 85], 44: [86, 87], 45: [88, 89], 46: [90], 47: [71], 48: [72],
  49: [73, 74, 75], 50: [], 51: [95, 96], 52: [91, 92], 53: [93, 94],
  54: [97, 98, 99], 55: [62, 63, 64], 56: [104, 105, 106], 57: [65, 66, 67], 58: [109],
};

// ── Dark Phonics — one double-sided card + one video per mapped week ──────
// The Dark Phonics deck (Tredoux's dark-trap SATPIN alphabet films, lessons
// 05–31 in lesson-map.ts) rides on top of the phonics packs: each week that
// maps to a Dark Phonics lesson gains ONE printable flashcard (picture front /
// BIG letter + catchphrase back) and, in the Studio, its music video plays
// FIRST in the songs area. Keyed by lesson number; a week resolves via
// weekToLessonMap (the FIRST mapped lesson present in dark-phonics.json wins —
// e.g. W21 → [16,17] takes 16 "k", leaving 17 "ck" for W30 → [41,17]). A week
// with no mapped Dark Phonics lesson silently gets no card and no video. This
// data is NOT a WeekSpec and the decodability validator never sees it.
export interface DarkPhonicsCard {
  /** Zero-padded lesson-map lesson number, e.g. "05", "17", "31". */
  lesson: string;
  /** The sound/grapheme the film teaches, e.g. "s", "ck", "qu". */
  sound: string;
  /** The catchphrase (film title), e.g. "Quick Quacky Duck". */
  title: string;
  /** The card-front image filename, resolved under the --dark-phonics-dir. */
  image: string;
  /** Verified-at-build-time montree.xyz proxy URL, or null if no film exists. */
  videoUrl: string | null;
}

const DARK_PHONICS_LESSONS = (
  darkPhonicsData as {
    lessons: Record<string, { sound: string; title: string; image: string; videoUrl: string | null }>;
  }
).lessons;

/** The Dark Phonics card/video for a week, or null if the week maps to none.
 *  Pure (weekToLessonMap + dark-phonics.json only) — safe in Node + browser. */
export function getDarkPhonicsForWeek(week: number): DarkPhonicsCard | null {
  const lessons = weekToLessonMap[week];
  if (!lessons || !lessons.length) return null;
  for (const n of lessons) {
    const key = String(n).padStart(2, '0');
    const entry = DARK_PHONICS_LESSONS[key];
    if (entry) {
      return {
        lesson: key,
        sound: entry.sound,
        title: entry.title,
        image: entry.image,
        videoUrl: entry.videoUrl ?? null,
      };
    }
  }
  return null;
}

// ── Level 2 / 3 skeletons (design only) ─────────────────────────────────
export async function getLevel2Skeleton(): Promise<SkeletonWeek[]> {
  const mod = await import('./level2-skeleton.json');
  return (mod.default ?? mod) as SkeletonWeek[];
}
export async function getLevel3Skeleton(): Promise<SkeletonWeek[]> {
  const mod = await import('./level3-skeleton.json');
  return (mod.default ?? mod) as SkeletonWeek[];
}

export type { WeekSpec, SkeletonWeek } from './types';
