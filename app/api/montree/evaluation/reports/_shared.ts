/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Montree Milestones — shared plumbing for the *reflection report* routes
 * (`/api/montree/evaluation/reports/**`).
 *
 * These routes are aggregate-only leadership surfaces: a principal looking at her own
 * school, and the organisational tier looking across schools. They exist beside the
 * per-child Growth Story and the funder Cohort Report, and they obey the same rules:
 *
 *   • n < 12 in scope                      → no percentage, and it says why
 *   • a child whose own figure is suppressed→ excluded from the mean, counted openly
 *   • a domain below the domain minimum     → band chip only, never a figure
 *   • unassessed milestones                 → always printed, never silently dropped
 *   • the EFL track                         → reported separately, never merged
 *
 * ── Why this file does not use `openRoute()` from route-helpers ──────────────────────
 * `openRoute()` reaches the repo through `montree-bridge.ts`, whose three wiring stubs
 * are being replaced in the same phase as this file. These routes therefore call the
 * repo's real helpers directly — `verifySchoolRequest` (lib/montree/verify-request),
 * `isFeatureEnabled` (lib/montree/features/server, THREE arguments, Supabase client
 * first) and `getSupabase` (lib/supabase-client) — which is exactly what the wired
 * bridge will delegate to. Nothing here has to change when the bridge lands.
 *
 * The pure, dependency-free helpers (`json`, `selectAll`, the migration-pending
 * detection) are imported from route-helpers rather than re-written, so a fix there
 * fixes here too.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest, type VerifiedRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import type { FeatureKey } from '@/lib/montree/features/types';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { FEATURE_KEY } from '@/lib/montree/evaluation/constants';
import { json } from '@/lib/montree/evaluation/route-helpers';
import { DISCONTINUE_BIAS_CAVEAT, DISCONTINUE_LINE_LABEL } from '@/lib/montree/evaluation/scoring';
import type { SessionSummary } from '@/lib/montree/evaluation/types';
import type { SupabaseLike } from '@/lib/montree/evaluation/montree-bridge';

/**
 * `child_evaluation` is a member of the repo's `FeatureKey` union (added Aug 2026 in
 * lib/montree/features/types.ts), and the row exists in `montree_feature_definitions`
 * — migration 314 inserts it — so this is now a plain, cast-free alias.
 */
export const CHILD_EVALUATION_KEY: FeatureKey = FEATURE_KEY;

export const featureOff = () =>
  json(
    {
      available: false,
      reason: 'feature_off',
      message: 'Montree Milestones is not switched on for this school.',
    },
    503,
  );

/** Aggregate leadership views are school-wide, so the school's principal owns them. */
export const notPrincipal = () =>
  json(
    {
      available: false,
      reason: 'not_principal',
      message: 'The school reflection view is for the school\'s principal.',
    },
    403,
  );

export interface SchoolReportContext {
  auth: VerifiedRequest;
  supabase: SupabaseLike;
}

/**
 * Auth + role + flag, in that order, for a principal-scoped report route.
 *
 * Returns either a Response to send straight back, or the context to carry on with.
 * Fails closed on every branch: an auth error, a non-principal role and a flag lookup
 * that blew up all stop the request before a single row is read.
 */
export async function openPrincipalReport(
  request: NextRequest,
): Promise<{ ctx: SchoolReportContext } | { response: Response }> {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return { response: auth };
  if (!auth.schoolId) return { response: json({ error: 'unauthorized' }, 401) };
  if (auth.role !== 'principal') return { response: notPrincipal() };

  const supabase = getSupabase();
  let enabled = false;
  try {
    enabled = await isFeatureEnabled(supabase, auth.schoolId, CHILD_EVALUATION_KEY);
  } catch (error) {
    console.error('[montree-milestones][reports] feature flag lookup failed:', error);
    return { response: featureOff() };
  }
  if (!enabled) return { response: featureOff() };

  return { ctx: { auth, supabase: supabase as unknown as SupabaseLike } };
}

