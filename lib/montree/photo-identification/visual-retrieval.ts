// lib/montree/photo-identification/visual-retrieval.ts
//
// Visual-similarity retrieval over the curated GLOBAL visual memory
// (montree_global_visual_memory, migration 281/282). This is THE class fix for
// photo-ID cold-start misses: candidate RECALL is driven by what the photo
// LOOKS LIKE — the embedding of the Pass-1 visual description — matched by
// cosine similarity against every curated work's visual fingerprint, ACROSS
// ALL AREAS. So the correct work is always reachable regardless of the name
// Haiku Pass 2 guessed (the Sunshine Montessori incident: a Number Rods photo
// whose only candidates were Sensorial staircase works).
//
// The nearest neighbours are used two ways in two-pass.ts:
//   1. Injected into the Pass 2 USER message ("MOST VISUALLY SIMILAR LIBRARY
//      WORKS") so Pass 2 has the visually-nearest options up front and can be
//      right the FIRST time. (User message, NOT the cached system prefix — so
//      the Jul-3 prompt-cache breakpoints survive.)
//   2. Fed into buildPass2bCandidates as a priority tier so the image
//      re-examination is handed the visually-nearest works as explicit A/B/C
//      candidates, and to detect Pass-2-vs-visual disagreement (force Pass 2b).
//
// 🚨 FAIL-OPEN. Any failure — no OPENAI_API_KEY, embedding timeout, migration
//    282 not run (RPC/column absent), zero embedded rows — returns [] and the
//    pipeline behaves EXACTLY as it did before (unchanged Pass 2 / Pass 2b).
//    Retrieval is strictly additive; it can never break identification.

import type { SupabaseClient } from '@supabase/supabase-js';
import { embedText } from '@/lib/montree/tracy/corpus/embeddings';
import type { GlobalVisualMemoryEntry } from './context-loader';

export interface VisualNeighbor {
  /** Canonical global work name (resolves at matchScore 1.0 against curriculum). */
  name: string;
  area: string | null;
  /** Cosine similarity to the query description, 0-1 (higher = more alike). */
  similarity: number;
  /** Composed "LOOKS LIKE: … | KEY MATERIALS: … | DISTINGUISH FROM: …". */
  looksLike: string;
}

function composeLooksLike(e: GlobalVisualMemoryEntry): string {
  const parts = [`LOOKS LIKE: ${e.looksLike}`];
  if (e.keyMaterials) parts.push(`KEY MATERIALS: ${e.keyMaterials}`);
  if (e.distinguishFrom) parts.push(`DISTINGUISH FROM: ${e.distinguishFrom}`);
  return parts.join(' | ');
}

/**
 * Retrieve the top-K global-VM works whose visual fingerprint is nearest to
 * `description` (the Pass-1 photo description). Returns [] on ANY error.
 *
 * @param supabase   service-role client (needed for the RPC)
 * @param description the REAL Pass-1 visual description (not the observation)
 * @param globalEntries context.globalVisualMemoryEntries — the descriptor text
 *                      source; the RPC returns names, we resolve them here so
 *                      the RPC stays light (no big text/vector fields shipped).
 * @param topK       neighbours to return (default 8, clamped 1-20)
 */
export async function retrieveVisualNeighbors(
  supabase: SupabaseClient,
  description: string,
  globalEntries: GlobalVisualMemoryEntry[],
  topK = 8,
): Promise<VisualNeighbor[]> {
  const text = (description || '').trim();
  if (text.length < 10 || globalEntries.length === 0) return [];

  // 1. Embed the Pass-1 visual description (embedText carries its own 15s
  //    timeout; throws on missing key / timeout / bad response → fail-open).
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(text);
  } catch (err) {
    console.warn('[visual-retrieval] embed failed (fail-open):', err instanceof Error ? err.message : err);
    return [];
  }

  // 2. Cosine search over active global VM embeddings, ALL areas.
  let rpcRows: Array<{ work_name: string; area: string | null; similarity: number | string }>;
  try {
    const { data, error } = await supabase.rpc('montree_global_vm_search', {
      // pgvector accepts a JS number[] via PostgREST (same pattern as
      // tracy_corpus_search). Cast for the loosely-typed client.
      p_query_embedding: queryEmbedding as unknown as string,
      p_limit: Math.max(1, Math.min(20, topK)),
    });
    if (error) {
      // 42883 (function missing) / 42P01 / 42703 = migration 282 not run yet.
      console.warn('[visual-retrieval] RPC failed (fail-open):', error.message);
      return [];
    }
    rpcRows = (data ?? []) as typeof rpcRows;
  } catch (err) {
    console.warn('[visual-retrieval] RPC threw (fail-open):', err instanceof Error ? err.message : err);
    return [];
  }

  if (rpcRows.length === 0) return [];

  // 3. Resolve each returned name to its full descriptor for the prompt text.
  const byName = new Map<string, GlobalVisualMemoryEntry>();
  for (const e of globalEntries) {
    const k = e.name.toLowerCase();
    if (!byName.has(k)) byName.set(k, e);
  }

  const out: VisualNeighbor[] = [];
  const seen = new Set<string>();
  for (const r of rpcRows) {
    const key = (r.work_name || '').toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    const entry = byName.get(key);
    if (!entry) continue; // no descriptor for this name — can't use as a candidate
    seen.add(key);
    const sim = typeof r.similarity === 'number' ? r.similarity : Number(r.similarity);
    out.push({
      name: entry.name,
      area: entry.area ?? r.area ?? null,
      similarity: Number.isFinite(sim) ? sim : 0,
      looksLike: composeLooksLike(entry),
    });
  }
  return out;
}
