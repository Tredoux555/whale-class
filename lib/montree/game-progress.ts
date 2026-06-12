// lib/montree/game-progress.ts
// Shared input-sanitising helpers for the /api/games/progress and
// /api/games/track routes (montree_game_progress, migration 252).
//
// All game payloads are client-asserted (the games run on classroom tablets
// and read child ids out of localStorage), so everything is validated or
// clamped server-side before it touches the table — and anything that does
// NOT check out is logged with context, never dropped silently.

import type { SupabaseClient } from '@supabase/supabase-js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Coerce a client-sent number to a sane non-negative integer (or null). */
export function toCount(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(Math.round(n), 0), 1_000_000_000);
}

/** Trim/cap a client-sent identifier string; null when empty/not a string. */
export function cleanKey(v: unknown, max = 64): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s.length ? s : null;
}

/** Cap a free-form JSON payload so one client can't grow rows unboundedly. */
export function capPayload(v: unknown, route: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  try {
    const serialized = JSON.stringify(v);
    if (serialized.length > 8192) {
      console.warn(`[${route}] payload truncated (${serialized.length} bytes > 8192 cap)`);
      return { truncated: true, original_bytes: serialized.length };
    }
    return v as Record<string, unknown>;
  } catch (e) {
    console.error(`[${route}] payload serialization failed:`, e);
    return {};
  }
}

/**
 * Validate a client-asserted child id against montree_children WITHIN the
 * caller's school. Returns childId when it checks out, null otherwise — the
 * caller should keep the raw value in payload.client_child_id so the data
 * isn't lost, without ever writing a forged/cross-school child_id column.
 */
export async function resolveChildId(
  supabase: SupabaseClient,
  rawId: unknown,
  schoolId: string,
  route: string
): Promise<{ childId: string | null; rawId: string | null }> {
  const raw = typeof rawId === 'string' ? rawId.trim().slice(0, 128) : null;
  if (!raw) return { childId: null, rawId: null };
  if (!UUID_RE.test(raw)) {
    console.warn(`[${route}] non-UUID child id from client (kept in payload only)`);
    return { childId: null, rawId: raw };
  }
  const { data, error } = await supabase
    .from('montree_children')
    .select('id')
    .eq('id', raw)
    .eq('school_id', schoolId)
    .maybeSingle();
  if (error) {
    console.error(`[${route}] child lookup failed:`, error.message);
    return { childId: null, rawId: raw };
  }
  if (!data) {
    console.warn(`[${route}] child ${raw} not found in school ${schoolId} (kept in payload only)`);
    return { childId: null, rawId: raw };
  }
  return { childId: raw, rawId: raw };
}
