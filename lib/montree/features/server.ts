// lib/montree/features/server.ts
// Server-side feature flag check for API route gating
// Usage in API routes:
//   const supabase = getSupabase();
//   if (!await isFeatureEnabled(supabase, schoolId, 'voice_observations')) {
//     return NextResponse.json({ error: 'Feature not enabled' }, { status: 403 });
//   }

import type { FeatureKey } from './types';

// ── Process-level feature-flag cache (Session 137 perf) ──────────────────
//
// isFeatureEnabled is called on ~30 hot routes — every photo-identification,
// appointment, calendar, weekly-admin, parent-messaging route, plus tier
// gating via resolveReportModel (which calls it TWICE). Each call was 1-2
// SERIAL Supabase round-trips, and on this Railway↔Supabase setup a single
// round-trip can take >3s. Uncached, that put 3-12s of pure flag-lookup
// latency on the front of gated requests.
//
// Flags change rarely (a super-admin toggle), so a short TTL is safe. A flip
// propagates within TTL_MS. Multi-instance Railway: each process has its own
// cache; cross-instance staleness self-heals at TTL. writeFeatureFlag callers
// can call invalidateFeatureCache() for instant local propagation.
const FEATURE_CACHE_TTL_MS = 30_000;
const featureCache = new Map<string, { value: boolean; expires: number }>();

/** Invalidate one (schoolId, featureKey) entry, all entries for a school, or all. */
export function invalidateFeatureCache(schoolId?: string, featureKey?: string): void {
  if (!schoolId) {
    featureCache.clear();
    return;
  }
  if (featureKey) {
    featureCache.delete(`${schoolId}:${featureKey}`);
    return;
  }
  const prefix = `${schoolId}:`;
  for (const key of featureCache.keys()) {
    if (key.startsWith(prefix)) featureCache.delete(key);
  }
}

/**
 * Check if a feature is enabled for a school (server-side).
 * Priority: school_override > definition_default.
 * Fail-closed: returns false on any error.
 * Cached per (schoolId, featureKey) with a short TTL — see note above.
 */
export async function isFeatureEnabled(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared helper takes the untyped service-role client
  supabase: any,
  schoolId: string,
  featureKey: FeatureKey
): Promise<boolean> {
  const cacheKey = `${schoolId}:${featureKey}`;
  const cached = featureCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  try {
    // Check school-level override first
    const { data: schoolOverride } = await supabase
      .from('montree_school_features')
      .select('enabled')
      .eq('school_id', schoolId)
      .eq('feature_key', featureKey)
      .maybeSingle();

    let value: boolean;
    if (schoolOverride) {
      value = schoolOverride.enabled;
    } else {
      // Fall back to definition default
      const { data: def } = await supabase
        .from('montree_feature_definitions')
        .select('default_enabled')
        .eq('feature_key', featureKey)
        .maybeSingle();
      value = def?.default_enabled ?? false;
    }

    featureCache.set(cacheKey, { value, expires: Date.now() + FEATURE_CACHE_TTL_MS });
    return value;
  } catch (err) {
    console.error(`[features] isFeatureEnabled error for ${featureKey}:`, err);
    // Fail closed — feature disabled on error. Do NOT cache errors: a transient
    // blip shouldn't pin a feature OFF for the whole TTL — next call retries.
    return false;
  }
}
