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
import { calculatePayouts, formatPeriod } from '@/lib/montree/payouts/calculator';
import { aggregateApiUsage } from '@/lib/montree/payouts/api-usage-aggregator';

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
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedCronSecret = process.env.CRON_SECRET || '';
    const isCronCall = cronSecret && expectedCronSecret && cronSecret === expectedCronSecret;

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
