// /api/montree/agent/earnings/route.ts
//
// Phase 7d → Phase 5 — Agent earnings. Hybrid mode:
//   - For PAST months: read actuals from montree_agent_payouts (the canonical
//     source of truth — what was paid or pending).
//   - For CURRENT month: show estimate (gross × pct heuristic) AS WELL AS the
//     calculator's latest run if available. Estimates give the agent something
//     to look at mid-month before the calc has run for the period.
//
// Estimate formula (per AGENT_DASHBOARD_PLAN Section 3.6):
//   gross_estimate      = student_count × $7
//   stripe_fee_estimate = gross × 2.9% + $0.30
//   api_costs           = sum(montree_api_usage.cost_usd) for school, current month
//   net_estimate        = gross - stripe_fee_estimate - api_costs
//   agent_share         = max(0, net_estimate × revenue_share_pct / 100)
//
// 🚨 CRITICAL FILTER: every query MUST filter by founding_teacher_id =
// auth.userId (for schools) OR agent_id = auth.userId (for payouts).

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

interface PayoutRow {
  id: string;
  school_id: string;
  period_month: string;
  gross_revenue_usd: number;
  stripe_fee_usd: number;
  anthropic_cost_usd: number;
  openai_cost_usd: number;
  other_direct_cost_usd: number;
  net_usd: number;
  revenue_share_pct: number;
  payout_usd: number;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  stripe_transfer_id: string | null;
  paid_at: string | null;
  calculated_at: string;
}

