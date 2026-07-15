// lib/story/coach/history-search.ts
//
// Diary Recall — searchCoachHistory().
//
// story_coach_log is the coach's PERMANENT verbatim diary: every turn, encrypted
// at rest, never pruned. The running thread (loadRecentThread) only surfaces the
// last ~12 turns / 72h. This helper lets recall_history reach the WHOLE log when
// the user references something older — a name, a dream, a plan.
//
// TIERED so we never read the whole diary at once:
//   Tier 1  last 7 days   →  Tier 2  last 30 days   →  Tier 3  all time.
// Stop at the first tier that yields ≥1 hit. Each tier runs a SEMANTIC pass
// (query embedding → pgvector cosine via the story_coach_log_search RPC) AND a
// KEYWORD pass (decrypt rows in-window, match significant query tokens). The
// keyword pass carries the tier alone when embeddings are unavailable.
//
// An explicit date range skips tiering and searches that window only.
//
// PRIVACY / SCOPING (hard invariant): EVERY query filters .eq('space', space)
// (or p_space) — the only tenant boundary. The RPC returns ids + metadata only;
// decryption happens HERE in JS with the server key. Rows that fail to decrypt
// are skipped. E2e spaces never reach this code (guarded in the executor).

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { readDiaryField, DIARY_DECRYPT_FAILURE_SENTINEL } from '@/lib/story/diary-crypto';
import { embedText } from './log-embeddings';

// ── Tunables ──────────────────────────────────────────────────────────────────
const MIN_SIMILARITY = 0.35;
const SEMANTIC_LIMIT = 8;
const KEYWORD_WINDOW_CAP = 300; // Tier 1/2 + explicit range: rows decrypted per window
const KEYWORD_MONTH_CAP = 200;  // Tier 3: rows decrypted per calendar month
const WALKBACK_MONTHS = 12;     // Tier 3: months scanned per call (hard cap)
const MAX_RESULTS = 6;          // turns returned to the model
const FIELD_CAP = 1200;         // per-field chars in a returned turn
const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Common function words stripped before keyword matching. Kept modest so content
// words survive; a token must be length ≥3 AND not here to count.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'nor', 'but', 'yet', 'are', 'was', 'were', 'been', 'being',
  'has', 'have', 'had', 'did', 'does', 'done', 'its', 'this', 'that', 'these', 'those',
  'you', 'your', 'yours', 'him', 'her', 'his', 'she', 'they', 'them', 'their', 'our',
  'ours', 'mine', 'with', 'from', 'into', 'over', 'than', 'then', 'about', 'what',
  'when', 'where', 'which', 'who', 'whom', 'how', 'why', 'not', 'yes', 'can', 'could',
  'would', 'should', 'will', 'shall', 'may', 'might', 'must', 'just', 'like', 'get',
  'got', 'out', 'all', 'any', 'some', 'one', 'two', 'told', 'tell', 'said', 'say',
  'says', 'ask', 'asked', 'remember', 'recall',
]);

export interface SearchHistoryOpts {
  query: string;
  date_from?: string;
  date_to?: string;
  search_older?: boolean;
}

export type HistoryTier = 'short' | 'medium' | 'long' | 'range';

export interface HistoryTurn {
  date: string; // YYYY-MM-DD
  tier: HistoryTier;
  similarity?: number; // present for semantic hits
  question: string;
  answer: string;
}

export interface SearchHistoryResult {
  success: boolean;
  turns: HistoryTurn[];
  tier_reached: HistoryTier | 'none';
  months_scanned: number;    // Tier-3 walk-back months scanned this call (else 0)
  older_unsearched: boolean; // Tier-3 hit the 12-month cap without exhausting history
  note?: string;
}

type EncryptedRow = {
  id: string;
  created_at: string;
  question_enc: string | null;
  answer_enc: string | null;
  cipher_version: number | null;
};
type DecryptedRow = { id: string; created_at: string; question: string; answer: string };
type SemanticHit = { id: string; created_at: string; similarity: number };

// ── Helpers ─────────────────────────────────────────────────────────────────

