// lib/montree/tracy/corpus/search.ts
//
// Ultimate Astra Phase C — semantic search over the school-scoped corpus.
//
// searchCorpus({ schoolId, query, archetype?, parentId?, minSimilarity?, limit? })
//   1. Embed the query text via OpenAI.
//   2. Call tracy_corpus_search RPC with school_id + archetype filter.
//   3. Fire-and-forget bump reference_count on returned ids.
//
// SCHOOL-SCOPING
//   The RPC's WHERE clause is hard-coded `school_id = p_school_id`.
//   Callers MUST pass schoolId; the function does not have a "no scope"
//   path.
//
// FAILURE
//   Returns { ok: false, entries: [] } on any error. Astra's reply path
//   degrades gracefully when corpus retrieval fails.

import type { SupabaseClient } from '@supabase/supabase-js';
import { embedText } from './embeddings';

export interface CorpusEntry {
  id: string;
  insight_text: string;
  insight_type: string;
  applies_to: Record<string, unknown>;
  confidence: number;
  source_meeting_id: string | null;
  reference_count: number;
  last_referenced_at: string | null;
  created_at: string;
  similarity: number;
}

export interface SearchCorpusInput {
  schoolId: string;
  query: string;
  archetype?: string;
  /** Cosine similarity threshold 0-1. Default 0.6 (loose). */
  minSimilarity?: number;
  /** Max entries to return. Default 8. Hard cap 30. */
  limit?: number;
}

export interface SearchCorpusResult {
  ok: boolean;
  entries: CorpusEntry[];
  error?: string;
}

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

export async function searchCorpus(
  input: SearchCorpusInput,
  supabase: SupabaseClient
): Promise<SearchCorpusResult> {
  const {
    schoolId,
    query,
    archetype,
    minSimilarity = 0.6,
    limit = 8,
  } = input;
  if (!schoolId) return { ok: false, entries: [], error: 'schoolId required' };
  if (!query || query.trim().length < 3) {
    return { ok: false, entries: [], error: 'query too short' };
  }

  let embedding: number[];
  try {
    embedding = await embedText(query);
  } catch (err) {
    return {
      ok: false,
      entries: [],
      error: err instanceof Error ? err.message : 'embed failed',
    };
  }

  try {
    const { data, error } = await supabase.rpc('tracy_corpus_search', {
      p_school_id: schoolId,
      p_query_embedding: embedding,
      p_archetype: archetype ?? null,
      p_min_similarity: minSimilarity,
      p_limit: Math.min(30, Math.max(1, limit)),
    });

    if (error) {
      if (isMigrationMissing(error)) {
        return { ok: false, entries: [], error: 'migration_pending' };
      }
      return { ok: false, entries: [], error: error.message };
    }

    const entries = Array.isArray(data) ? (data as CorpusEntry[]) : [];

    // Fire-and-forget reference bump.
    if (entries.length > 0) {
      const ids = entries.map((e) => e.id);
      void supabase
        .rpc('tracy_corpus_bump_references', { p_ids: ids })
        .then(({ error: bumpErr }) => {
          if (bumpErr) {
            console.warn(
              '[tracy/corpus/search] bump references failed:',
              bumpErr.message
            );
          }
        });
    }

    return { ok: true, entries };
  } catch (err) {
    if (isMigrationMissing(err)) {
      return { ok: false, entries: [], error: 'migration_pending' };
    }
    return {
      ok: false,
      entries: [],
      error: err instanceof Error ? err.message : 'unknown',
    };
  }
}

/**
 * Render top-N corpus entries as a markdown block for injection into
 * Sonnet prompts. Empty string when no entries.
 */
export function renderCorpusForPrompt(entries: CorpusEntry[], topN = 5): string {
  if (entries.length === 0) return '';
  const slice = entries.slice(0, topN);
  const lines: string[] = ['# CORPUS — what has worked at this school before'];
  for (const e of slice) {
    lines.push(
      `- (${e.insight_type}, conf ${e.confidence.toFixed(2)}, sim ${e.similarity.toFixed(2)}) ${e.insight_text}`
    );
  }
  return lines.join('\n');
}
