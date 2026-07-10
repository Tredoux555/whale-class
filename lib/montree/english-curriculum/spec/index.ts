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
};

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

/** Which weeks have full authored JSON right now. */
export function authoredWeekNumbers(): number[] {
  return Object.keys(WEEK_LOADERS).map(Number).sort((a, b) => a - b);
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
  1: [6], 2: [7], 3: [11], 4: [15], 5: [5], 6: [10], 7: [8], 8: [9], 9: [21],
  10: [12], 11: [14], 12: [13], 13: [22], 14: [18], 15: [20], 16: [19], 17: [23],
  18: [24], 19: [27], 20: [25], 21: [16, 17], 22: [26], 23: [29], 24: [28],
  25: [31], 26: [30],
};

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
