// lib/montree/tracy/knowledge/loader.ts
//
// Tracy's psychological knowledge base — loaded from disk on first
// access, cached in memory across the process lifetime.
//
// DESIGN DECISION (Session 136 — mirrors Mira's pattern from Session 133)
//   We do NOT bake this into Tracy's system prompt at build time. The
//   frameworks here are stable but the principal-facing UX evolves with
//   real-meeting feedback; loading from disk means a Tredoux edit to a
//   markdown file shows up on the next server restart (or the next
//   cache reset).
//
// MEMORY FOOTPRINT
//   All 8 markdown files total ~50KB on disk (~13K tokens). Cached
//   once per process. Negligible.
//
// USAGE
//   - getTracyKnowledge() → full structured bundle. Used by
//     prepare_parent_meeting where Sonnet gets the FULL surface to
//     reason from.
//   - getTracyKnowledgeSummary() → compact ~1500-token summary suitable
//     for Tracy's chat system prompt every turn. All sections present,
//     stripped to leads + the most-quotable lines.
//   - getTracyKnowledgeFull(topic) → single file's full content. Used by
//     the consult_tracy_knowledge tool when Tracy needs depth on one
//     specific area without dumping the whole bundle.
//
// SCHOOL-SCOPING CONTRACT
//   These files are READ-ONLY content. They are NOT per-school. The
//   psychology of parent meetings doesn't change per school. There is
//   no schoolId filter on any function in this module — that's correct
//   by design.

import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * The canonical set of knowledge topics. Each maps to one markdown file.
 * Order here is the canonical order — used in the summary and INDEX.
 */
export type TracyKnowledgeTopic =
  | 'index'
  | 'foundation'
  | 'frameworks'
  | 'nvc'
  | 'patterns'
  | 'cultural'
  | 'montessori_anxieties'
  | 'de_escalation';

export interface TracyKnowledge {
  index: string;
  foundation: string;
  frameworks: string;
  nvc: string;
  patterns: string;
  cultural: string;
  montessori_anxieties: string;
  de_escalation: string;
}

const KNOWLEDGE_DIR = join(process.cwd(), 'lib/montree/tracy/knowledge');

const FILES: Record<TracyKnowledgeTopic, string> = {
  index: 'INDEX.md',
  foundation: '01-psychological-foundation.md',
  frameworks: '02-difficult-conversations.md',
  nvc: '03-nonviolent-communication.md',
  patterns: '04-parent-psychology-patterns.md',
  cultural: '05-cultural-communication.md',
  montessori_anxieties: '06-montessori-parent-anxieties.md',
  de_escalation: '07-de-escalation-toolkit.md',
};

let cached: TracyKnowledge | null = null;
let cachedPromise: Promise<TracyKnowledge> | null = null;

async function loadOnce(): Promise<TracyKnowledge> {
  const out: Partial<TracyKnowledge> = {};
  const entries = Object.entries(FILES) as Array<[TracyKnowledgeTopic, string]>;
  await Promise.all(
    entries.map(async ([key, filename]) => {
      try {
        const filepath = join(KNOWLEDGE_DIR, filename);
        out[key] = await readFile(filepath, 'utf8');
      } catch (e) {
        console.warn(
          `[tracy/knowledge/loader] failed to load ${filename}:`,
          e instanceof Error ? e.message : 'unknown error'
        );
        out[key] = `(${filename} unavailable)`;
      }
    })
  );
  return out as TracyKnowledge;
}

/**
 * Load all 8 knowledge markdown files. Cached after first call.
 * Use this in prepare_parent_meeting where we want the FULL surface
 * available to the dossier-builder Sonnet call.
 */
export async function getTracyKnowledge(): Promise<TracyKnowledge> {
  if (cached) return cached;
  if (cachedPromise) return cachedPromise;
  cachedPromise = loadOnce();
  // 🚨 If loadOnce() ever throws (rare — it currently swallows per-file
  // errors), we MUST clear cachedPromise in finally so subsequent
  // callers can retry. Without finally, a single rejection becomes
  // permanent for the process lifetime — recoverable only by restart.
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
export function resetTracyKnowledgeCache(): void {
  cached = null;
  cachedPromise = null;
}

/**
 * Compact summary for Tracy's chat-mode system prompt. ~1500 tokens —
 * enough for Tracy to apply the frameworks during ordinary chat without
 * dumping the full 13K-token bundle into every turn.
 *
 * The full bundle goes into prepare_parent_meeting. This summary is what
 * Tracy carries on every chat turn so even casual parent-thread questions
 * benefit from the psychological depth.
 */
export async function getTracyKnowledgeSummary(): Promise<string> {
  const k = await getTracyKnowledge();
  const lead = (s: string, max = 900) => {
    const trimmed = s.trim();
    if (trimmed.length <= max) return trimmed;
    const cut = trimmed.slice(0, max);
    const lastBreak = cut.lastIndexOf('\n\n');
    return (lastBreak > 200 ? cut.slice(0, lastBreak) : cut) + '\n…';
  };

  return `# PSYCHOLOGICAL FOUNDATION — frameworks you apply in every parent-meeting context

The full source is on disk under \`lib/montree/tracy/knowledge/\`. You can
call \`consult_tracy_knowledge\` to pull any single file in full when
chat needs depth beyond this summary. The full bundle is loaded
automatically into prepare_parent_meeting's dossier-builder Sonnet call,
so dossiers are always informed by all of it.

The principal NEVER sees these frameworks. They inform what you write;
they don't appear in the brief or the dossier as quoted theory. Specifics
about the child + dated observations are what the principal carries into
the meeting — the frameworks are the architecture underneath that makes
the specifics land.

## Montessori developmental foundation
${lead(k.foundation)}

## Difficult-conversation architecture (Stone/Patton/Heen + Crucial Conversations)
${lead(k.frameworks, 1100)}

## Nonviolent communication (Rosenberg)
${lead(k.nvc, 1100)}

## Five recurring parent archetypes
${lead(k.patterns, 1200)}

## Cultural communication (Erin Meyer's Culture Map)
${lead(k.cultural, 1100)}

## Recurring Montessori parent anxieties
${lead(k.montessori_anxieties, 1100)}

## De-escalation toolkit (Motivational Interviewing OARS)
${lead(k.de_escalation, 1100)}

## The synthesis rule

Three filters every parent-facing artifact passes through:
  1. STRENGTH first. The dossier brief opens with a real, observed,
     specific strength of the child. Identity safety before content.
  2. OBSERVATION not EVALUATION. Every claim defensible at the level
     of what a camera would have recorded. Specifics over summaries.
  3. AND not BUT. Two truths held together never collapsed into one.
     "We love having her AND we need to address one pattern."

When all three pass, the artifact is shippable.

(For deep-dive on any of these, call \`consult_tracy_knowledge\` with
the relevant topic. The full bundle is also injected automatically into
prepare_parent_meeting's dossier-builder prompt.)`;
}

/**
 * Pull one knowledge file in full. Used by the consult_tracy_knowledge
 * tool when chat needs depth on one specific area (e.g. principal asks
 * "how should I handle a defended parent?" → tool fetches the patterns
 * file → Tracy synthesizes a chat reply from the depth).
 *
 * Defaults to 'index' when topic isn't recognised so the caller always
 * gets back something useful.
 */
export async function getTracyKnowledgeFull(
  topic: TracyKnowledgeTopic
): Promise<string> {
  const k = await getTracyKnowledge();
  return k[topic] ?? k.index;
}
