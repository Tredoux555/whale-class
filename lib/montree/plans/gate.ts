// lib/montree/plans/gate.ts
//
// WP-B — the ONE place a route turns "this school may not do that" into an
// HTTP response. Plan: docs/handoffs/PLAN_PRICING_3TIER_2026-09-07.md §3.
//
// Contract (unchanged from Jul 6, plus one field):
//   402 { requires_upgrade: true, upgrade_url: '/montree/admin/billing',
//         feature: '<capability>', capability: '<capability>', error }
// `feature` is kept for components/montree/UpgradeCard.tsx and the ~8 client
// surfaces that already read it; `capability` is the new, explicit name so the
// card can say which plan unlocks what (WP-C owns the copy keys).
//
// 🚨 Budget exhaustion is NOT an upgrade failure. A Lite school that has spent
// its $8 allowance gets planBudgetExhaustedResponse() — 429, no
// requires_upgrade — so UpgradeCard/GuruChatThread never render "upgrade" at a
// school that already pays for the feature.
//
// Copy here is hardcoded English on purpose (WP-C owns i18n).

import { NextResponse } from 'next/server';
import type { Capability } from './types';
import { hasCapability } from './capabilities';

/** Which plan unlocks each capability — used in the default 402 message. */
const UNLOCKED_BY: Record<Capability, 'Lite' | 'Full'> = {
  guru: 'Lite',
  astra: 'Lite',
  aiReports: 'Lite',
  photoRecognition: 'Full',
  montages: 'Full',
  parentMessaging: 'Full',
  appointments: 'Full',
  videoCalls: 'Full',
  orgOnboarding: 'Full',
  cmsBridge: 'Full',
};

const CAPABILITY_LABEL: Record<Capability, string> = {
  guru: 'Guru',
  astra: 'Astra',
  aiReports: 'AI-written reports',
  photoRecognition: 'Photo recognition',
  montages: 'Montages',
  parentMessaging: 'Parent messaging',
  appointments: 'Appointments',
  videoCalls: 'Video and voice calls',
  orgOnboarding: 'Organisation-wide child onboarding',
  cmsBridge: 'Child evaluation',
};

/** The 402 body every gated route returns. Exported for tests. */
export function planGateBody(cap: Capability, message?: string) {
  return {
    success: false,
    error: message || `${CAPABILITY_LABEL[cap]} comes with ${UNLOCKED_BY[cap]}.`,
    requires_upgrade: true,
    upgrade_url: '/montree/admin/billing',
    feature: cap,
    capability: cap,
  };
}

/** The 402 NextResponse every gated route returns. */
export function planGateResponse(cap: Capability, message?: string): NextResponse {
  return NextResponse.json(planGateBody(cap, message), { status: 402 });
}

/**
 * Gate a route. Returns null when allowed, or the 402 NextResponse to return.
 *
 *   const gate = await requireCapability(supabase, auth.schoolId, 'montages');
 *   if (gate) return gate;
 */
export async function requireCapability(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped service-role client
  supabase: any,
  schoolId: string | null | undefined,
  cap: Capability,
  message?: string
): Promise<NextResponse | null> {
  if (!schoolId) return planGateResponse(cap, message);
  const allowed = await hasCapability(supabase, schoolId, cap);
  return allowed ? null : planGateResponse(cap, message);
}

/**
 * Lite's monthly AI allowance is spent. Deliberately NOT requires_upgrade —
 * the school already pays for the feature; it comes back on the 1st.
 * 429 matches the existing budget-block responses (guru/route.ts et al).
 */
export function planBudgetExhaustedResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Your AI allowance for this month is used up — it resets on the 1st.',
      ai_budget_exhausted: true,
      feature: 'ai_budget',
      capability: 'ai_budget',
    },
    { status: 429 }
  );
}
