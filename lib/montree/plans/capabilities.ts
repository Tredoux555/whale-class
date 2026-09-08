// lib/montree/plans/capabilities.ts
//
// THE capability matrix — plan → what the school may do.
// Plan: docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md §0/§2/§3.
//
// 🚨 CONTRACT (do not weaken):
//   - A plan GRANT is the floor. A per-school feature-flag override can only
//     ADD a capability, never remove one. Removal is what plan_override /
//     locked_at are for.
//   - The override must be an EXPLICIT row in montree_school_features with
//     enabled = TRUE. It deliberately does NOT fall back to
//     montree_feature_definitions.default_enabled — several mapped keys ship
//     default ON (e.g. photo_onboarding, child_onboarding), and honouring the
//     definition default would hand every Basic school a Full entitlement.
//     That is the whole reason this does not call isFeatureEnabled().

import type { Capability, Plan } from './types';
import { ALL_CAPABILITIES, PLAN_ECONOMICS } from './types';
import type { FeatureKey } from '@/lib/montree/features/types';
import { loadResolvedPlan } from './resolve-plan';

export interface PlanCapabilities extends Record<Capability, boolean> {
  photoCap: number | null;
  aiBudgetUsd: number;
}

export const PLAN_CAPABILITIES: Record<Plan, PlanCapabilities> = {
  basic: {
    guru: false,
    astra: false,
    aiReports: false,
    photoRecognition: false,
    montages: false,
    parentMessaging: false,
    appointments: false,
    videoCalls: false,
    orgOnboarding: false,
    cmsBridge: false,
    photoCap: PLAN_ECONOMICS.basic.photoCap,
    aiBudgetUsd: PLAN_ECONOMICS.basic.aiBudgetUsd,
  },
  lite: {
    guru: true,
    astra: true,
    aiReports: true,
    photoRecognition: false,
    montages: false,
    parentMessaging: false,
    appointments: false,
    videoCalls: false,
    orgOnboarding: false,
    cmsBridge: false,
    photoCap: PLAN_ECONOMICS.lite.photoCap,
    aiBudgetUsd: PLAN_ECONOMICS.lite.aiBudgetUsd,
  },
  full: {
    guru: true,
    astra: true,
    aiReports: true,
    photoRecognition: true,
    montages: true,
    parentMessaging: true,
    appointments: true,
    videoCalls: true,
    orgOnboarding: true,
    cmsBridge: true,
    photoCap: PLAN_ECONOMICS.full.photoCap,
    aiBudgetUsd: PLAN_ECONOMICS.full.aiBudgetUsd,
  },
};

/**
 * Per-capability feature keys that still work as a per-school ADD-ONLY
 * override (grandfathering — a school hand-granted `appointments` before this
 * shipped keeps appointments even on Basic).
 *
 * 🚨 DEVIATION FROM PLAN §3, deliberate: `photo_pipeline_v2` and
 * `unified_photo_tagger` are listed in the plan under photoRecognition but are
 * BEHAVIOURAL flags (which pipeline / which tagger UI), not entitlements —
 * schools carry explicit rows for them for rollback reasons. Honouring them
 * here would silently grant Full's photo recognition to Basic schools. They
 * are excluded; the entitlement-shaped keys remain.
 */
export const CAPABILITY_FEATURE_KEYS: Record<Capability, readonly FeatureKey[]> = {
  guru: ['guru_advisor'],
  astra: ['voice_astra', 'onboarding_copilot', 'live_copilot'],
  aiReports: ['weekly_admin_docs', 'period_reports', 'work_rhythm', 'home_practice_cards'],
  photoRecognition: ['photo_onboarding', 'paper_scan'],
  // No feature key exists for montages — montage_enabled is a dead column
  // (see lib/montree/montage/enqueue.ts). Plan grant only.
  montages: [],
  parentMessaging: ['parent_messaging'],
  appointments: ['appointments', 'school_events', 'school_calendar'],
  videoCalls: ['agora_video_calls', 'video_recording'],
  orgOnboarding: ['child_onboarding'],
  cmsBridge: ['child_evaluation', 'child_evaluation_g1', 'english_program'],
};

/** Does this plan, on its own, grant the capability? Pure. */
export function planGrants(plan: Plan, cap: Capability): boolean {
  return PLAN_CAPABILITIES[plan][cap] === true;
}

// ── Explicit-override cache ───────────────────────────────────────────────
// Same 30s posture as lib/montree/features/server.ts: overrides change only on
// a super-admin toggle, and hasCapability sits on hot routes.
const OVERRIDE_CACHE_TTL_MS = 30_000;
const overrideCache = new Map<string, { value: boolean; expires: number }>();

/** Drop cached capability overrides for one school, or all of them. */
export function invalidatePlanCache(schoolId?: string): void {
  if (!schoolId) {
    overrideCache.clear();
    return;
  }
  const prefix = `${schoolId}:`;
  for (const key of overrideCache.keys()) {
    if (key.startsWith(prefix)) overrideCache.delete(key);
  }
}

/**
 * Is there an EXPLICIT montree_school_features row (enabled = TRUE) for any of
 * this capability's mapped keys? Fail-closed: any error → false (the plan
 * grant still stands on its own).
 */
async function hasExplicitOverride(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client, matches isFeatureEnabled
  supabase: any,
  schoolId: string,
  cap: Capability
): Promise<boolean> {
  const keys = CAPABILITY_FEATURE_KEYS[cap];
  if (!keys || keys.length === 0) return false;

  const cacheKey = `${schoolId}:${cap}`;
  const cached = overrideCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  try {
    const { data, error } = await supabase
      .from('montree_school_features')
      .select('feature_key')
      .eq('school_id', schoolId)
      .eq('enabled', true)
      .in('feature_key', keys as unknown as string[])
      .limit(1);
    if (error) {
      console.warn(`[plans] capability override lookup failed for ${cap}:`, error.message);
      return false; // do NOT cache errors
    }
    const value = Array.isArray(data) && data.length > 0;
    overrideCache.set(cacheKey, { value, expires: Date.now() + OVERRIDE_CACHE_TTL_MS });
    return value;
  } catch (err) {
    console.warn(`[plans] capability override lookup threw for ${cap}:`, err);
    return false;
  }
}

/**
 * THE gate WP-B calls. True when the school's resolved plan grants the
 * capability, OR a per-school explicit override adds it.
 *
 * Locked schools resolve to Basic (see resolvePlan), so a locked school is
 * denied every plan-granted capability — but an explicit legacy override on a
 * non-AI capability can still pass. Locked schools cannot log in at all
 * (auth/unified 403), so that is invisible in practice.
 */
export async function hasCapability(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client
  supabase: any,
  schoolId: string,
  cap: Capability
): Promise<boolean> {
  const resolved = await loadResolvedPlan(supabase, schoolId);
  if (planGrants(resolved.plan, cap)) return true;
  return hasExplicitOverride(supabase, schoolId, cap);
}

/**
 * Resolve every capability in one pass (one plan read + one features read).
 * For surfaces that need the whole picture — billing status, super-admin.
 */
export async function loadCapabilities(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client
  supabase: any,
  schoolId: string
): Promise<Record<Capability, boolean>> {
  const resolved = await loadResolvedPlan(supabase, schoolId);
  const out = {} as Record<Capability, boolean>;
  for (const cap of ALL_CAPABILITIES) {
    out[cap] = planGrants(resolved.plan, cap)
      ? true
      : await hasExplicitOverride(supabase, schoolId, cap);
  }
  return out;
}