function formatCurrentMonth(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const supabase = getSupabase();

  // 1. Schools referred by this agent.
  const { data: schoolsRaw, error: schoolsErr } = await supabase
    .from('montree_schools')
    .select('id, name, revenue_share_pct, revenue_share_active')
    .eq('founding_teacher_id', auth.userId);

  if (schoolsErr) {
    console.error('[agent/earnings] schools lookup failed:', schoolsErr.message);
    return NextResponse.json(
      { error: 'Could not load schools', detail: schoolsErr.message },
      { status: 500 }
    );
  }
  const schools = (schoolsRaw || []) as SchoolRow[];
  const schoolIds = schools.map((s) => s.id);

  if (schoolIds.length === 0) {
    return NextResponse.json({
      estimated_this_month_usd: 0,
      paid_to_date_usd: 0,
      pending_usd: 0,
      is_estimate: true,
      per_school: [],
      payouts: [],
      payouts_by_month: [],
    });
  }

  // 2. ACTUALS — every payout row for this agent. Source of truth for past
  // months + the latest calculator run for the current month if any.
  const { data: payoutsRaw } = await supabase
    .from('montree_agent_payouts')
    .select(
      'id, school_id, period_month, gross_revenue_usd, stripe_fee_usd, anthropic_cost_usd, openai_cost_usd, other_direct_cost_usd, net_usd, revenue_share_pct, payout_usd, status, stripe_transfer_id, paid_at, calculated_at'
    )
    .eq('agent_id', auth.userId)
    .order('period_month', { ascending: false });

  const payouts = (payoutsRaw || []) as PayoutRow[];

  // Totals from actuals.
  let paidToDate = 0;
  let pendingTotal = 0;
  for (const p of payouts) {
    const amt = Number(p.payout_usd) || 0;
    if (p.status === 'paid') paidToDate += amt;
    else if (p.status === 'pending') pendingTotal += amt;
  }

  // Per-month aggregation.
  interface PerMonth {
    period_month: string;
    total_usd: number;
    paid_usd: number;
    pending_usd: number;
    cancelled_usd: number;
    failed_usd: number;
    row_count: number;
  }
  const byMonth = new Map<string, PerMonth>();
  for (const p of payouts) {
    const amt = Number(p.payout_usd) || 0;
    const existing = byMonth.get(p.period_month) || {
      period_month: p.period_month,
      total_usd: 0,
      paid_usd: 0,
      pending_usd: 0,
      cancelled_usd: 0,
      failed_usd: 0,
      row_count: 0,
    };
    existing.total_usd += amt;
    if (p.status === 'paid') existing.paid_usd += amt;
    else if (p.status === 'pending') existing.pending_usd += amt;
    else if (p.status === 'cancelled') existing.cancelled_usd += amt;
    else if (p.status === 'failed') existing.failed_usd += amt;
    existing.row_count += 1;
    byMonth.set(p.period_month, existing);
  }

  // 3. ESTIMATE for the CURRENT month (only used if no actual exists yet
  // for this period — i.e., the calculator hasn't run yet this month).
  const currentMonth = formatCurrentMonth();
  const actualThisMonth = payouts.filter((p) => p.period_month === currentMonth);

  // Per-school student counts (only used for estimates).
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

  // Per-school API costs for the current month (estimates only).
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();
  const apiCosts: Record<string, number> = {};
  try {
    const { data: usageRows } = await supabase
      .from('montree_api_usage')
      .select('school_id, cost_usd')
      .in('school_id', schoolIds)
      .gte('created_at', monthStartIso);
    if (usageRows) {
      for (const row of usageRows) {
        const sid = row.school_id as string;
        const cost = Number(row.cost_usd || 0);
        apiCosts[sid] = (apiCosts[sid] || 0) + (Number.isFinite(cost) ? cost : 0);
      }
    }
  } catch {
    // Silently fall through — over-estimate gross is better than failing the endpoint.
  }

  // 4. Compose per-school view. ACTUAL for this month if it exists, else ESTIMATE.
  let estimatedThisMonth = 0;
  const perSchool = schools.map((s) => {
    const actualForMonth = actualThisMonth.find((p) => p.school_id === s.id);
    const studentCount = studentCounts[s.id] || 0;
    const sharePct = Number(s.revenue_share_pct || 0);
    const active = Boolean(s.revenue_share_active);

    if (actualForMonth) {
      // Use the calculator's number.
      return {
        school_id: s.id,
        school_name: s.name,
        student_count: studentCount,
        revenue_share_pct: actualForMonth.revenue_share_pct,
        revenue_share_active: active,
        // Match the legacy field names AND surface the actual.
        gross_estimate_usd: round2(actualForMonth.gross_revenue_usd),
        stripe_fee_estimate_usd: round2(actualForMonth.stripe_fee_usd),
        api_cost_usd: round2(
          actualForMonth.anthropic_cost_usd + actualForMonth.openai_cost_usd + actualForMonth.other_direct_cost_usd
        ),
        net_estimate_usd: round2(actualForMonth.net_usd),
        estimated_share_usd: round2(actualForMonth.payout_usd),
        is_actual: true,
        status: actualForMonth.status,
      };
    }

    // Fall back to estimate.
    const gross = studentCount * SUBSCRIPTION_PER_STUDENT_USD;
    const stripeFee = gross > 0 ? gross * STRIPE_FEE_PCT + STRIPE_FEE_FIXED_USD : 0;
    const apiCost = apiCosts[s.id] || 0;
    const net = gross - stripeFee - apiCost;
    const share = active && net > 0 ? net * (sharePct / 100) : 0;
    estimatedThisMonth += share;
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
      is_actual: false,
      status: null,
    };
  });

  // Add actual amounts from this month's payouts to estimatedThisMonth.
  for (const p of actualThisMonth) {
    estimatedThisMonth += Number(p.payout_usd) || 0;
  }

  return NextResponse.json({
    estimated_this_month_usd: round2(estimatedThisMonth),
    paid_to_date_usd: round2(paidToDate),
    pending_usd: round2(pendingTotal),
    is_estimate: actualThisMonth.length === 0, // pure estimate only if no calc yet this month
    per_school: perSchool,
    payouts: payouts.map((p) => ({
      ...p,
      payout_usd: round2(p.payout_usd),
      net_usd: round2(p.net_usd),
      gross_revenue_usd: round2(p.gross_revenue_usd),
      stripe_fee_usd: round2(p.stripe_fee_usd),
      anthropic_cost_usd: round2(p.anthropic_cost_usd),
      openai_cost_usd: round2(p.openai_cost_usd),
      other_direct_cost_usd: round2(p.other_direct_cost_usd),
      school_name: schools.find((s) => s.id === p.school_id)?.name || null,
    })),
    payouts_by_month: Array.from(byMonth.values()).map((m) => ({
      ...m,
      total_usd: round2(m.total_usd),
      paid_usd: round2(m.paid_usd),
      pending_usd: round2(m.pending_usd),
      cancelled_usd: round2(m.cancelled_usd),
      failed_usd: round2(m.failed_usd),
    })),
    formula_explanation:
      'Past months show actual paid/pending from the payout calculator. Current month shows actual where available, else estimate: (students × $7 − Stripe fee ≈ 2.9% + $0.30 − API costs this month) × your share %.',
  });
}
