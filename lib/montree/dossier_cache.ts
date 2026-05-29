// lib/montree/dossier_cache.ts
//
// 24-hour cache for prepare_parent_meeting (Astra) and
// prepare_principal_pitch (Mira) dossiers.
//
// Both tools cache on the same table (montree_meeting_dossiers, migration
// 237) keyed on a stable hash of the inputs. The audience_type column
// distinguishes the two surfaces so they share without colliding.
//
// FAIL-OPEN BEHAVIOUR
//   If the table doesn't exist yet (migration 237 not run), readDossier
//   returns null and writeDossier swallows the error. The route falls
//   through to live Sonnet generation each call. The principal still gets
//   a working dossier; she just pays for every open until the migration
//   runs.

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type DossierAudienceType = 'parent_meeting' | 'principal_pitch';
export type DossierOwnerRole = 'principal' | 'agent';
export type DossierOutputFormat = 'markdown' | 'html' | 'json';

export interface DossierCacheKeyInput {
  audience_type: DossierAudienceType;
  audience_ref: string;
  meeting_purpose: string;
  parent_context: string | null;
  output_format: DossierOutputFormat;
  /**
   * Owner scope — REQUIRED to prevent cache cross-tenant leaks.
   * For Astra: pass the school_id (so Principal A can't read Principal B's
   * dossiers even if they pass an unrelated child_id).
   * For Mira: pass the agent_id (so Agent A can't read Agent B's pitches).
   *
   * This is load-bearing security — the cache lookup happens BEFORE the
   * ownership check inside preparePMeeting / preparePitch, so without
   * this scope in the key, a malicious caller can use the cache as a
   * data-leak side channel.
   */
  scope_owner_id: string;
  /** Optional extra inputs to include in the hash. Use for future fields. */
  extras?: Record<string, string | null | undefined>;
}

export interface DossierReadResult {
  found: boolean;
  payload_text?: string;
  output_format?: DossierOutputFormat;
  generated_at?: string;
  expires_at?: string;
  cost_usd?: number;
  cache_age_seconds?: number;
}

export interface DossierWriteInput {
  owner_id: string;
  owner_role: DossierOwnerRole;
  school_id: string | null;
  audience_type: DossierAudienceType;
  audience_ref: string;
  cache_key: string;
  meeting_purpose: string;
  parent_context: string | null;
  output_format: DossierOutputFormat;
  payload_text: string;
  model_used: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  generation_ms: number | null;
}

// PostgREST surfaces missing tables differently depending on whether the
// schema cache or the Postgres error wins the race. Cover both.
//   42P01     — raw Postgres "undefined_table"
//   PGRST205  — PostgREST "could not find the table in the schema cache"
//   PGRST204  — PostgREST schema-cache stale (rare but seen)
const MISSING_TABLE_CODES = new Set(['42P01', 'PGRST205', 'PGRST204']);

function isMissingTableMessage(msg: string | null | undefined): boolean {
  if (!msg) return false;
  return /Could not find the table|schema cache/i.test(msg);
}

/**
 * Build the canonical cache key for a dossier. Stable across processes —
 * any two calls with the same inputs produce the same key.
 *
 * The hash is SHA-256, hex-encoded, 64 chars. We include audience_type in
 * the input so Astra and Mira can't collide on otherwise-identical keys.
 */
export function makeDossierCacheKey(input: DossierCacheKeyInput): string {
  // Session 133 audit fix: normalize ALL string values (not just the
  // top-level ones) before hashing, so "country=Hong Kong" and
  // "country=hong kong" hit the same cache row.
  const normExtras = input.extras
    ? Object.entries(input.extras)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => [k, String(v).trim().toLowerCase()] as const)
        .filter(([, v]) => v.length > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('|')
    : '';
  const payload = {
    a: input.audience_type,
    // 🚨 owner_id is in the cache key by design — see the JSDoc on
    // DossierCacheKeyInput.scope_owner_id. Removing it re-introduces
    // the cross-tenant cache leak the security audit caught.
    o: input.scope_owner_id,
    r: input.audience_ref.trim().toLowerCase(),
    p: input.meeting_purpose.trim().toLowerCase(),
    c: (input.parent_context ?? '').trim().toLowerCase(),
    f: input.output_format,
    x: normExtras,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * Look up a cached dossier. Returns the row if a non-expired one exists
 * for the given key. Always returns ok=true even on miss — failure to
 * find is not an error.
 *
 * If the table doesn't exist (migration 237 not yet run), returns
 * `{ found: false }` rather than throwing. The route continues with
 * live generation.
 */
export async function readDossier(
  supabase: SupabaseClient,
  cacheKey: string
): Promise<DossierReadResult> {
  try {
    const { data, error } = await supabase
      .from('montree_meeting_dossiers')
      .select(
        'payload_text, output_format, generated_at, expires_at, cost_usd'
      )
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (
        MISSING_TABLE_CODES.has(error.code || '') ||
        isMissingTableMessage(error.message)
      ) {
        // Migration 237 not yet run. Fail open — caller will regenerate.
        return { found: false };
      }
      console.warn('[dossier_cache.readDossier]', error.message);
      return { found: false };
    }

    if (!data) return { found: false };

    const generatedAt = new Date(data.generated_at);
    const ageSeconds = Math.max(
      0,
      Math.floor((Date.now() - generatedAt.getTime()) / 1000)
    );

    return {
      found: true,
      payload_text: data.payload_text,
      output_format: data.output_format as DossierOutputFormat,
      generated_at: data.generated_at,
      expires_at: data.expires_at,
      cost_usd: data.cost_usd ?? undefined,
      cache_age_seconds: ageSeconds,
    };
  } catch (e) {
    console.warn('[dossier_cache.readDossier] threw:', e);
    return { found: false };
  }
}

/**
 * Persist a generated dossier. Fire-and-forget at the call site (the
 * route returns the response immediately; cache write happens in the
 * background). The function returns whether the write landed for
 * telemetry purposes; route should NOT block on it.
 *
 * Like readDossier, if the table is missing this is a no-op success.
 */
export async function writeDossier(
  supabase: SupabaseClient,
  input: DossierWriteInput
): Promise<{ ok: boolean; error?: string; migration_pending?: boolean }> {
  try {
    const { error } = await supabase.from('montree_meeting_dossiers').insert({
      owner_id: input.owner_id,
      owner_role: input.owner_role,
      school_id: input.school_id,
      audience_type: input.audience_type,
      audience_ref: input.audience_ref,
      cache_key: input.cache_key,
      meeting_purpose: input.meeting_purpose,
      parent_context: input.parent_context,
      output_format: input.output_format,
      payload_text: input.payload_text,
      model_used: input.model_used,
      input_tokens: input.input_tokens,
      output_tokens: input.output_tokens,
      cost_usd: input.cost_usd,
      generation_ms: input.generation_ms,
    });
    if (error) {
      if (
        MISSING_TABLE_CODES.has(error.code || '') ||
        isMissingTableMessage(error.message)
      ) {
        // Migration 237 not yet run. Caller treated this as a no-op
        // success; flagged so logs surface the state.
        return { ok: false, migration_pending: true };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'writeDossier threw',
    };
  }
}
