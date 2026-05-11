// /api/montree/super-admin/payouts/[payoutId]/wire/route.ts
// Stripe Connect wire-out — automate the manual "Mark paid" step.
//
// Flow:
//   1. Validate payout row: status pending|failed, payout_usd > 0
//   2. Validate agent: has stripe_connect_account_id + payouts_enabled
//   3. Call stripe.transfers.create({ destination: connect_acct, amount, currency, metadata })
//   4. UPDATE payout: status=paid, stripe_transfer_id, paid_at, paid_by_method='stripe_connect'
//   5. Write commission row to montree_finance_transactions (audit trail)
//
// All-or-nothing best-effort: if step 3 succeeds but step 4 errors, log loudly
// and surface to caller — the money is moving, the row mark just needs manual
// reconcile. We refuse to retry step 3 silently because that would double-pay.
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { getStripe } from '@/lib/montree/stripe';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PayoutRow {
  id: string;
  agent_id: string;
  school_id: string;
  period_month: string;
  payout_usd: number;
  status: 'pending' | 'paid' | 'cancelled' | 'failed';
  stripe_transfer_id: string | null;
}

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  stripe_connect_account_id: string | null;
  charges_enabled: boolean | null;
  payouts_enabled: boolean | null;
  stripe_connect_status: string | null;
}

