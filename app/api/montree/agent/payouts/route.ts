// /api/montree/agent/payouts/route.ts
//
// Phase 7d — Agent Stripe Connect status + payout history.
//
// GET — returns the agent's denormalised Stripe Connect status from
//       montree_teachers (Phase 3 columns) + monthly payout history from
//       montree_agent_payouts when Phase 5 ships. For now, payout_history
//       is always [] until that table exists.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

interface AgentRow {
  id: string;
  is_agent: boolean | null;
  agent_suspended_at: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_status: string | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_payouts_enabled: boolean | null;
  stripe_connect_details_submitted: boolean | null;
  stripe_connect_disabled_reason: string | null;
  stripe_connect_completed_at: string | null;
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const supabase = getSupabase();

  const { data: agentRaw, error } = await supabase
    .from('montree_teachers')
    .select('id, is_agent, agent_suspended_at, stripe_connect_account_id, stripe_connect_status, stripe_connect_charges_enabled, stripe_connect_payouts_enabled, stripe_connect_details_submitted, stripe_connect_disabled_reason, stripe_connect_completed_at')
    .eq('id', auth.userId)
    .maybeSingle();

  if (error) {
    console.error('[agent/payouts] lookup failed:', error.message);
    return NextResponse.json({ error: 'Lookup failed', detail: error.message }, { status: 500 });
  }
  if (!agentRaw) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  const agent = agentRaw as AgentRow;

  if (!agent.is_agent) {
    return NextResponse.json({ error: 'Agent record disabled' }, { status: 403 });
  }

  // Phase 5 will populate this — for now empty array.
  let payoutHistory: Array<{
    id: string;
    period_start: string;
    period_end: string;
    school_name: string | null;
    agent_payout_usd: number;
    status: string;
    paid_at: string | null;
  }> = [];

  try {
    const { data: payouts, error: payoutErr } = await supabase
      .from('montree_agent_payouts')
      .select('id, period_start, period_end, school_id, agent_payout_usd, status, paid_at')
      .eq('agent_id', auth.userId) // ← cross-pollination filter
      .order('period_end', { ascending: false })
      .limit(24);
    if (!payoutErr && payouts) {
      // Hydrate school names.
      const sids = Array.from(new Set(payouts.map(p => p.school_id).filter(Boolean)));
      let nameMap: Record<string, string> = {};
      if (sids.length > 0) {
        const { data: schools } = await supabase
          .from('montree_schools')
          .select('id, name')
          .in('id', sids as string[]);
        nameMap = Object.fromEntries((schools || []).map(s => [s.id as string, s.name as string]));
      }
      payoutHistory = payouts.map(p => ({
        id: p.id as string,
        period_start: p.period_start as string,
        period_end: p.period_end as string,
        school_name: p.school_id ? nameMap[p.school_id as string] || null : null,
        agent_payout_usd: Number(p.agent_payout_usd || 0),
        status: (p.status as string) || 'pending',
        paid_at: (p.paid_at as string) || null,
      }));
    }
  } catch {
    // montree_agent_payouts doesn't exist yet (Phase 5) — empty list is correct.
  }

  return NextResponse.json({
    stripe_connect_account_id: agent.stripe_connect_account_id || null,
    stripe_connect_status: (agent.stripe_connect_status as
      | 'pending'
      | 'onboarding'
      | 'verified'
      | 'restricted'
      | 'disabled'
      | null) || null,
    stripe_connect_charges_enabled: Boolean(agent.stripe_connect_charges_enabled),
    stripe_connect_payouts_enabled: Boolean(agent.stripe_connect_payouts_enabled),
    stripe_connect_details_submitted: Boolean(agent.stripe_connect_details_submitted),
    stripe_connect_disabled_reason: agent.stripe_connect_disabled_reason || null,
    stripe_connect_completed_at: agent.stripe_connect_completed_at || null,
    payout_history: payoutHistory,
    payouts_pending_phase5: true,
  });
}
