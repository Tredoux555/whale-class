// app/api/montree/onboarding-copilot/progress/route.ts
//
// POST — record a copilot progress event into the EXISTING
// montree_onboarding_progress table (migration 131). No new table.
//
// Allowed step_key shapes ONLY (everything else → 400):
//   __dismissed__            — user hid the guide for good
//   __completed__            — journey completion celebrated
//   skip:<stepId>            — an optional step was skipped
//   celebrated:<stepId>      — a step's done celebration was shown
// where <stepId> is a real step id from getJourney(journey).
//
// Contract: docs/handoffs/PLAN_ONBOARDING_COPILOT_JUL16.md §3.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getJourney, type JourneyId } from '@/lib/montree/onboarding-copilot/journeys';
import { journeyForRole } from '@/lib/montree/onboarding-copilot/state-loader';

function isValidStepKey(journey: JourneyId, stepKey: string): boolean {
  if (stepKey === '__dismissed__' || stepKey === '__completed__') return true;
  const ids = new Set(getJourney(journey).map((s) => s.id));
  if (stepKey.startsWith('skip:')) return ids.has(stepKey.slice('skip:'.length));
  if (stepKey.startsWith('celebrated:')) return ids.has(stepKey.slice('celebrated:'.length));
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Only roles with a journey may write progress. This also keeps user_type
    // within the montree_onboarding_progress CHECK (teacher/principal/
    // homeschool_parent) — an 'agent' would otherwise 500 on the constraint.
    if (!journeyForRole(auth.role)) {
      return NextResponse.json({ error: 'no journey for role' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const journey = body?.journey;
    const stepKey = body?.step_key;

    if (journey !== 'principal' && journey !== 'teacher') {
      return NextResponse.json({ error: 'invalid journey' }, { status: 400 });
    }
    if (typeof stepKey !== 'string' || !isValidStepKey(journey, stepKey)) {
      return NextResponse.json({ error: 'invalid step_key' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('montree_onboarding_progress').upsert(
      {
        user_id: auth.userId,
        user_type: auth.role,
        feature_module: `copilot_${journey}`,
        step_key: stepKey,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,user_type,feature_module,step_key' }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[copilot/progress] error:', err);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }
}
