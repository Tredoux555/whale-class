// lib/montree/payouts/api-usage-aggregator.ts
// Phase 5 — Roll up montree_api_usage daily rows into finance_transactions
// direct_cost rows, one per (school, month, api).
//
// Without this, the Phase 5 payout calculator sees $0 for Anthropic + OpenAI
// costs and overpays agents.
//
// Idempotency contract:
//   - source='api_usage_aggregate'
//   - source_ref=`${schoolId}:${periodMonth}:${apiKey}`
//   - The UNIQUE partial index on (source, source_ref) lets us UPSERT cleanly.
//
// API split rules (based on the `model_used` column in montree_api_usage):
//   - Anthropic   = SUM where model_used starts with 'claude-' OR includes 'anthropic'
//   - OpenAI      = SUM where model_used starts with 'gpt-' OR 'whisper' OR 'tts'
//                   OR includes 'openai'
//   - Anything else falls into 'api_other' (and is rolled up as such).
//
// Cost field: montree_api_usage.cost_usd is in USD. We assume USD = original
// currency for now (consistent with the rest of the billing pipeline).

import type { SupabaseClient } from '@supabase/supabase-js';
import { monthRange } from './calculator';

interface ApiUsageRow {
  school_id: string | null;
  cost_usd: number;
  model_used: string | null;
  created_at: string;
}

export interface ApiUsageRollupResult {
  period_month: string;
  rows_processed: number;
  finance_tx_upserted: number;
  schools_touched: number;
  errors: Array<{ school_id: string; error: string }>;
}

type ApiKey = 'api_anthropic' | 'api_openai' | 'api_other';

function classifyApi(modelUsed: string | null): ApiKey {
  if (!modelUsed) return 'api_other';
  const m = modelUsed.toLowerCase();
  if (m.startsWith('claude-') || m.includes('anthropic')) return 'api_anthropic';
  if (
    m.startsWith('gpt-') ||
    m.startsWith('whisper') ||
    m.startsWith('tts') ||
    m.startsWith('o1-') ||
    m.includes('openai')
  ) {
    return 'api_openai';
  }
  return 'api_other';
}

const API_DESCRIPTIONS: Record<ApiKey, string> = {
  api_anthropic: 'Anthropic API usage',
  api_openai: 'OpenAI API usage',
  api_other: 'Other API usage',
};

/**
 * Aggregate api_usage rows for `periodMonth` into per-(school, api) finance_tx
 * direct_cost rows. Idempotent — replaying overwrites the existing aggregate
 * row (matched via the UNIQUE source_ref index).
 *
 * Scope can be narrowed to a single school via `schoolId`.
 */
export async function aggregateApiUsage(
  supabase: SupabaseClient,
  periodMonth: string,
  schoolId?: string
): Promise<ApiUsageRollupResult> {
  const { start, end } = monthRange(periodMonth);
  const result: ApiUsageRollupResult = {
    period_month: periodMonth,
    rows_processed: 0,
    finance_tx_upserted: 0,
    schools_touched: 0,
    errors: [],
  };

  // 1. Pull api_usage rows for the month.
  let q = supabase
    .from('montree_api_usage')
    .select('school_id, cost_usd, model_used, created_at')
    .gte('created_at', start)
    .lt('created_at', end)
    .not('school_id', 'is', null);

  if (schoolId) q = q.eq('school_id', schoolId);

  const { data, error } = await q;
  if (error) {
    console.error('[aggregateApiUsage] usage query failed', error);
    throw error;
  }

  const usage = (data || []) as ApiUsageRow[];
  result.rows_processed = usage.length;
  if (!usage.length) return result;

  // 2. Group by (school_id, apiKey) → sum cost_usd.
  const buckets = new Map<string, { schoolId: string; api: ApiKey; total: number; count: number }>();
  for (const row of usage) {
    if (!row.school_id) continue;
    const api = classifyApi(row.model_used);
    const key = `${row.school_id}::${api}`;
    const cost = Number(row.cost_usd) || 0;
    if (cost <= 0) continue; // skip zero/negative rows defensively
    const existing = buckets.get(key);
    if (existing) {
      existing.total += cost;
      existing.count += 1;
    } else {
      buckets.set(key, { schoolId: row.school_id, api, total: cost, count: 1 });
    }
  }

  if (!buckets.size) return result;
  result.schools_touched = new Set(Array.from(buckets.values()).map((b) => b.schoolId)).size;

  // 3. UPSERT one direct_cost row per bucket. We use the unique partial index
  //    idx_finance_tx_source_unique on (source, source_ref). When the row
  //    already exists, we update its amount (drift correction). When new, we
  //    insert.
  //
  //    Compute occurred_at = last day of month at 23:59:59 UTC. That's the
  //    canonical reporting timestamp for a monthly aggregate.
  const occurredAt = new Date(new Date(end).getTime() - 1).toISOString();

  for (const [, bucket] of buckets) {
    const sourceRef = `${bucket.schoolId}:${periodMonth}:${bucket.api}`;
    const usdAmount = Math.round(bucket.total * 10000) / 10000; // 4dp
    const notes = `Aggregated from ${bucket.count} api_usage rows in ${periodMonth}`;
    const payload = {
      occurred_at: occurredAt,
      type: 'direct_cost' as const,
      category: bucket.api,
      description: `${API_DESCRIPTIONS[bucket.api]} for ${periodMonth}`,
      school_id: bucket.schoolId,
      original_currency: 'USD',
      original_amount: usdAmount,
      fx_rate: 1.0,
      usd_amount: usdAmount,
      source: 'api_usage_aggregate' as const,
      source_ref: sourceRef,
      notes,
    };

    // Race-safe: try INSERT. If it fails with the UNIQUE constraint on
    // (source, source_ref), fall back to UPDATE. This handles concurrent
    // "Calculate now" clicks + cron firing without leaving partial state.
    try {
      const { error: insErr } = await supabase
        .from('montree_finance_transactions')
        .insert(payload);

      if (!insErr) {
        result.finance_tx_upserted += 1;
        continue;
      }

      // 23505 = unique_violation. Anything else is a real error.
      const code = (insErr as { code?: string }).code;
      if (code !== '23505') {
        result.errors.push({ school_id: bucket.schoolId, error: insErr.message });
        continue;
      }

      // Conflict — row exists. Update by source_ref (the canonical key).
      const { error: updErr } = await supabase
        .from('montree_finance_transactions')
        .update(payload)
        .eq('source', 'api_usage_aggregate')
        .eq('source_ref', sourceRef);

      if (updErr) {
        result.errors.push({ school_id: bucket.schoolId, error: updErr.message });
        continue;
      }
      result.finance_tx_upserted += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push({ school_id: bucket.schoolId, error: msg });
    }
  }

  return result;
}
