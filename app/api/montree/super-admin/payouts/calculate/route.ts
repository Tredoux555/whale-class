// /api/montree/super-admin/payouts/calculate/route.ts
// Phase 5 — super-admin trigger for the payout calculator.
//
// POST body:
//   { period_month: 'YYYY-MM' (default: current month),
//     school_id?: UUID (optional scope),
//     agent_id?: UUID (optional scope),
//     dry_run?: boolean (default: false) }
//
// Returns a CalculatorResult with per-school breakdown.
//
// Auth: super-admin token OR a Bearer token equal to CRON_SECRET (for future
// scheduled jobs). Same pattern as billing/sync-quantity (Session 93).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { calculatePayouts, formatPeriod, monthRange } from '@/lib/montree/payouts/calculator';
import { aggregateApiUsage } from '@/lib/montree/payouts/api-usage-aggregator';
import { sendMonthlyDigestEmail } from '@/lib/montree/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface CalcBody {
  period_month?: string;
  school_id?: string;
  agent_id?: string;
  dry_run?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: super-admin OR cron secret.
    // 🚨 Session 113 V2 Finance audit F-A-1: trim + length-after-trim check
    // defends against a whitespace-only CRON_SECRET env var (which would
    // otherwise let `x-cron-secret: '  '` bypass auth via the &&-chain
    // accepting any truthy non-empty string).
    const cronSecret = (request.headers.get('x-cron-secret') || '').trim();
    const expectedCronSecret = (process.env.CRON_SECRET || '').trim();
    const isCronCall =
      expectedCronSecret.length > 0 &&
      cronSecret.length > 0 &&
      cronSecret === expectedCronSecret;

    if (!isCronCall) {
      const { valid } = await verifySuperAdminAuth(request.headers);
      if (!valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = (await request.json().catch(() => ({}))) as CalcBody;
    const periodMonth = body.period_month || formatPeriod(new Date());

    // Validate period_month shape (calculator throws but we want a friendlier 400)
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) {
      return NextResponse.json(
        { error: `Invalid period_month '${periodMonth}'. Expected YYYY-MM.` },
        { status: 400 }
      );
    }

    // Optional UUID validation
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (body.school_id && !uuidRe.test(body.school_id)) {
      return NextResponse.json({ error: 'school_id is not a valid UUID' }, { status: 400 });
    }
    if (body.agent_id && !uuidRe.test(body.agent_id)) {
      return NextResponse.json({ error: 'agent_id is not a valid UUID' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Step 1 — roll up api_usage into finance_transactions for the period.
    // Without this, anthropic_cost_usd + openai_cost_usd would always read $0
    // and agents would be overpaid. Aggregator is idempotent so safe to
    // re-run.
    const aggResult = await aggregateApiUsage(supabase, periodMonth, body.school_id);

    // Step 2 — calculate payouts from the now-fresh ledger.
    const calcResult = await calculatePayouts(supabase, {
      periodMonth,
      schoolId: body.school_id,
      agentId: body.agent_id,
      dryRun: body.dry_run === true,
    });

    // ── Step 3 — if this is a cron call (x-cron-secret header) AND we have a
    // CRON_DIGEST_EMAIL env var, fire-and-forget a digest email summarising
    // the month. Manual super-admin clicks DON'T send the email (would spam
    // every time Tredoux clicks Calculate now).
    const digestEmail = process.env.CRON_DIGEST_EMAIL || '';
    if (isCronCall && digestEmail) {
      try {
        const range = monthRange(periodMonth);
        // Pull P&L totals from finance_transactions for the period.
        const { data: ledgerRows } = await supabase
          .from('montree_finance_transactions')
          .select('type, usd_amount')
          .gte('occurred_at', range.start)
          .lt('occurred_at', range.end);
        let revenue = 0, directCost = 0, commission = 0, opExpense = 0;
        for (const r of ledgerRows || []) {
          const amt = Number((r as { usd_amount: number }).usd_amount) || 0;
          const t = (r as { type: string }).type;
          if (t === 'income') revenue += amt;
          else if (t === 'direct_cost') directCost += amt;
          else if (t === 'commission') commission += amt;
          else if (t === 'op_expense') opExpense += amt;
        }
        const margin = revenue - directCost - commission - opExpense;

        // Sum the payouts for the month.
        const { data: payoutRows } = await supabase
          .from('montree_agent_payouts')
          .select('payout_usd, status')
          .eq('period_month', periodMonth);
        let pendingTotal = 0, paidTotal = 0;
        for (const p of payoutRows || []) {
          const amt = Number((p as { payout_usd: number }).payout_usd) || 0;
          const status = (p as { status: string }).status;
          if (status === 'pending') pendingTotal += amt;
          else if (status === 'paid') paidTotal += amt;
        }

        sendMonthlyDigestEmail(digestEmail, {
          period_month: periodMonth,
          revenue_usd: revenue,
          direct_cost_usd: directCost,
          commission_usd: commission,
          op_expense_usd: opExpense,
          margin_usd: margin,
          payouts_pending_usd: pendingTotal,
          payouts_paid_usd: paidTotal,
          rows_calculated: calcResult.rows_calculated,
          rows_inserted: calcResult.rows_inserted,
          rows_updated: calcResult.rows_updated,
          errors: calcResult.errors.length,
        }).catch((emailErr) => {
          console.error('[payouts calculate] digest email failed (non-fatal)', emailErr);
        });
      } catch (digestErr) {
        console.error('[payouts calculate] digest prep failed (non-fatal)', digestErr);
      }
    }

    return NextResponse.json({
      success: true,
      api_usage_rollup: aggResult,
      ...calcResult,
    });
  } catch (err) {
    console.error('[payouts/calculate] failed', err);
    const msg = err instanceof Error ? err.message : 'Failed to calculate payouts';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
