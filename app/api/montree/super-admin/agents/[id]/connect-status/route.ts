// /api/montree/super-admin/agents/[id]/connect-status/route.ts
//
// Phase 3 — pulls fresh Stripe Connect status for an agent and refreshes
// the denormalised columns in montree_teachers. The webhook keeps these in
// sync passively, but this endpoint lets Tredoux force a refresh from super
// admin while debugging.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { fetchAccountStatus } from '@/lib/montree/referral/stripe-connect';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: agentId } = await ctx.params;
  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agent id required' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: agent, error: lookupErr } = await supabase
    .from('montree_teachers')
    .select('id, stripe_connect_account_id, stripe_connect_completed_at')
    .eq('id', agentId)
    .maybeSingle();

  if (lookupErr) {
    return NextResponse.json({ error: 'Database lookup failed' }, { status: 500 });
  }
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  if (!agent.stripe_connect_account_id) {
    return NextResponse.json({
      ok: true,
      has_account: false,
      status: null,
    });
  }

  let summary;
  try {
    summary = await fetchAccountStatus(agent.stripe_connect_account_id);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Stripe lookup failed';
    return NextResponse.json({ error: 'Stripe lookup failed', detail: msg }, { status: 502 });
  }

  // Persist the fresh state. Stamp completed_at on the FIRST transition to
  // verified — never overwrite an existing timestamp (audit trail). Mirrors
  // the webhook handler's behaviour so polling and webhook stay in sync.
  const completedAt = summary.status === 'verified' && !agent.stripe_connect_completed_at
    ? new Date().toISOString()
    : agent.stripe_connect_completed_at;
  const { error: updateErr } = await supabase
    .from('montree_teachers')
    .update({
      stripe_connect_status: summary.status,
      stripe_connect_charges_enabled: summary.charges_enabled,
      stripe_connect_payouts_enabled: summary.payouts_enabled,
      stripe_connect_details_submitted: summary.details_submitted,
      stripe_connect_disabled_reason: summary.disabled_reason,
      stripe_connect_completed_at: completedAt,
      stripe_connect_updated_at: new Date().toISOString(),
    })
    .eq('id', agent.id);

  if (updateErr) {
    console.error('[connect-status] DB update failed:', updateErr.message);
    // Still return the Stripe-side truth so the UI can show it even if the
    // DB write failed. Surface the warning so it's visible.
    return NextResponse.json({
      ok: true,
      has_account: true,
      ...summary,
      warning: 'Stripe state read OK but DB persist failed: ' + updateErr.message,
    });
  }

  return NextResponse.json({
    ok: true,
    has_account: true,
    ...summary,
  });
}
