// lib/montree/tracy/corpus/extract.ts
//
// Ultimate Tracy Phase C — corpus extraction.
//
// Reads montree_parent_meeting_analyses rows where corpus_extracted_at
// IS NULL and refines + abstracts the `corpus_extractions` array into
// proper insights, classifying each by type, generating embeddings, and
// persisting to montree_tracy_corpus.
//
// ABSTRACTION RULES (load-bearing privacy contract):
//   - No parent names. No child names.
//   - No direct quotes that identify a person.
//   - Insights are about PATTERNS at this school, not specifics about
//     one parent/child.
//
// COST
//   ~$0.005 per analysis (one Haiku refinement call + 1-5 embeddings).
//   Embeddings are negligible ($0.00002 × 5 = $0.0001).

import type Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HAIKU_MODEL } from '@/lib/ai/anthropic';
import { embedTextBatch } from './embeddings';

interface AnalysisRow {
  id: string;
  school_id: string;
  meeting_id: string;
  corpus_extractions: string[] | null;
}

const REFINE_TOOL = {
  name: 'refine_corpus_entries',
  description:
    'Refine raw corpus extractions into properly abstracted school-pattern insights. Returns one entry per refined insight.',
  input_schema: {
    type: 'object' as const,
    properties: {
      entries: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            insight_text: {
              type: 'string' as const,
              description:
                'The refined insight in plain English. 20-2000 chars. NO names, NO direct quotes, NO specifics about one person.',
            },
            insight_type: {
              type: 'string' as const,
              enum: [
                'parent_archetype_signal',
                'cultural_pattern',
                'de_escalation_move',
                'trap_phrase',
                'voice_sample',
                'topic_pattern',
                'school_specific',
              ],
            },
            applies_to: {
              type: 'object' as const,
              description:
                'JSONB scope — e.g. { archetype: "expectation_driven" } or { topic: "reading" }. Empty object when no scope filter.',
            },
            confidence: {
              type: 'number' as const,
              description: '0-1, Sonnet self-rating',
            },
          },
          required: ['insight_text', 'insight_type', 'confidence'],
        },
      },
    },
    required: ['entries'],
  },
};

interface RefinedEntry {
  insight_text: string;
  insight_type: string;
  applies_to: Record<string, unknown>;
  confidence: number;
}

const VALID_INSIGHT_TYPES = new Set([
  'parent_archetype_signal',
  'cultural_pattern',
  'de_escalation_move',
  'trap_phrase',
  'voice_sample',
  'topic_pattern',
  'school_specific',
]);

function refineSystemPrompt(): string {
  return `You are an abstraction step in Tracy's self-improving corpus. Raw extractions from one parent-meeting analysis are given to you. You produce REFINED insights that follow strict abstraction rules.

CRITICAL RULES — every refined entry must:
  1. Contain NO parent names. NO child names. NO direct quotes that name an individual.
  2. Generalise to a PATTERN at this school, not a specific person/event.
     Example BAD: "Mrs Chen calmed when we showed Hannah's progression"
     Example GOOD: "With expectation-driven parents at this school, showing the older sibling's academic progression has de-escalated reading concerns multiple times."
  3. Use one of the 7 insight_type values. Pick the closest match.
  4. populate applies_to with a JSONB scope where it helps retrieval — archetype, topic, cultural_group — but never with a parent_id or child_id (that would defeat the abstraction).
  5. Be 20-2000 chars. Skip entries that can't be abstracted without losing meaning.
  6. confidence reflects how universal the insight feels. 0.5-0.6 = one observation only. 0.7-0.85 = recurring pattern. 0.9+ = strong, well-evidenced.

Return one tool_use call to refine_corpus_entries with 0 to N refined entries. Drop entries that violate the abstraction rules — better to skip than to leak.`;
}

/**
 * Extract corpus entries from one analysis row. Refines via Haiku
 * (cheap), embeds via OpenAI, persists.
 *
 * NEVER THROWS. Failures log + mark the analysis as extracted (with an
 * empty corpus row count) so we don't retry forever.
 */