/**
 * The organisational tier.
 *
 * ⚠️ STAND-IN, DELIBERATELY. There is no org role in this codebase: the JWT role enum is
 * `teacher | principal | homeschool_parent | agent`, and super-admin is a separate,
 * platform-wide auth system. Until a real multi-school-but-not-global role exists, the
 * org view is gated on super-admin — the narrowest existing gate that can legitimately
 * see more than one school. When the org role lands, this function is the only thing
 * that changes: swap the check, keep the payload.
 */
export async function openOrgReport(
  request: NextRequest,
): Promise<{ supabase: SupabaseLike } | { response: Response }> {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return { response: json({ error: 'unauthorized' }, 401) };
  return { supabase: getSupabase() as unknown as SupabaseLike };
}

export interface FeatureScope {
  /** True when the catalogue default is ON — every school is in scope except `off`. */
  defaultEnabled: boolean;
  /** Schools with an explicit ON override. */
  on: Set<string>;
  /** Schools with an explicit OFF override. */
  off: Set<string>;
}

/** Resolve the same priority the server-side flag reader uses: override wins, else default. */
export function schoolHasFeature(scope: FeatureScope, schoolId: string): boolean {
  if (scope.on.has(schoolId)) return true;
  if (scope.off.has(schoolId)) return false;
  return scope.defaultEnabled;
}

/** Which schools have opted in. The org view never reports a school that hasn't. */
export async function loadFeatureScope(
  supabase: SupabaseLike,
): Promise<{ scope: FeatureScope | null; error: unknown | null }> {
  const { data: defRow, error: defErr } = await supabase
    .from('montree_feature_definitions')
    .select('default_enabled')
    .eq('feature_key', FEATURE_KEY)
    .maybeSingle();
  if (defErr) return { scope: null, error: defErr };

  const { data: overrides, error: ovErr } = await supabase
    .from('montree_school_features')
    .select('school_id, enabled')
    .eq('feature_key', FEATURE_KEY);
  if (ovErr) return { scope: null, error: ovErr };

  const rows = (overrides ?? []) as Array<{ school_id: string; enabled: boolean }>;
  return {
    scope: {
      defaultEnabled: Boolean((defRow as { default_enabled?: boolean } | null)?.default_enabled),
      on: new Set(rows.filter((r) => r.enabled).map((r) => r.school_id)),
      off: new Set(rows.filter((r) => !r.enabled).map((r) => r.school_id)),
    },
    error: null,
  };
}

/** Round a mean to one decimal, or null. Keeps every route's arithmetic identical. */
export function round1(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

/**
 * FIX A — roll the per-sitting discontinue figures up across a set of sittings.
 *
 * Each sitting's scorer wrote `unassessedByDiscontinue` and `expectedInScope` into its own
 * summary_json with the raw evidence in hand; the aggregate is just a sum, so a leadership
 * view and a child's own report can never disagree about the same sittings. Sittings scored
 * before these fields existed contribute 0 and are counted in `sittingsWithoutDetail`, so a
 * partially-migrated school reads as "we cannot see all of it" rather than "there is none".
 */
export function rollUpDiscontinue(rows: Array<{ summary_json?: unknown }>) {
  let count = 0;
  let expected = 0;
  let flaggedSittings = 0;
  let withoutDetail = 0;
  for (const row of rows) {
    const summary = (row.summary_json ?? {}) as Partial<SessionSummary>;
    if (typeof summary.unassessedByDiscontinue !== 'number') { withoutDetail += 1; continue; }
    count += summary.unassessedByDiscontinue;
    expected += summary.expectedInScope ?? 0;
    if (summary.discontinueBiasFlag === true) flaggedSittings += 1;
  }
  const sharePercent = expected ? Math.round((1000 * count) / expected) / 10 : null;
  const flagged = flaggedSittings > 0;
  return {
    label: DISCONTINUE_LINE_LABEL,
    count,
    expectedInScope: expected,
    sharePercent,
    flaggedSittings,
    flagged,
    sittingsWithoutDetail: withoutDetail,
    caveat: flagged ? DISCONTINUE_BIAS_CAVEAT : null,
  };
}
