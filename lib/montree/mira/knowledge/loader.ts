// lib/montree/mira/knowledge/loader.ts
//
// Mira's knowledge base — loaded from disk on first access, cached in
// memory across the process lifetime.
//
// DESIGN DECISION (Session 133)
//   We do NOT bake this into Mira's system prompt at build time. Product
//   reality changes constantly — pricing, features, competitive landscape,
//   personas. Baking a stale knowledge base into the prompt is worse than
//   no knowledge base at all. Loading from disk means a Tredoux edit to a
//   markdown file shows up on the next server restart (or the next cache
//   bust if we add one).
//
// MEMORY FOOTPRINT
//   All 9 markdown files total ~30KB. Cached in one Map. Negligible.
//
// USAGE
//   - getMiraKnowledge() → returns the full bundle as a structured object
//   - getMiraKnowledgeSummary() → returns a compact ~3-4KB token-budget
//     version suitable for the system prompt header (all sections, but
//     stripped to leads + the most-quotable lines)
//   - The full bundle goes into prepare_principal_pitch's prompt; the
//     summary goes into Mira's chat-mode system prompt.

import { readFile } from 'fs/promises';
import { join } from 'path';

export interface MiraKnowledge {
  // product + playbook lead the bundle — they're the foundation a
  // blank-slate agent needs before the sales-angled files make sense.
  product: string;
  playbook: string;
  elevator: string;
  features: string;
  pricing: string;
  proof: string;
  pedagogical: string;
  competitive: string;
  personas: string;
  objections: string;
  demo_paths: string;
  cultural: string;
  follow_up: string;
}

const KNOWLEDGE_DIR = join(process.cwd(), 'lib/montree/mira/knowledge');

const FILES: Record<keyof MiraKnowledge, string> = {
  product: 'product.md',
  playbook: 'playbook.md',
  elevator: 'elevator.md',
  features: 'features.md',
  pricing: 'pricing.md',
  proof: 'proof.md',
  pedagogical: 'pedagogical.md',
  competitive: 'competitive.md',
  personas: 'personas.md',
  objections: 'objections.md',
  demo_paths: 'demo_paths.md',
  cultural: 'cultural.md',
  follow_up: 'follow_up.md',
};

let cached: MiraKnowledge | null = null;
let cachedPromise: Promise<MiraKnowledge> | null = null;

async function loadOnce(): Promise<MiraKnowledge> {
  const out: Partial<MiraKnowledge> = {};
  const entries = Object.entries(FILES) as Array<[keyof MiraKnowledge, string]>;
  await Promise.all(
    entries.map(async ([key, filename]) => {
      try {
        const filepath = join(KNOWLEDGE_DIR, filename);
        out[key] = await readFile(filepath, 'utf8');
      } catch (e) {
        console.warn(
          `[mira/knowledge/loader] failed to load ${filename}:`,
          e instanceof Error ? e.message : 'unknown error'
        );
        out[key] = `(${filename} unavailable)`;
      }
    })
  );
  return out as MiraKnowledge;
}

/** A single knowledge topic — one markdown file. */
export type MiraKnowledgeTopic = keyof MiraKnowledge;

/**
 * Load all 13 knowledge markdown files. Cached after first call.
 * Use this in prepare_principal_pitch where we want the FULL knowledge
 * surface available to Sonnet.
 */
export async function getMiraKnowledge(): Promise<MiraKnowledge> {
  if (cached) return cached;
  if (cachedPromise) return cachedPromise;
  cachedPromise = loadOnce();
  // 🚨 Session 133 audit fix: if loadOnce() ever throws (rare — it
  // currently swallows per-file errors), we MUST clear cachedPromise
  // in a finally so subsequent callers can retry. Without the finally,
  // a single thrown promise becomes a permanent rejection that every
  // future await sees — recoverable only by server restart.
  try {
    cached = await cachedPromise;
    return cached;
  } finally {
    cachedPromise = null;
  }
}

/**
 * Test-only / dev-only: reset the cache. Production code never calls this.
 */
export function resetMiraKnowledgeCache(): void {
  cached = null;
  cachedPromise = null;
}

/**
 * Pull ONE knowledge file in full. Used by the consult_knowledge tool when
 * Mira needs depth on one topic beyond the system-prompt summary (e.g. the
 * full product overview to teach a new agent, the full step-by-step playbook,
 * the complete objection handlers or demo scripts). Falls back to the product
 * overview when the topic isn't recognised so the caller always gets something
 * useful.
 */
export async function getMiraKnowledgeFull(
  topic: MiraKnowledgeTopic
): Promise<string> {
  const k = await getMiraKnowledge();
  return k[topic] ?? k.product;
}

/**
 * Compact summary for Mira's chat-mode system prompt. ~3-4K tokens —
 * enough for Mira to answer most ad-hoc questions without calling the
 * full knowledge base, but lean enough not to dominate the prompt budget.
 *
 * The full bundle goes into prepare_principal_pitch. This summary is what
 * Mira sees on every chat turn.
 */
export async function getMiraKnowledgeSummary(): Promise<string> {
  const k = await getMiraKnowledge();
  // Strip each section to its essential leads. The simple rule: include
  // each file's first ~600 chars, which is the top-of-file lead in our
  // structure.
  const lead = (s: string, max = 800) => {
    const trimmed = s.trim();
    if (trimmed.length <= max) return trimmed;
    // Cut on a paragraph boundary if we can.
    const cut = trimmed.slice(0, max);
    const lastBreak = cut.lastIndexOf('\n\n');
    return (lastBreak > 200 ? cut.slice(0, lastBreak) : cut) + '\n…';
  };

  return `# MONTREE KNOWLEDGE — load-bearing facts you must quote correctly

This is a SUMMARY. For depth on any topic — full product detail, the step-by-step
agent playbook, full objection handlers, demo scripts — call \`consult_knowledge\`
with the matching topic; it returns that whole file. When in doubt about a live
number (schools, children, languages), get it via \`get_platform_signal\` — never
quote it from memory.

## What Montree is (product foundation)
${lead(k.product, 1200)}

## The agent playbook (how to actually sell + the mechanics)
${lead(k.playbook, 1200)}

## Elevator
${lead(k.elevator)}

## Features (high-level)
${lead(k.features, 1200)}

## Pricing
${lead(k.pricing, 1200)}

## Proof
${lead(k.proof)}

## Pedagogical credibility
${lead(k.pedagogical)}

## Competitive landscape
${lead(k.competitive)}

## Top objections + handlers
${lead(k.objections, 1200)}

## Cultural register notes
${lead(k.cultural)}

(For deep-dive: prepare_principal_pitch loads the full knowledge base when building a pitch dossier.)`;
}
