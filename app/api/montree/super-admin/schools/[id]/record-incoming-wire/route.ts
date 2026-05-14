// /api/montree/super-admin/schools/[id]/record-incoming-wire/route.ts
//
// Phase C — Record an incoming SWIFT wire from a manual_invoice school.
//
// Inverse mirror of /api/montree/super-admin/payouts/[payoutId]/record-wire
// from Session 109 — but for INBOUND payments from schools rather than
// OUTBOUND payments to agents.
//
// Flow:
//   1. Super-admin opens MoneyTab → finds school on manual_invoice rail
//   2. Bank email arrives confirming wire received in Wallex HK
//   3. Click ⚡ Record incoming wire → inline form
//      (wire_ref, paid_at, currency, fx_rate, usd_amount, notes)
//   4. POST here → writes finance_tx income row, flips subscription_status=active,
//      bumps current_period_end forward 30/365 days, flips AI tier to premium
//
// Idempotency: wire_ref is used as the source_ref on montree_finance_transactions
// (`inbound_wire:<wire_ref>`). Re-recording the same ref returns the existing
// record rather than creating a duplicate income row.
//
// Period lock guard (architectural rule #84): assertPeriodOpen(period_month)
// refuses 409 if the period is closed for books.
//
// Annual cadence (architectural rule #86): writes 12 monthly finance_tx rows
// when school.billing_cadence='annual' (ANNUAL_RECOGNITION_MODE='monthly').
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { assertPeriodOpen, periodMonthOf } from '@/lib/montree/finance/period-lock';
import { loadSchoolBilling, setSchoolAiTier } from '@/lib/montree/billing';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 🚨 Architectural rule #86: 12 monthly rows for annual. Flip to 'single' if
// accountant prefers single-row recognition.
const ANNUAL_RECOGNITION_MODE: 'monthly' | 'single' = 'monthly';

interface WireBody {
  wire_ref?: string;
  paid_at?: string;
  currency_received?: string;
  fx_rate_used?: number | string;
  usd_amount_received?: number | string;
  notes?: string;
}

