// /api/montree/agent/schools/[id]/route.ts
//
// Phase 7d — Per-school detail for the agent. Cross-pollination filter on
// founding_teacher_id. If the agent didn't refer this school, returns 404
// (NOT 403 — same response as truly missing prevents enumeration).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

const SUBSCRIPTION_PER_STUDENT_USD = 7;
const STRIPE_FEE_PCT = 0.029;
const STRIPE_FEE_FIXED_USD = 0.30;

interface SchoolRow {
  id: string;
  name: string | null;
  created_at: string;
  revenue_share_pct: string | number | null;
  revenue_share_active: boolean | null;
  founding_teacher_id: string | null;
  primary_locale: string | null;
  referral_code_id: string | null;
  referral_code_used: string | null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const { id: schoolId } = await ctx.params;
  if (!schoolId || typeof schoolId !== 'string') {
    return NextResponse.json({ error: 'school id required' }, { status: 400 });
  }

  const supabase = getSupabase();

  // 🚨 Session 113 V2 — Defense in depth: verify the JWT subject is still
  // an active, non-suspended agent at the DB layer. Mirrors /agent/snapshot
  // + /agent/me. A token issued before suspension would otherwise pass JWT
  // role check.
  const { data: agentRow } = await supabase
    .from('montree_teachers')
    .select('id, is_agent, agent_suspended_at')
    .eq('id', auth.userId)
    .maybeSingle();
  if (!agentRow || !agentRow.is_agent) {
    return NextResponse.json({ error: 'Forbidden — not an agent' }, { status: 403 });
  }
  if (agentRow.agent_suspended_at) {
    return NextResponse.json({ error: 'Agent suspended' }, { status: 403 });
  }

  // Cross-pollination guard: ONE query that returns the school ONLY if it's
  // owned by this agent.
  const { data: schoolRaw, error: schoolErr } = await supabase
    .from('montree_schools')
    .select('id, name, created_at, revenue_share_pct, revenue_share_active, founding_teacher_id, primary_locale, referral_code_id, referral_code_used')
    .eq('id', schoolId)
    .eq('founding_teacher_id', auth.userId) // ← CRITICAL: cross-pollination filter
    .maybeSingle();

  if (schoolErr) {
    console.error('[agent/schools/[id]] lookup failed:', schoolErr.message);
    return NextResponse.json({ error: 'Lookup failed', detail: schoolErr.message }, { status: 500 });
  }
  if (!schoolRaw) {
    // Either truly missing or owned by another agent. Same response.
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }
  const school = schoolRaw as SchoolRow;

  // Student count (active children).
  const { count: studentCount } = await supabase
    .from('montree_children')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('is_active', true);

  // Classroom count.
  const { count: classroomCount } = await supabase
    .from('montree_classrooms')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId);

  // Current-month API costs.
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  let apiCostThisMonth = 0;
  try {
    const { data: usageRows } = await supabase
      .from('montree_api_usage')
      .select('total_cost_usd')
      .eq('school_id', schoolId)
      .gte('created_at', monthStart.toISOString());
    apiCostThisMonth = (usageRows || []).reduce((acc, r) => {
      const c = Number(r.total_cost_usd || 0);
      return acc + (Number.isFinite(c) ? c : 0);
    }, 0);
  } catch {
    // table or column missing — leave at 0
  }

  const sharePct = Number(school.revenue_share_pct || 0);
  const studentCountNum = studentCount || 0;
  const gross = studentCountNum * SUBSCRIPTION_PER_STUDENT_USD;
  const stripeFee = gross > 0 ? gross * STRIPE_FEE_PCT + STRIPE_FEE_FIXED_USD : 0;
  const net = gross - stripeFee - apiCostThisMonth;
  const active = Boolean(school.revenue_share_active);
  const estimatedShare = active && net > 0 ? net * (sharePct / 100) : 0;

  return NextResponse.json({
    id: school.id,
    name: school.name,
    created_at: school.created_at,
    primary_locale: school.primary_locale,
    revenue_share_pct: sharePct,
    revenue_share_active: active,
    referral_code_used: school.referral_code_used,
    student_count: studentCountNum,
    classroom_count: classroomCount || 0,
    estimate: {
      gross_estimate_usd: round2(gross),
      stripe_fee_estimate_usd: round2(stripeFee),
      api_cost_usd: round2(apiCostThisMonth),
      net_estimate_usd: round2(net),
      estimated_share_usd: round2(estimatedShare),
      is_estimate: true,
    },
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
