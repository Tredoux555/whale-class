// /api/montree/super-admin/finance/recurring/run/route.ts
// Cron-fired: scan recurring op-expense templates, insert finance_tx rows
// for any due-but-not-yet-fired-this-month.
//
// Schedule (Railway cron, daily at 04:00 UTC):
//   curl -X POST 'https://montree.xyz/api/montree/super-admin/finance/recurring/run' \
//     -H "x-cron-secret: $CRON_SECRET"
//
// Logic per template:
//   1. Skip if is_active=false
//   2. Skip if today's day_of_month < template.day_of_month (not yet due)
//   3. Skip if last_fired_period_month === current YYYY-MM (already fired)
//   4. INSERT finance_tx row + UPDATE template.last_fired_period_month
//
// Idempotency: last_fired_period_month is the gate. Daily runs are safe.
//
// Auth: x-cron-secret only (or super-admin for manual ?dry_run=1 trigger).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { isPeriodClosed } from '@/lib/montree/finance/period-lock';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface TemplateRow {
  id: string;
  category: string;
  description: string;
  usd_amount: number;
  day_of_month: number;
  last_fired_period_month: string | null;
  is_active: boolean;
  notes: string | null;
}

function currentPeriodMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  // Auth: cron-secret OR super-admin (for manual dry-run testing).
  // 🚨 Session 113 V2 Finance audit F-A-1: trim + length-after-trim check
  // defends against a whitespace-only CRON_SECRET env var.
  const cronSecret = (request.headers.get('x-cron-secret') || '').trim();
  const expected = (process.env.CRON_SECRET || '').trim();
  const isCron = expected.length > 0 && cronSecret.length > 0 && cronSecret === expected;
  if (!isCron) {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dry_run') === '1';

  try {
    const supabase = getSupabase();
    const period = currentPeriodMonth();
    const todayDay = new Date().getUTCDate();

    // 🚨 Session 113 V2 Finance audit F-P-1 — period lock check.
    // If the current period is closed, skip ALL templates (no recurring
    // op-expense writes go into a closed period). Cron will retry next day
    // (idempotent), so reopening the period before next 04:00 UTC means
    // templates fire correctly. Edge case: closing a period mid-month would
    // skip subsequent recurring fires that month — accountant's call.
    const currentPeriodLocked = await isPeriodClosed(supabase, period);
    if (currentPeriodLocked) {
      return NextResponse.json({
        ok: true,
        period,
        period_locked: true,
        message: `Period ${period} is closed — skipping all recurring op-expense fires for this run.`,
        templates_count: 0,
        outcomes: [],
      });
    }

    const { data: templatesRaw, error: tplErr } = await supabase
      .from('montree_recurring_op_expenses')
      .select('id, category, description, usd_amount, day_of_month, last_fired_period_month, is_active, notes')
      .eq('is_active', true);
    if (tplErr) {
      return NextResponse.json({ error: tplErr.message }, { status: 500 });
    }
    const templates = (templatesRaw || []) as TemplateRow[];

    interface Outcome {
      template_id: string;
      description: string;
      action: 'fired' | 'skipped_not_due' | 'skipped_already_fired' | 'failed';
      reason?: string;
      finance_tx_id?: string;
    }
    const outcomes: Outcome[] = [];

    for (const tpl of templates) {
      if (todayDay < tpl.day_of_month) {
        outcomes.push({ template_id: tpl.id, description: tpl.description, action: 'skipped_not_due' });
        continue;
      }
      if (tpl.last_fired_period_month === period) {
        outcomes.push({ template_id: tpl.id, description: tpl.description, action: 'skipped_already_fired' });
        continue;
      }

      if (dryRun) {
        outcomes.push({ template_id: tpl.id, description: tpl.description, action: 'fired' });
        continue;
      }

      // Build occurred_at: this period's day_of_month at 00:00 UTC.
      const [y, m] = period.split('-').map(Number);
      const occurredAt = new Date(Date.UTC(y, m - 1, tpl.day_of_month, 0, 0, 0)).toISOString();
      const amount = Math.round(Number(tpl.usd_amount) * 10000) / 10000;

      try {
        const { data: fxRow, error: fxErr } = await supabase
          .from('montree_finance_transactions')
          .insert({
            occurred_at: occurredAt,
            type: 'op_expense',
            category: tpl.category,
            description: tpl.description,
            original_currency: 'USD',
            original_amount: amount,
            fx_rate: 1.0,
            usd_amount: amount,
            source: 'manual_entry', // template-driven but logically a manual recurring entry
            source_ref: `recurring:${tpl.id}:${period}`,
            notes: tpl.notes
              ? `${tpl.notes} (recurring template ${tpl.id})`
              : `Recurring template ${tpl.id}`,
          })
          .select('id')
          .single();

        if (fxErr) {
          // 23505 means we already wrote this period via the unique
          // (source, source_ref) index — treat as already-fired.
          if ((fxErr as { code?: string }).code === '23505') {
            // Update the template's last_fired tracking to match reality.
            await supabase
              .from('montree_recurring_op_expenses')
              .update({ last_fired_period_month: period })
              .eq('id', tpl.id);
            outcomes.push({
              template_id: tpl.id,
              description: tpl.description,
              action: 'skipped_already_fired',
              reason: 'finance_tx already exists',
            });
            continue;
          }
          outcomes.push({
            template_id: tpl.id,
            description: tpl.description,
            action: 'failed',
            reason: fxErr.message,
          });
          continue;
        }

        // Stamp the template.
        await supabase
          .from('montree_recurring_op_expenses')
          .update({ last_fired_period_month: period })
          .eq('id', tpl.id);

        outcomes.push({
          template_id: tpl.id,
          description: tpl.description,
          action: 'fired',
          finance_tx_id: (fxRow as { id: string } | null)?.id,
        });
      } catch (err) {
        outcomes.push({
          template_id: tpl.id,
          description: tpl.description,
          action: 'failed',
          reason: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      period_month: period,
      today_day: todayDay,
      templates_scanned: templates.length,
      fired: outcomes.filter((o) => o.action === 'fired').length,
      skipped_not_due: outcomes.filter((o) => o.action === 'skipped_not_due').length,
      skipped_already_fired: outcomes.filter((o) => o.action === 'skipped_already_fired').length,
      failed: outcomes.filter((o) => o.action === 'failed').length,
      outcomes,
    });
  } catch (err) {
    console.error('[recurring run] unexpected', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
