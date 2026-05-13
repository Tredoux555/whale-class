// /api/montree/super-admin/payouts/[payoutId]/record-wire/route.ts
//
// Session 109 — Manual wire recording for agents on payout_method='manual_wire'.
//
// Mirrors the Stripe-Connect wire route but no Stripe call — instead the
// super-admin wires externally (Wise / SWIFT / Wallex) and records the result
// here. Flips the payout row to status='paid' with paid_by_method='manual_wire',
// captures the wire reference + FX rate + payout currency, and writes a
// commission row to montree_finance_transactions for audit trail.
//
// Idempotent: wire_ref is used as the source_ref on the finance_transactions
// row, so re-recording the same ref returns the existing record rather than
// creating a duplicate commission.
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { sendPayoutPaidEmail } from '@/lib/montree/email';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';
import { assertPeriodOpen } from '@/lib/montree/finance/period-lock';

export const dynamic = 'force-dynamic';

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
  payout_method: string | null;
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

    let body: {
      wire_ref?: string;
      paid_at?: string;
      payout_currency?: string;
      fx_rate_used?: number | string;
      payout_local_amount?: number | string;
      notes?: string;
    } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const wireRef = (body.wire_ref || '').trim();
    if (!wireRef) {
      return NextResponse.json(
        { error: 'wire_ref is required (e.g. Wise transfer ID or SWIFT reference)' },
        { status: 400 }
      );
    }
    if (wireRef.length > 200) {
      return NextResponse.json({ error: 'wire_ref exceeds 200 chars' }, { status: 400 });
    }

    const paidAt = body.paid_at
      ? new Date(body.paid_at).toISOString()
      : new Date().toISOString();
    if (Number.isNaN(new Date(paidAt).getTime())) {
      return NextResponse.json({ error: 'paid_at is not a valid date' }, { status: 400 });
    }

    const payoutCurrency = (body.payout_currency || 'USD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(payoutCurrency)) {
      return NextResponse.json(
        { error: 'payout_currency must be a 3-letter ISO 4217 code (USD, ZAR, EUR, etc.)' },
        { status: 400 }
      );
    }

    const fxRate = body.fx_rate_used !== undefined ? Number(body.fx_rate_used) : 1.0;
    if (Number.isNaN(fxRate) || fxRate <= 0) {
      return NextResponse.json({ error: 'fx_rate_used must be a positive number' }, { status: 400 });
    }

    const localAmount =
      body.payout_local_amount !== undefined ? Number(body.payout_local_amount) : null;
    if (localAmount !== null && (Number.isNaN(localAmount) || localAmount < 0)) {
      return NextResponse.json(
        { error: 'payout_local_amount must be a non-negative number' },
        { status: 400 }
      );
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
        { error: 'Already paid', existing: { paid_via: 'stripe_or_manual' } },
        { status: 409 }
      );
    }
    if (payout.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot record a wire for a cancelled payout.' },
        { status: 409 }
      );
    }
    const amountUsd = Number(payout.payout_usd) || 0;
    if (amountUsd <= 0) {
      return NextResponse.json(
        { error: 'Payout amount is $0. Nothing to record.' },
        { status: 400 }
      );
    }

    // 🚨 Session 109 — period lock guard. Refuses if the period is closed.
    const lockErr = await assertPeriodOpen(supabase, payout.period_month);
    if (lockErr) return lockErr;

    // ── 2. Load the agent + sanity-check method.
    const { data: agentRaw } = await supabase
      .from('montree_teachers')
      .select('id, name, email, payout_method')
      .eq('id', payout.agent_id)
      .maybeSingle();
    const agent = agentRaw as AgentRow | null;
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    if (agent.payout_method !== 'manual_wire') {
      return NextResponse.json(
        {
          error:
            "This agent is set up for Stripe Connect payouts. Use the ⚡ Wire button to wire via Stripe — or switch them to 'manual_wire' first via the 💸 button if you genuinely want to wire manually.",
        },
        { status: 409 }
      );
    }

    // ── 3. School name for description.
    const { data: schoolRaw } = await supabase
      .from('montree_schools')
      .select('id, name')
      .eq('id', payout.school_id)
      .maybeSingle();
    const school = schoolRaw as SchoolRow | null;

    // ── 4. Idempotency check — has this wire_ref already been recorded?
    // If yes, return the existing record rather than fail or duplicate.
    const sourceRef = `manual_wire:${wireRef}`;
    const { data: existingTx } = await supabase
      .from('montree_finance_transactions')
      .select('id, agent_payout_id')
      .eq('source', 'manual_entry')
      .eq('source_ref', sourceRef)
      .maybeSingle();
    if (existingTx) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          finance_tx_id: (existingTx as { id: string }).id,
          message: 'This wire reference is already recorded — no new payout marked.',
        },
        { status: 200 }
      );
    }

    // ── 5. UPDATE the payout row.
    const { error: updErr } = await supabase
      .from('montree_agent_payouts')
      .update({
        status: 'paid',
        paid_at: paidAt,
        paid_by_method: 'manual_wire',
        stripe_transfer_id: null,
        payout_currency: payoutCurrency,
        fx_rate_used: fxRate,
        notes: body.notes ? String(body.notes).slice(0, 1000) : null,
      })
      .eq('id', payout.id);

    if (updErr) {
      console.error('[record-wire] payout row update failed', updErr);
      return NextResponse.json(
        { error: 'Could not mark payout paid', detail: updErr.message },
        { status: 500 }
      );
    }

    // ── 6. Write the commission ledger row.
    const commissionPayload = {
      occurred_at: paidAt,
      type: 'commission' as const,
      category: 'referral_payout',
      description: `Manual wire to ${agent.name || agent.email || agent.id} — ${school?.name || payout.school_id} — ${payout.period_month} — ref ${wireRef}`,
      school_id: payout.school_id,
      agent_id: payout.agent_id,
      agent_payout_id: payout.id,
      original_currency: payoutCurrency,
      original_amount: localAmount !== null ? localAmount : amountUsd * fxRate,
      fx_rate: fxRate,
      usd_amount: amountUsd,
      source: 'manual_entry' as const,
      source_ref: sourceRef,
      notes: body.notes
        ? `Manual wire ref ${wireRef} — ${String(body.notes).slice(0, 500)}`
        : `Manual wire ref ${wireRef}`,
    };

    const { data: insertedTx, error: txErr } = await supabase
      .from('montree_finance_transactions')
      .insert(commissionPayload)
      .select('id')
      .single();

    if (txErr) {
      // Payout is marked paid but ledger entry failed. Loud log; super-admin can
      // reconcile by re-running this endpoint with the same wire_ref (idempotent).
      console.error('[record-wire] commission ledger insert failed', txErr);
    }

    // ── 7. Audit log
    void logAgentAudit(supabase, {
      agent_id: agent.id,
      agent_display_name: agent.name,
      agent_email: agent.email,
      event_type: 'agent_payout_details_updated', // reusing existing type — payout was paid
      actor_role: 'super_admin',
      details: {
        payout_id: payout.id,
        wire_ref: wireRef,
        amount_usd: amountUsd,
        payout_currency: payoutCurrency,
        fx_rate: fxRate,
        method: 'manual_wire',
      },
    });

    // ── 8. Fire-and-forget email to agent.
    if (agent.email) {
      sendPayoutPaidEmail(
        agent.email,
        agent.name || agent.email.split('@')[0],
        amountUsd,
        school?.name || 'your referred school',
        payout.period_month,
        wireRef
      ).catch((emailErr) => {
        console.error('[record-wire] email send failed (non-fatal)', emailErr);
      });
    }

    return NextResponse.json({
      success: true,
      payout_id: payout.id,
      amount_usd: amountUsd,
      payout_currency: payoutCurrency,
      fx_rate_used: fxRate,
      paid_at: paidAt,
      wire_ref: wireRef,
      finance_tx_id: insertedTx?.id || null,
      agent_email_sent: !!agent.email,
    });
  } catch (err) {
    console.error('[record-wire] unexpected', err);
    const msg = err instanceof Error ? err.message : 'Failed to record wire';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
