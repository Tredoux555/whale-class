// lib/story/coach/knowledge-loader.ts
//
// The Coach's self-help knowledge base — loaded from disk on first access,
// cached for the process lifetime. Mirrors lib/montree/mira/knowledge/loader.ts.
//
// The compact SUMMARY goes into the Coach's system prompt every turn so it can
// quote frameworks rather than improvise. The FULL file for one topic is pulled
// on demand by the consult_wisdom tool when depth is needed.

import { readFile } from 'fs/promises';
import { join } from 'path';

export type WisdomTopic =
  | 'essentialism'
  | 'one_thing'
  | 'four_thousand_weeks'
  | 'atomic_habits'
  | 'gtd'
  | 'deep_work'
  | 'seven_habits'
  | 'burnout'
  | 'indistractable'
  | 'war_of_art'
  | 'stoicism'
  | 'frankl'
  | 'mindset'
  | 'manifestation'
  | 'sleep'
  | 'narcissistic_dynamics'
  | 'child_safeguarding'
  | 'video_scripts'
  | 'tiktok_growth';

const FILES: Record<WisdomTopic, string> = {
  essentialism: 'essentialism.md',
  one_thing: 'one-thing.md',
  four_thousand_weeks: 'four-thousand-weeks.md',
  atomic_habits: 'atomic-habits.md',
  gtd: 'gtd.md',
  deep_work: 'deep-work.md',
  seven_habits: 'seven-habits.md',
  burnout: 'burnout.md',
  indistractable: 'indistractable.md',
  war_of_art: 'war-of-art.md',
  stoicism: 'stoicism.md',
  frankl: 'frankl.md',
  mindset: 'mindset.md',
  manifestation: 'manifestation.md',
  sleep: 'sleep.md',
  // On-demand only (NOT in getCoachWisdomSummary): pulled via consult_wisdom when
  // Tredoux raises his mother / family / boundaries, so it never skews the
  // every-turn productivity coaching. See system-prompt.ts tool-use trigger.
  narcissistic_dynamics: 'narcissistic-dynamics.md',
  // On-demand only, CHILD coaches only: the safeguarding-in-the-room playbook for
  // dark disclosures (self-harm, abuse). Summarised into the CHILD system prompt
  // every turn (see buildChildCoachSystemPrompt); the full text loads via
  // consult_wisdom when the moment is live. NOT in the adult summary.
  child_safeguarding: 'child-safeguarding.md',
  // On-demand only (NOT in getCoachWisdomSummary): Tredoux's own content/marketing
  // script brain — pulled via consult_wisdom when he asks for help writing a TikTok /
  // Reels / YouTube / promo script. Kept out of the every-turn summary so it never
  // skews normal coaching.
  video_scripts: 'video-scripts.md',
  // On-demand only (NOT in getCoachWisdomSummary): Tredoux's TikTok GROWTH brain — the
  // distribution/growth layer (algorithm, posting strategy, small-budget Spark Ads,
  // view→sign-up conversion, decided positions). Pulled via consult_wisdom when he asks
  // about why a video flopped / the algorithm / posting strategy / paid / conversion.
  // Kept out of the every-turn summary so it never skews normal coaching.
  tiktok_growth: 'tiktok-growth.md',
};

export const WISDOM_TOPICS = Object.keys(FILES) as WisdomTopic[];

const KNOWLEDGE_DIR = join(process.cwd(), 'lib/story/coach/knowledge');

type Bundle = Record<WisdomTopic, string>;
let cached: Bundle | null = null;
let cachedPromise: Promise<Bundle> | null = null;

async function loadOnce(): Promise<Bundle> {
  const out: Partial<Bundle> = {};
  await Promise.all(
    (Object.entries(FILES) as Array<[WisdomTopic, string]>).map(async ([key, filename]) => {
      try {
        out[key] = await readFile(join(KNOWLEDGE_DIR, filename), 'utf8');
      } catch (e) {
        console.warn(
          `[coach/knowledge] failed to load ${filename}:`,
          e instanceof Error ? e.message : 'unknown error',
        );
        out[key] = `(${filename} unavailable)`;
      }
    }),
  );
  return out as Bundle;
}

async function getBundle(): Promise<Bundle> {
  if (cached) return cached;
  if (cachedPromise) return cachedPromise;
  cachedPromise = loadOnce();
  try {
    cached = await cachedPromise;
    return cached;
  } finally {
    cachedPromise = null;
  }
}

/** Full text of one framework. Falls back to Essentialism (the #1) if unknown. */
export async function getWisdom(topic: WisdomTopic): Promise<string> {
  const b = await getBundle();
  return b[topic] ?? b.essentialism;
}

/**
 * Compact INDEX for the system prompt — the menu, not the meal. The full text of any
 * framework loads on demand via consult_wisdom. We deliberately no longer inject all 15
 * summaries every turn: that buried the coach in ~2,200 tokens of self-help and made it
 * quote frameworks reflexively instead of listening. Listen first; reach for one only
 * when it earns its place.
 */
export async function getCoachWisdomSummary(): Promise<string> {
  return `# Your knowledge library (consult on demand — do NOT quote unprompted)
You hold deep frameworks you can pull IN FULL with \`consult_wisdom\` when one genuinely fits
THIS person in THIS moment — never to perform or to sound clever. Listen first; reach for a
framework only when it earns its place, then quote it precisely. The library:
Essentialism · The ONE Thing · Four Thousand Weeks · Atomic Habits · GTD · Deep Work ·
7 Habits · Burnout (complete the stress cycle) · Indistractable · The War of Art ·
Stoicism (dichotomy of control) · Frankl (meaning) · Mindset · Manifestation · Why We Sleep.`;
}

/** Test/dev only. */
export function resetCoachWisdomCache(): void {
  cached = null;
  cachedPromise = null;
}