export async function extractCorpusFromAnalysis(
  analysisId: string,
  supabase: SupabaseClient,
  anthropic: Anthropic | null
): Promise<{ ok: boolean; created: number; reason?: string }> {
  if (!anthropic) {
    return { ok: false, created: 0, reason: 'anthropic client unavailable' };
  }

  // Load the analysis row.
  const { data: row, error: rErr } = await supabase
    .from('montree_parent_meeting_analyses')
    .select('id, school_id, meeting_id, corpus_extractions, corpus_extracted_at')
    .eq('id', analysisId)
    .maybeSingle();
  if (rErr || !row) {
    return { ok: false, created: 0, reason: 'analysis row not found' };
  }
  if (row.corpus_extracted_at) {
    return { ok: true, created: 0, reason: 'already extracted' };
  }

  const r = row as AnalysisRow & { corpus_extracted_at: string | null };
  const rawExtractions = Array.isArray(r.corpus_extractions)
    ? r.corpus_extractions
    : [];
  if (rawExtractions.length === 0) {
    // Mark as processed so we don't retry forever.
    await supabase
      .from('montree_parent_meeting_analyses')
      .update({ corpus_extracted_at: new Date().toISOString() })
      .eq('id', analysisId);
    return { ok: true, created: 0, reason: 'no raw extractions' };
  }

  // Haiku refinement step.
  let refined: RefinedEntry[] = [];
  try {
    const sonnetResp = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2000,
      system: refineSystemPrompt(),
      tools: [REFINE_TOOL],
      tool_choice: { type: 'tool', name: 'refine_corpus_entries' },
      messages: [
        {
          role: 'user',
          content: `Raw extractions from this meeting analysis:\n\n${rawExtractions.map((e, i) => `${i + 1}. ${e}`).join('\n')}`,
        },
      ],
    });
    const toolUse = sonnetResp.content.find((b) => b.type === 'tool_use');
    if (toolUse && toolUse.type === 'tool_use' && toolUse.name === 'refine_corpus_entries') {
      const input = toolUse.input as { entries?: unknown };
      const arr = Array.isArray(input.entries) ? input.entries : [];
      refined = (arr as unknown[])
        .map((e) => sanitizeRefined(e))
        .filter((e): e is RefinedEntry => e !== null);
    }
  } catch (err) {
    console.warn(
      '[tracy/corpus/extract] Haiku refine failed:',
      err instanceof Error ? err.message : 'unknown'
    );
  }

  if (refined.length === 0) {
    await supabase
      .from('montree_parent_meeting_analyses')
      .update({ corpus_extracted_at: new Date().toISOString() })
      .eq('id', analysisId);
    return { ok: true, created: 0, reason: 'refine produced nothing' };
  }

  // Embed all refined entries.
  let embeddings: number[][];
  try {
    embeddings = await embedTextBatch(refined.map((e) => e.insight_text));
  } catch (err) {
    console.warn(
      '[tracy/corpus/extract] embedding failed:',
      err instanceof Error ? err.message : 'unknown'
    );
    // Mark extracted to avoid retry loops — better to lose this batch
    // than to spend forever trying.
    await supabase
      .from('montree_parent_meeting_analyses')
      .update({ corpus_extracted_at: new Date().toISOString() })
      .eq('id', analysisId);
    return { ok: false, created: 0, reason: 'embedding failed' };
  }

  // Persist.
  const rowsToInsert = refined.map((entry, i) => ({
    school_id: r.school_id,
    insight_text: entry.insight_text,
    insight_type: entry.insight_type,
    applies_to: entry.applies_to,
    confidence: entry.confidence,
    source_meeting_id: r.meeting_id,
    embedding: embeddings[i] as unknown as string,
  }));

  // pgvector accepts arrays via PostgREST when passed as a JSON array
  // matching the vector dim. Supabase JS does the right thing.
  const { error: insErr } = await supabase
    .from('montree_tracy_corpus')
    .insert(rowsToInsert);

  if (insErr) {
    console.warn(
      '[tracy/corpus/extract] insert failed:',
      insErr.message
    );
    return { ok: false, created: 0, reason: insErr.message };
  }

  await supabase
    .from('montree_parent_meeting_analyses')
    .update({ corpus_extracted_at: new Date().toISOString() })
    .eq('id', analysisId);

  return { ok: true, created: rowsToInsert.length };
}

function sanitizeRefined(raw: unknown): RefinedEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const txt = typeof r.insight_text === 'string' ? r.insight_text.trim() : '';
  if (txt.length < 20 || txt.length > 2000) return null;
  const type = typeof r.insight_type === 'string' ? r.insight_type : '';
  if (!VALID_INSIGHT_TYPES.has(type)) return null;
  const conf = typeof r.confidence === 'number' ? r.confidence : 0.7;
  const applies_to =
    r.applies_to && typeof r.applies_to === 'object' && !Array.isArray(r.applies_to)
      ? (r.applies_to as Record<string, unknown>)
      : {};
  return {
    insight_text: txt,
    insight_type: type,
    applies_to,
    confidence: Math.max(0, Math.min(1, conf)),
  };
}