interface SchoolRow {
  id: string;
  name: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ payoutId: string }> }
) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payoutId } = await params;
    if (!UUID_RE.test(payoutId)) {
      return NextResponse.json({ error: 'payout_id is not a valid UUID' }, { status: 400 });
    }

    const supabase = getSupabase();

    // ── 1. Load + validate the payout row.
    const { data: payoutRaw } = await supabase
      .from('montree_agent_payouts')
      .select('id, agent_id, school_id, period_month, payout_usd, status, stripe_transfer_id')
      .eq('id', payoutId)
      .maybeSingle();
    const payout = payoutRaw as PayoutRow | null;
    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
    }
    if (payout.status === 'paid') {
      return NextResponse.json(
        {
          error: 'Already paid',
          stripe_transfer_id: payout.stripe_transfer_id,
        },
        { status: 409 }
      );
    }
    if (payout.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot wire a cancelled payout. Recalculate or override first.' },
        { status: 409 }
      );
    }
    const amountUsd = Number(payout.payout_usd) || 0;
    if (amountUsd <= 0) {
      return NextResponse.json(
        { error: 'Payout amount is $0. Nothing to wire.' },
        { status: 400 }
      );
    }

    // ── 2. Load + validate the agent's Stripe Connect status.
    const { data: agentRaw } = await supabase
      .from('montree_teachers')
      .select(
        'id, name, email, stripe_connect_account_id, charges_enabled, payouts_enabled, stripe_connect_status'
      )
      .eq('id', payout.agent_id)
      .maybeSingle();
    const agent = agentRaw as AgentRow | null;
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    if (!agent.stripe_connect_account_id) {
      return NextResponse.json(
        {
          error:
            'Agent has not set up Stripe Connect yet. Send them an onboarding link first.',
        },
        { status: 412 }
      );
    }
    if (!agent.payouts_enabled) {
      return NextResponse.json(
        {
          error:
            'Agent\'s Stripe Connect account is not payout-ready. Status: ' +
            (agent.stripe_connect_status || 'unknown'),
          stripe_connect_status: agent.stripe_connect_status,
        },
        { status: 412 }
      );
    }

    // ── 3. Load school name for the transfer description.
    const { data: schoolRaw } = await supabase
      .from('montree_schools')
      .select('id, name')
      .eq('id', payout.school_id)
      .maybeSingle();
    const school = schoolRaw as SchoolRow | null;

    // ── 4. Call Stripe transfer.
    // 🚨 IDEMPOTENCY KEY is load-bearing. Stripe deduplicates `transfers.create`
    // calls by this key for ~24h. A double-click during the network round-trip
    // would otherwise issue TWO real transfers. The key encodes payout_id +
    // amount_cents so changing the override amount mid-flight cuts a fresh key
    // and isn't a double-pay (different intent → different transfer).
    const stripe = getStripe();
    const amountCents = Math.round(amountUsd * 100);
    const idempotencyKey = `montree_payout_${payout.id}_${amountCents}`;
    let transfer: Stripe.Transfer;
    try {
      transfer = await stripe.transfers.create(
        {
          amount: amountCents,
          currency: 'usd',
          destination: agent.stripe_connect_account_id,
          description: `Montree payout — ${school?.name || payout.school_id} — ${payout.period_month}`,
          transfer_group: `monthly_payouts_${payout.period_month}`,
          metadata: {
            payout_id: payout.id,
            agent_id: payout.agent_id,
            school_id: payout.school_id,
            period_month: payout.period_month,
            source: 'montree_phase5_wireout',
          },
        },
        { idempotencyKey }
      );
    } catch (err) {
      const stripeErr = err as Stripe.errors.StripeError;
      const code = stripeErr.code || stripeErr.type || 'unknown';
      console.error('[payouts wire] Stripe transfer failed', { code, message: stripeErr.message });
      // Mark the payout as failed with a note so super-admin can see what happened
      await supabase
        .from('montree_agent_payouts')
        .update({
          status: 'failed',
          notes: `Stripe transfer failed: ${code} — ${stripeErr.message}`,
        })
        .eq('id', payout.id);
      return NextResponse.json(
        {
          error: `Stripe transfer failed: ${stripeErr.message}`,
          stripe_error_code: code,
        },
        { status: 502 }
      );
    }

    // ── 5. Best-effort UPDATE the payout row.
    const paidAt = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('montree_agent_payouts')
      .update({
        status: 'paid',
        stripe_transfer_id: transfer.id,
        paid_at: paidAt,
        paid_by_method: 'stripe_connect',
        payout_currency: 'USD',
        fx_rate_used: 1.0,
      })
      .eq('id', payout.id);

    if (updErr) {
      // Money moved but row didn't update. This is the disaster scenario.
      // Surface loudly — the super-admin needs to manually mark this row.
      console.error('[payouts wire] CRITICAL: transfer succeeded but row update failed', {
        payout_id: payout.id,
        stripe_transfer_id: transfer.id,
        error: updErr.message,
      });
      return NextResponse.json(
        {
          error: 'Transfer sent but database update failed. Reconcile manually.',
          stripe_transfer_id: transfer.id,
          payout_id: payout.id,
          db_error: updErr.message,
        },
        { status: 500 }
      );
    }

    // ── 6. Write commission row to finance_transactions (best-effort, audit trail).
    // This is fire-and-forget — if it fails, the payout is still correctly marked
    // paid; the ledger entry can be reconciled later. Use the unique constraint
    // on (source, source_ref) to be idempotent if someone retries this somehow.
    const sourceRef = `payout:${payout.id}`;
    const commissionPayload = {
      occurred_at: paidAt,
      type: 'commission' as const,
      category: 'referral_payout',
      description: `Referral payout to ${agent.name || agent.email || agent.id} — ${school?.name || payout.school_id} — ${payout.period_month}`,
      school_id: payout.school_id,
      agent_id: payout.agent_id,
      agent_payout_id: payout.id,
      stripe_transfer_id: transfer.id,
      original_currency: 'USD',
      original_amount: amountUsd,
      fx_rate: 1.0,
      usd_amount: amountUsd,
      source: 'stripe_webhook' as const, // closest existing source enum value
      source_ref: sourceRef,
      notes: `Wired via Stripe Connect transfer ${transfer.id}`,
    };

    const { error: txErr } = await supabase
      .from('montree_finance_transactions')
      .insert(commissionPayload);

    let commissionLogged = !txErr;
    if (txErr && (txErr as { code?: string }).code === '23505') {
      // Already logged — that's fine.
      commissionLogged = true;
    } else if (txErr) {
      console.error('[payouts wire] commission ledger insert failed (non-fatal)', txErr);
    }

    return NextResponse.json({
      success: true,
      stripe_transfer_id: transfer.id,
      amount_usd: amountUsd,
      paid_at: paidAt,
      commission_logged: commissionLogged,
    });
  } catch (err) {
    console.error('[payouts wire] unexpected', err);
    const msg = err instanceof Error ? err.message : 'Failed to wire payout';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