function significantTokens(query: string): string[] {
  const raw = (query || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    if (t.length < 3 || STOPWORDS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function decryptRow(r: EncryptedRow): DecryptedRow | null {
  let q = '';
  let a = '';
  try {
    q = r.question_enc ? readDiaryField(r.question_enc, r.cipher_version) : '';
    a = r.answer_enc ? readDiaryField(r.answer_enc, r.cipher_version) : '';
  } catch {
    return null; // undecryptable → skip, never surface ciphertext
  }
  if (q === DIARY_DECRYPT_FAILURE_SENTINEL) q = '';
  if (a === DIARY_DECRYPT_FAILURE_SENTINEL) a = '';
  if (!q.trim() && !a.trim()) return null;
  return { id: r.id, created_at: r.created_at, question: q, answer: a };
}

function matchesKeywords(row: DecryptedRow, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const hay = (row.question + '\n' + row.answer).toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

function isoDaysAgo(days: number, nowIso: string): string {
  return new Date(new Date(nowIso).getTime() - days * 86_400_000).toISOString();
}

/** Half-open calendar-month window `monthsBack` months before `now` (UTC). */
function monthWindow(now: Date, monthsBack: number): { fromIso: string; toIso: string } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-11 — Date.UTC rolls the year for negative months
  const start = new Date(Date.UTC(y, m - monthsBack, 1, 0, 0, 0, 0));
  const nextStart = new Date(Date.UTC(y, m - monthsBack + 1, 1, 0, 0, 0, 0));
  // fetchWindowRows uses lte on toIso; step back 1ms to keep the window half-open.
  return { fromIso: start.toISOString(), toIso: new Date(nextStart.getTime() - 1).toISOString() };
}

function toTurn(row: DecryptedRow, tier: HistoryTier, similarity?: number): HistoryTurn {
  return {
    date: (row.created_at || '').slice(0, 10),
    tier,
    ...(typeof similarity === 'number' ? { similarity: Math.round(similarity * 1000) / 1000 } : {}),
    question: row.question.slice(0, FIELD_CAP),
    answer: row.answer.slice(0, FIELD_CAP),
  };
}

/** Semantic hits first (similarity desc), then keyword hits (recent first), deduped. */
function mergeResults(
  semanticHits: SemanticHit[],
  keywordHits: DecryptedRow[],
  cache: Map<string, DecryptedRow>,
  tier: HistoryTier,
): HistoryTurn[] {
  const out: HistoryTurn[] = [];
  const used = new Set<string>();

  const semSorted = [...semanticHits].sort((a, b) => b.similarity - a.similarity);
  for (const h of semSorted) {
    if (out.length >= MAX_RESULTS) break;
    if (used.has(h.id)) continue;
    const row = cache.get(h.id);
    if (!row) continue; // couldn't decrypt / fetch — skip rather than emit garbage
    used.add(h.id);
    out.push(toTurn(row, tier, h.similarity));
  }

  const kwSorted = [...keywordHits].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const r of kwSorted) {
    if (out.length >= MAX_RESULTS) break;
    if (used.has(r.id)) continue;
    used.add(r.id);
    out.push(toTurn(r, tier));
  }
  return out;
}

// ── DB access (every query is .eq('space', space)) ───────────────────────────

async function fetchWindowRows(
  supabase: SupabaseClient,
  space: string,
  fromIso: string,
  toIso: string,
  cap: number,
): Promise<DecryptedRow[]> {
  const { data, error } = await supabase
    .from('story_coach_log')
    .select('id, question_enc, answer_enc, cipher_version, created_at')
    .eq('space', space)
    .gte('created_at', fromIso)
    .lte('created_at', toIso)
    .order('created_at', { ascending: false })
    .limit(cap);
  if (error || !data) {
    if (error) console.warn('[coach/history-search] window fetch error:', error.message);
    return [];
  }
  const out: DecryptedRow[] = [];
  for (const r of data as EncryptedRow[]) {
    const dec = decryptRow(r);
    if (dec) out.push(dec);
  }
  return out;
}

async function fetchRowsByIds(
  supabase: SupabaseClient,
  space: string,
  ids: string[],
): Promise<Map<string, DecryptedRow>> {
  const map = new Map<string, DecryptedRow>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from('story_coach_log')
    .select('id, question_enc, answer_enc, cipher_version, created_at')
    .eq('space', space)
    .in('id', ids);
  if (error || !data) {
    if (error) console.warn('[coach/history-search] id fetch error:', error.message);
    return map;
  }
  for (const r of data as EncryptedRow[]) {
    const dec = decryptRow(r);
    if (dec) map.set(dec.id, dec);
  }
  return map;
}

/** Semantic pass over [fromIso, toIso]. Fail-open → [] (keyword path carries). */
async function semanticSearch(
  supabase: SupabaseClient,
  space: string,
  queryEmbedding: number[],
  fromIso: string,
  toIso: string,
): Promise<SemanticHit[]> {
  try {
    const { data, error } = await supabase.rpc('story_coach_log_search', {
      p_space: space,
      // pgvector accepts a JS number[] via PostgREST (same pattern as
      // tracy_corpus_search / montree_global_vm_search). Cast for the untyped client.
      p_query_embedding: queryEmbedding as unknown as string,
      p_from: fromIso,
      p_to: toIso,
      p_min_similarity: MIN_SIMILARITY,
      p_limit: SEMANTIC_LIMIT,
    });
    if (error) {
      // 42883 / 42703 / 42P01 = migration 295/295b not run yet → keyword path.
      console.warn('[coach/history-search] RPC failed (fail-open to keyword):', error.message);
      return [];
    }
    return ((data ?? []) as Array<{ id: string; created_at: string; similarity: number | string }>).map((r) => {
      const sim = typeof r.similarity === 'number' ? r.similarity : Number(r.similarity);
      return { id: r.id, created_at: r.created_at, similarity: Number.isFinite(sim) ? sim : 0 };
    });
  } catch (e) {
    console.warn('[coach/history-search] RPC threw (fail-open):', e instanceof Error ? e.message : 'unknown');
    return [];
  }
}

/** One window: semantic + full keyword scan (capped). Used for Tier 1/2 + range. */
async function searchWindow(
  supabase: SupabaseClient,
  space: string,
  queryEmbedding: number[] | null,
  tokens: string[],
  fromIso: string,
  toIso: string,
  tier: HistoryTier,
): Promise<HistoryTurn[]> {
  // Keyword pass — decrypt the window (capped), cache rows, collect hits.
  const windowRows = await fetchWindowRows(supabase, space, fromIso, toIso, KEYWORD_WINDOW_CAP);
  const cache = new Map<string, DecryptedRow>();
  for (const r of windowRows) cache.set(r.id, r);
  const keywordHits = windowRows.filter((r) => matchesKeywords(r, tokens));

  // Semantic pass — fetch any hit rows we haven't already decrypted.
  let semanticHits: SemanticHit[] = [];
  if (queryEmbedding) {
    semanticHits = await semanticSearch(supabase, space, queryEmbedding, fromIso, toIso);
    const missing = semanticHits.map((h) => h.id).filter((id) => !cache.has(id));
    if (missing.length) {
      const fetched = await fetchRowsByIds(supabase, space, missing);
      for (const [id, row] of fetched) cache.set(id, row);
    }
  }

  return mergeResults(semanticHits, keywordHits, cache, tier);
}

/** Tier 3: all-time semantic + month-by-month keyword walk-back. */
async function searchLongTerm(
  supabase: SupabaseClient,
  space: string,
  queryEmbedding: number[] | null,
  tokens: string[],
  nowIso: string,
  searchOlder: boolean,
): Promise<{ turns: HistoryTurn[]; months_scanned: number; older_unsearched: boolean }> {
  const cache = new Map<string, DecryptedRow>();

  // Semantic across ALL time.
  let semanticHits: SemanticHit[] = [];
  if (queryEmbedding) {
    semanticHits = await semanticSearch(supabase, space, queryEmbedding, EPOCH_ISO, nowIso);
    const fetched = await fetchRowsByIds(supabase, space, semanticHits.map((h) => h.id));
    for (const [id, row] of fetched) cache.set(id, row);
  }

  // Keyword walk-back, most recent month first. `search_older` starts a year back
  // so a follow-up call continues past the first year.
  const baseOffset = searchOlder ? WALKBACK_MONTHS : 0;
  const now = new Date(nowIso);
  const keywordHits: DecryptedRow[] = [];
  let monthsScanned = 0;

  for (let i = 0; i < WALKBACK_MONTHS; i++) {
    const { fromIso, toIso } = monthWindow(now, baseOffset + i);
    const rows = await fetchWindowRows(supabase, space, fromIso, toIso, KEYWORD_MONTH_CAP);
    for (const r of rows) cache.set(r.id, r);
    monthsScanned++;
    const hits = rows.filter((r) => matchesKeywords(r, tokens));
    if (hits.length) {
      keywordHits.push(...hits);
      break; // stop on the FIRST month with hits
    }
  }
  // Scanned the full cap with no keyword hit → older history remains unsearched.
  const olderUnsearched = keywordHits.length === 0 && monthsScanned >= WALKBACK_MONTHS;

  return {
    turns: mergeResults(semanticHits, keywordHits, cache, 'long'),
    months_scanned: monthsScanned,
    older_unsearched: olderUnsearched,
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function searchCoachHistory(
  supabase: SupabaseClient,
  space: string,
  opts: SearchHistoryOpts,
): Promise<SearchHistoryResult> {
  const query = (opts.query || '').trim();
  if (!query) {
    return { success: false, turns: [], tier_reached: 'none', months_scanned: 0, older_unsearched: false, note: 'query required' };
  }
  const tokens = significantTokens(query);
  const nowIso = new Date().toISOString();

  // Embed the query ONCE, reuse across every tier. null → keyword-only (fail-open).
  const queryEmbedding = await embedText(query);

  // ── Explicit date range → search that window only, skip tiering. ──
  const from = opts.date_from && DATE_RE.test(opts.date_from) ? opts.date_from : null;
  const to = opts.date_to && DATE_RE.test(opts.date_to) ? opts.date_to : null;
  if (from || to) {
    const fromIso = from ? `${from}T00:00:00.000Z` : EPOCH_ISO;
    const toIso = to ? `${to}T23:59:59.999Z` : nowIso;
    const turns = await searchWindow(supabase, space, queryEmbedding, tokens, fromIso, toIso, 'range');
    return {
      success: true,
      turns,
      tier_reached: turns.length ? 'range' : 'none',
      months_scanned: 0,
      older_unsearched: false,
      note: turns.length ? undefined : 'No matching turns in that date range.',
    };
  }

  // ── Tier 1: last 7 days ──
  const t1 = await searchWindow(supabase, space, queryEmbedding, tokens, isoDaysAgo(7, nowIso), nowIso, 'short');
  if (t1.length) {
    return { success: true, turns: t1, tier_reached: 'short', months_scanned: 0, older_unsearched: false };
  }

  // ── Tier 2: last 30 days ──
  const t2 = await searchWindow(supabase, space, queryEmbedding, tokens, isoDaysAgo(30, nowIso), nowIso, 'medium');
  if (t2.length) {
    return { success: true, turns: t2, tier_reached: 'medium', months_scanned: 0, older_unsearched: false };
  }

  // ── Tier 3: all time (semantic) + month-by-month keyword walk-back ──
  const t3 = await searchLongTerm(supabase, space, queryEmbedding, tokens, nowIso, opts.search_older === true);
  let note: string | undefined;
  if (t3.turns.length) {
    if (t3.older_unsearched) {
      note = 'Searched the last 12 months of keyword history — older months are still unsearched. Offer to search older if this may be from further back.';
    }
  } else {
    note = t3.older_unsearched
      ? 'No hits in the last 12 months of keyword history and nothing semantically similar. Offer to search older.'
      : 'Nothing found in the diary for that.';
  }
  return {
    success: true,
    turns: t3.turns,
    tier_reached: t3.turns.length ? 'long' : 'none',
    months_scanned: t3.months_scanned,
    older_unsearched: t3.older_unsearched,
    note,
  };
}