interface FinanceTxRowMinimal {
  id: string;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: schoolId } = await ctx.params;
    if (!UUID_RE.test(schoolId)) {
      return NextResponse.json({ error: 'school_id is not a valid UUID' }, { status: 400 });
    }

    let body: WireBody = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const wireRef = (body.wire_ref || '').trim();
    if (!wireRef) {
      return NextResponse.json(
        { error: 'wire_ref is required (the SWIFT reference / Wallex transfer ID)' },
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

    const currencyReceived = (body.currency_received || 'USD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currencyReceived)) {
      return NextResponse.json(
        { error: 'currency_received must be a 3-letter ISO 4217 code' },
        { status: 400 }
      );
    }

    const fxRate = body.fx_rate_used !== undefined ? Number(body.fx_rate_used) : 1.0;
    if (Number.isNaN(fxRate) || fxRate <= 0) {
      return NextResponse.json({ error: 'fx_rate_used must be a positive number' }, { status: 400 });
    }

    const usdAmount = body.usd_amount_received !== undefined ? Number(body.usd_amount_received) : NaN;
    if (Number.isNaN(usdAmount) || usdAmount <= 0) {
      return NextResponse.json(
        { error: 'usd_amount_received is required and must be > 0' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // ── 1. Load + validate the school.
    const school = await loadSchoolBilling(supabase, schoolId);
    if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });
    if (school.payment_method !== 'manual_invoice') {
      return NextResponse.json(
        {
          error:
            "This school is not on payment_method='manual_invoice'. Switch them via 💳 Payment config first if you genuinely want to record a manual wire for them.",
          current_method: school.payment_method,
        },
        { status: 409 }
      );
    }

    // 🚨 Architectural rule #84 — period lock guard.
    const periodMonth = periodMonthOf(paidAt);
    const lockErr = await assertPeriodOpen(supabase, periodMonth);
    if (lockErr) return lockErr;

    // ── 2. Idempotency check — has this wire_ref already been recorded?
    const sourceRef = `inbound_wire:${wireRef}`;
    const { data: existingTx } = await supabase
      .from('montree_finance_transactions')
      .select('id')
      .eq('source', 'manual_entry')
      .eq('source_ref', sourceRef)
      .maybeSingle();
    if (existingTx) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          finance_tx_id: (existingTx as FinanceTxRowMinimal).id,
          message: 'This wire reference is already recorded — no new income row inserted.',
        },
        { status: 200 }
      );
    }

    // ── 3. Write the income row(s).
    const cadence: 'monthly' | 'annual' = school.billing_cadence === 'annual' ? 'annual' : 'monthly';
    const writtenTxIds: string[] = [];

    if (cadence === 'annual' && ANNUAL_RECOGNITION_MODE === 'monthly') {
      // 12 monthly rows. usd_amount split evenly. period_month assigned
      // sequentially from paidAt's month forward.
      const perMonth = Number((usdAmount / 12).toFixed(2));
      const remainder = Number((usdAmount - perMonth * 12).toFixed(2));
      const startDate = new Date(paidAt);

      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(
          Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + i, 1)
        );
        const rowUsd = i === 0 ? Number((perMonth + remainder).toFixed(2)) : perMonth;
        const { data: insertedRaw, error: txErr } = await supabase
          .from('montree_finance_transactions')
          .insert({
            occurred_at: monthDate.toISOString(),
            type: 'income',
            category: 'subscription_revenue',
            description: `Manual wire — annual subscription month ${i + 1}/12 — ${school.name || schoolId}`,
            school_id: schoolId,
            original_currency: currencyReceived,
            original_amount: i === 0 ? Number((rowUsd * fxRate).toFixed(2)) : Number((rowUsd * fxRate).toFixed(2)),
            fx_rate: fxRate,
            usd_amount: rowUsd,
            source: 'manual_entry',
            source_ref: `${sourceRef}:annual:${i}`,
            notes: `Inbound SWIFT wire ref ${wireRef}, annual prepayment month ${i + 1}/12${body.notes ? ', ' + String(body.notes).slice(0, 300) : ''}`,
          })
          .select('id')
          .single();
        if (txErr) {
          console.error(`[record-incoming-wire] annual row ${i} insert failed:`, txErr.message);
          // Continue best-effort — partial roll-up is preferred to total failure.
          continue;
        }
        if (insertedRaw) writtenTxIds.push((insertedRaw as FinanceTxRowMinimal).id);
      }
    } else {
      // Single income row — monthly cadence OR annual recognition='single'.
      const description = cadence === 'annual'
        ? `Manual wire — annual subscription prepayment — ${school.name || schoolId}`
        : `Manual wire — monthly subscription — ${school.name || schoolId}`;
      const { data: insertedRaw, error: txErr } = await supabase
        .from('montree_finance_transactions')
        .insert({
          occurred_at: paidAt,
          type: 'income',
          category: cadence === 'annual' ? 'subscription_revenue_annual' : 'subscription_revenue',
          description,
          school_id: schoolId,
          original_currency: currencyReceived,
          original_amount: Number((usdAmount * fxRate).toFixed(2)),
          fx_rate: fxRate,
          usd_amount: usdAmount,
          source: 'manual_entry',
          source_ref: sourceRef,
          notes: `Inbound SWIFT wire ref ${wireRef}${body.notes ? ', ' + String(body.notes).slice(0, 500) : ''}`,
        })
        .select('id')
        .single();
      if (txErr) {
        console.error('[record-incoming-wire] income insert failed:', txErr.message);
        return NextResponse.json(
          { error: 'Could not write income ledger row', detail: txErr.message },
          { status: 500 }
        );
      }
      if (insertedRaw) writtenTxIds.push((insertedRaw as FinanceTxRowMinimal).id);
    }

    // ── 4. Update billing_history. Find latest open invoice by reference (the
    // print URL stores the reference as stripe_invoice_id for manual_invoice
    // rail) and flip to paid. Best-effort — failure here doesn't block.
    await supabase
      .from('montree_billing_history')
      .update({ status: 'paid' })
      .eq('school_id', schoolId)
      .eq('status', 'open')
      .like('stripe_invoice_id', 'MONTREE-%')
      .then(({ error }) => {
        if (error) console.error('[record-incoming-wire] billing_history flip failed:', error.message);
      });

    // ── 5. Bump school state forward.
    const advanceDays = cadence === 'annual' ? 365 : 30;
    // Bump from MAX(current_period_end, now) so we don't shrink the window
    // when recording a wire AFTER current_period_end has already passed.
    const baseMs = Math.max(
      school.current_period_end ? new Date(school.current_period_end).getTime() : 0,
      new Date(paidAt).getTime()
    );
    const newPeriodEnd = new Date(baseMs + advanceDays * 24 * 60 * 60 * 1000).toISOString();

    await supabase
      .from('montree_schools')
      .update({
        subscription_status: 'active',
        current_period_end: newPeriodEnd,
        next_invoice_due_at: newPeriodEnd,
      })
      .eq('id', schoolId);

    // ── 6. AI tier auto-flip — architectural rule #85.
    await setSchoolAiTier(supabase, schoolId, 'premium', 'manual_wire_record');

    // ── 7. Audit log.
    logAudit(supabase, {
      adminIdentifier: 'super_admin',
      action: 'school_inbound_wire_recorded',
      resourceType: 'school',
      resourceId: schoolId,
      resourceDetails: {
        wire_ref: wireRef,
        paid_at: paidAt,
        currency_received: currencyReceived,
        fx_rate: fxRate,
        usd_amount: usdAmount,
        cadence,
        finance_tx_ids: writtenTxIds,
        recognition_rows: writtenTxIds.length,
        period_month: periodMonth,
        new_period_end: newPeriodEnd,
      },
      ipAddress: getClientIP(request.headers),
      userAgent: getUserAgent(request.headers),
      isSensitive: true,
    });

    return NextResponse.json({
      success: true,
      duplicate: false,
      wire_ref: wireRef,
      cadence,
      usd_amount: usdAmount,
      currency_received: currencyReceived,
      fx_rate_used: fxRate,
      paid_at: paidAt,
      finance_tx_ids: writtenTxIds,
      recognition_rows: writtenTxIds.length,
      new_period_end: newPeriodEnd,
    });
  } catch (err) {
    console.error('[record-incoming-wire] unexpected', err);
    const msg = err instanceof Error ? err.message : 'Failed to record wire';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
