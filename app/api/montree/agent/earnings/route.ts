// /api/montree/agent/earnings/route.ts
//
// Phase 7d — Agent earnings. ESTIMATES mode until Phases 4-5 ship.
//
// Estimate formula (per AGENT_DASHBOARD_PLAN Section 3.6):
//   gross_estimate     = student_count × $7  (subscription per student per month)
//   stripe_fee_estimate = gross × 2.9% + $0.30 (rough US card processing)
//   api_costs           = sum(montree_api_usage.total_cost_usd) for school, period
//   net_estimate        = gross - stripe_fee_estimate - api_costs
//   agent_share         = max(0, net_estimate × revenue_share_pct / 100)
//
// When net is negative, agent share is 0 — the architectural rule from
// AGENT_DASHBOARD_PLAN (no clawback, but no negative payouts either).
//
// 🚨 CRITICAL FILTER: every query MUST filter by founding_teacher_id =
// auth.userId.

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
  revenue_share_pct: string | number | null;
  revenue_share_active: boolean | null;
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const supabase = getSupabase();

  // 1. Load all schools referred by this agent. Cross-pollination filter:
  // founding_teacher_id = auth.userId.
  const { data: schoolsRaw, error: schoolsErr } = await supabase
    .from('montree_schools')
    .select('id, name, revenue_share_pct, revenue_share_active')
    .eq('founding_teacher_id', auth.userId);

  if (schoolsErr) {
    console.error('[agent/earnings] schools lookup failed:', schoolsErr.message);
    return NextResponse.json({ error: 'Could not load schools', detail: schoolsErr.message }, { status: 500 });
  }
  const schools = (schoolsRaw || []) as SchoolRow[];
  const schoolIds = schools.map(s => s.id);

  if (schoolIds.length === 0) {
    return NextResponse.json({
      estimated_this_month_usd: 0,
      paid_to_date_usd: 0,
      is_estimate: true,
      per_school: [],
    });
  }

  // 2. Per-school student counts (active children only).
  const { data: childrenRows } = await supabase
    .from('montree_children')
    .select('school_id')
    .in('school_id', schoolIds)
    .eq('is_active', true);
  const studentCounts: Record<string, number> = {};
  for (const row of childrenRows || []) {
    const sid = row.school_id as string;
    studentCounts[sid] = (studentCounts[sid] || 0) + 1;
  }

  // 3. Per-school API costs for the current month.
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  // Try the wide select. If montree_api_usage doesn't have school_id +
  // total_cost_usd, fall back to zero costs.
  const apiCosts: Record<string, number> = {};
  try {
    const { data: usageRows, error: usageErr } = await supabase
      .from('montree_api_usage')
      .select('school_id, total_cost_usd')
      .in('school_id', schoolIds)
      .gte('created_at', monthStartIso);
    if (!usageErr && usageRows) {
      for (const row of usageRows) {
        const sid = row.school_id as string;
        const cost = Number(row.total_cost_usd || 0);
        apiCosts[sid] = (apiCosts[sid] || 0) + (Number.isFinite(cost) ? cost : 0);
      }
    }
  } catch {
    // Silently fall through to zero costs — better to over-estimate gross
    // than fail the whole endpoint.
  }

  // 4. Compute per-school estimates.
  const perSchool = schools.map(s => {
    const studentCount = studentCounts[s.id] || 0;
    const sharePct = Number(s.revenue_share_pct || 0);
    const active = Boolean(s.revenue_share_active);
    const gross = studentCount * SUBSCRIPTION_PER_STUDENT_USD;
    const stripeFee = gross > 0 ? gross * STRIPE_FEE_PCT + STRIPE_FEE_FIXED_USD : 0;
    const apiCost = apiCosts[s.id] || 0;
    const net = gross - stripeFee - apiCost;
    const share = active && net > 0 ? net * (sharePct / 100) : 0;
    return {
      school_id: s.id,
      school_name: s.name,
      student_count: studentCount,
      revenue_share_pct: sharePct,
      revenue_share_active: active,
      gross_estimate_usd: round2(gross),
      stripe_fee_estimate_usd: round2(stripeFee),
      api_cost_usd: round2(apiCost),
      net_estimate_usd: round2(net),
      estimated_share_usd: round2(share),
    };
  });

  const estimatedThisMonth = perSchool.reduce((acc, p) => acc + p.estimated_share_usd, 0);

  // 5. Paid to date — placeholder 0 until Phase 5 montree_agent_payouts ships.
  // When that lands, replace with sum(montree_agent_payouts.agent_payout_usd
  // WHERE agent_id = auth.userId AND status = 'paid').
  const paidToDate = 0;

  return NextResponse.json({
    estimated_this_month_usd: round2(estimatedThisMonth),
    paid_to_date_usd: paidToDate,
    is_estimate: true,
    per_school: perSchool,
    formula_explanation: 'Estimated = (students × $7 − Stripe fee ≈ 2.9% + $0.30 − API costs this month) × your share %',
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
