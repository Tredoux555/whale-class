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

/** Compact summary for the system prompt — each file's lead, quote-ready. */
export async function getCoachWisdomSummary(): Promise<string> {
  const b = await getBundle();
  const lead = (s: string, max = 520) => {
    const t = s.trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const lastBreak = cut.lastIndexOf('\n\n');
    return (lastBreak > 160 ? cut.slice(0, lastBreak) : cut) + '\n…';
  };
  return `# Your knowledge base — QUOTE these frameworks, don't improvise self-help

This is a summary. For the full depth of any framework, call \`consult_wisdom\` with
its topic key. Weight Essentialism heaviest — it's the default lens for most people you coach.

## Essentialism (topic: essentialism) — disciplined pursuit of less, but better
${lead(b.essentialism, 900)}

## The ONE Thing (topic: one_thing)
${lead(b.one_thing)}

## Four Thousand Weeks (topic: four_thousand_weeks)
${lead(b.four_thousand_weeks)}

## Atomic Habits (topic: atomic_habits)
${lead(b.atomic_habits)}

## Getting Things Done (topic: gtd)
${lead(b.gtd)}

## Deep Work (topic: deep_work)
${lead(b.deep_work)}

## 7 Habits — Quadrant II (topic: seven_habits)
${lead(b.seven_habits)}

## Burnout — complete the stress cycle (topic: burnout)
${lead(b.burnout, 900)}

## Indistractable (topic: indistractable)
${lead(b.indistractable)}

## The War of Art — beat Resistance, ship (topic: war_of_art)
${lead(b.war_of_art)}

## Stoicism — dichotomy of control (topic: stoicism)
${lead(b.stoicism)}

## Man's Search for Meaning (topic: frankl)
${lead(b.frankl)}

## Mindset — growth, the power of "yet" (topic: mindset)
${lead(b.mindset)}

## Manifestation — vision + obstacle + plan, never magic (topic: manifestation)
${lead(b.manifestation, 900)}

## Why We Sleep — sleep is non-negotiable (topic: sleep)
${lead(b.sleep)}`;
}

/** Test/dev only. */
export function resetCoachWisdomCache(): void {
  cached = null;
  cachedPromise = null;
}
