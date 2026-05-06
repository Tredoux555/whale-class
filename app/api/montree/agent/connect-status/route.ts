// /api/montree/agent/connect-status/route.ts
//
// Phase 7d — Agent forces a refresh of their Stripe Connect status from
// Stripe (rather than reading the denormalised cache). Useful right after
// the agent finishes onboarding — the webhook may not have arrived yet.
//
// POST: hits Stripe.accounts.retrieve(), summarises, persists, returns.
// 🚨 CRITICAL: agent operates only on their OWN row (auth.userId).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { fetchAccountStatus } from '@/lib/montree/referral/stripe-connect';

export const dynamic = 'force-dynamic';

interface AgentRow {
  id: string;
  is_agent: boolean | null;
  agent_suspended_at: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_completed_at: string | null;
}

export async function POST(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const supabase = getSupabase();

  const { data: agentRaw, error: lookupErr } = await supabase
    .from('montree_teachers')
    .select('id, is_agent, agent_suspended_at, stripe_connect_account_id, stripe_connect_completed_at')
    .eq('id', auth.userId)
    .maybeSingle();

  if (lookupErr) {
    console.error('[agent/connect-status] lookup failed:', lookupErr.message);
    return NextResponse.json({ error: 'Lookup failed', detail: lookupErr.message }, { status: 500 });
  }
  if (!agentRaw) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  const agent = agentRaw as AgentRow;
  if (!agent.is_agent) return NextResponse.json({ error: 'Agent record disabled' }, { status: 403 });
  if (agent.agent_suspended_at) return NextResponse.json({ error: 'Agent suspended' }, { status: 403 });

  if (!agent.stripe_connect_account_id) {
    return NextResponse.json({
      stripe_connect_status: null,
      detail: 'No Stripe Connect account yet. Generate an onboarding link first.',
    });
  }

  let summary;
  try {
    summary = await fetchAccountStatus(agent.stripe_connect_account_id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe API error';
    console.error('[agent/connect-status] Stripe fetch failed:', msg);
    return NextResponse.json({ error: 'Could not refresh status', detail: msg }, { status: 502 });
  }

  // Persist the latest. Preserve completed_at — never overwrite once set
  // (audit trail of when the agent first reached verified).
  const updatePayload: Record<string, unknown> = {
    stripe_connect_status: summary.status,
    stripe_connect_charges_enabled: summary.charges_enabled,
    stripe_connect_payouts_enabled: summary.payouts_enabled,
    stripe_connect_details_submitted: summary.details_submitted,
    stripe_connect_disabled_reason: summary.disabled_reason,
    stripe_connect_updated_at: new Date().toISOString(),
  };
  if (summary.status === 'verified' && !agent.stripe_connect_completed_at) {
    updatePayload.stripe_connect_completed_at = new Date().toISOString();
  }
  const { error: updateErr } = await supabase
    .from('montree_teachers')
    .update(updatePayload)
    .eq('id', agent.id);
  if (updateErr) {
    console.error('[agent/connect-status] persist failed:', updateErr.message);
    // Still return the fresh status — persistence failure is non-fatal.
  }

  return NextResponse.json({
    stripe_connect_account_id: summary.account_id,
    stripe_connect_status: summary.status,
    stripe_connect_charges_enabled: summary.charges_enabled,
    stripe_connect_payouts_enabled: summary.payouts_enabled,
    stripe_connect_details_submitted: summary.details_submitted,
    stripe_connect_disabled_reason: summary.disabled_reason,
  });
}
