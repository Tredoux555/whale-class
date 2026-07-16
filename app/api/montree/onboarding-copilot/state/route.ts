// app/api/montree/onboarding-copilot/state/route.ts
//
// GET — one cheap round-trip that drives the Onboarding Copilot dock:
//   feature-flag gate + CopilotState counts + this user's progress rows.
//
// 🚨 The copilot must NEVER break a page. Every failure path (bad role, flag
//    off, any query error) returns { enabled: false } with a 200 + no-store.
//    The dock renders nothing when enabled is false.
//
// Contract: docs/handoffs/PLAN_ONBOARDING_COPILOT_JUL16.md §3.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import {
  loadCopilotState,
  loadCopilotProgress,
  journeyForRole,
  type CopilotRole,
} from '@/lib/montree/onboarding-copilot/state-loader';

function disabled(): NextResponse {
  const res = NextResponse.json({ enabled: false });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const journey = journeyForRole(auth.role);
    if (!journey) return disabled();

    const supabase = getSupabase();

    const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'onboarding_copilot');
    if (!enabled) return disabled();

    const role = auth.role as CopilotRole;
    const state = await loadCopilotState(supabase, {
      schoolId: auth.schoolId,
      classroomId: auth.classroomId,
      role,
    });
    const progress = await loadCopilotProgress(supabase, {
      userId: auth.userId,
      role,
      journey,
    });

    const res = NextResponse.json({
      enabled: true,
      journey,
      state,
      progress_step_keys: progress.progress_step_keys,
      dismissed: progress.dismissed,
      completed_celebrated: progress.completed_celebrated,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    console.error('[copilot/state] error:', err);
    return disabled();
  }
}
