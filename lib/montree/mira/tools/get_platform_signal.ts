// lib/montree/mira/tools/get_platform_signal.ts
//
// Live platform numbers for the agent's pitch. Mira (and prepare_principal_pitch)
// pull these instead of quoting from memory — numbers go stale fast.
//
// CACHING
//   In-process cache, 10-minute TTL. The numbers don't shift fast enough
//   to need fresher than that, and the queries are cheap but not free
//   when fired on every chat turn.
//
// PRIVACY
//   This tool returns AGGREGATES — counts only. No school names, no
//   child names, no PII. Safe to quote in a cold pitch.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export interface PlatformSignal {
  active_schools: number;
  active_children: number;
  confirmed_observations: number;
  recent_observations_7d: number;
  /** Distinct primary_locale values across active schools. */
  active_languages: number;
  /** Distinct signup_country values, where known. */
  active_countries: number;
  /** Number of distinct classrooms (per active school). */
  active_classrooms: number;
  /** When this snapshot was taken (ISO). */
  generated_at: string;
}

export interface GetPlatformSignalResult {
  ok: boolean;
  error?: string;
  data?: PlatformSignal;
  /** Was this served from cache? Useful for the agent to know freshness. */
  from_cache: boolean;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cached: { at: number; value: PlatformSignal } | null = null;

export async function getPlatformSignal(
  supabase: SupabaseClient,
  options: { forceRefresh?: boolean } = {}
): Promise<GetPlatformSignalResult> {
  const now = Date.now();
  if (
    !options.forceRefresh &&
    cached &&
    now - cached.at < CACHE_TTL_MS
  ) {
    return { ok: true, data: cached.value, from_cache: true };
  }

  try {
    const sevenDaysAgo = new Date(
      now - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Run every count in parallel. Each is a `SELECT count(*) FROM …`
    // via Supabase's count: 'exact' head-only.
    const [
      schoolsRes,
      childrenRes,
      classroomsRes,
      observationsRes,
      recentObsRes,
      schoolsLocaleRes,
    ] = await Promise.all([
      supabase
        .from('montree_schools')
        .select('id, primary_locale, signup_country', { count: 'exact' })
        .eq('is_active', true),
      supabase
        .from('montree_children')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('montree_classrooms')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('montree_media')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_confirmed', true),
      supabase
        .from('montree_media')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_confirmed', true)
        .gte('captured_at', sevenDaysAgo),
      // Same query as schoolsRes really, but we want the rows to compute
      // distinct locale/country in JS rather than firing multiple count
      // queries.
      supabase
        .from('montree_schools')
        .select('primary_locale, signup_country')
        .eq('is_active', true),
    ]);

    const localeSet = new Set<string>();
    const countrySet = new Set<string>();
    for (const row of schoolsLocaleRes.data || []) {
      if (
        typeof (row as { primary_locale?: string }).primary_locale === 'string'
      ) {
        localeSet.add((row as { primary_locale: string }).primary_locale);
      }
      if (
        typeof (row as { signup_country?: string }).signup_country === 'string'
      ) {
        countrySet.add((row as { signup_country: string }).signup_country);
      }
    }

    const value: PlatformSignal = {
      active_schools: schoolsRes.count ?? 0,
      active_children: childrenRes.count ?? 0,
      active_classrooms: classroomsRes.count ?? 0,
      confirmed_observations: observationsRes.count ?? 0,
      recent_observations_7d: recentObsRes.count ?? 0,
      active_languages: localeSet.size,
      active_countries: countrySet.size,
      generated_at: new Date(now).toISOString(),
    };

    cached = { at: now, value };
    return { ok: true, data: value, from_cache: false };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `platform signal lookup failed: ${e.message}`
          : 'platform signal lookup failed',
      from_cache: false,
    };
  }
}

/** Test/dev — clear the cache. */
export function resetPlatformSignalCache(): void {
  cached = null;
}
