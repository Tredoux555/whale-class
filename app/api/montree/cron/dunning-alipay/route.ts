// /api/montree/cron/dunning-alipay/route.ts
//
// Phase B — Daily dunning cron for alipay_invoice schools in past_due state.
//
// State machine (locked decision — 14-day grace):
//   day 1 since first failure → reminder email (sendDunningReminderEmail)
//   day 7 since first failure → second reminder
//   day 13 since first failure → final reminder
//   day 14+ since first failure → flip subscription_status='canceled' AND
//                                  setSchoolAiTier(supabase, schoolId, 'free')
//
// "Day N since first failure" is derived from the most recent `failed`-status
// row on montree_billing_history for the school. Failed events stack — we use
// the OLDEST unresolved failure (no `paid` row after it) as the anchor.
//
// Idempotency: each reminder is logged to montree_outreach_log with
// action='dunning_reminder_dayN' + metadata.school_id. The cron skips if a
// matching log row already exists for this run.
//
// Auth: x-cron-secret OR super-admin session.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import {
  getBillingConfig,
  setSchoolAiTier,
  DUNNING_REMINDER_DAYS,
  DUNNING_CANCEL_DAY,
} from '@/lib/montree/billing';
import { sendDunningReminderEmail } from '@/lib/montree/billing/alipay-invoice-email';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

interface DunningOutcome {
  school_id: string;
  school_name: string | null;
  days_overdue: number;
  action: 'reminder_sent' | 'canceled' | 'skipped';
  day_marker?: number;
  reason?: string;
}

interface BillingHistoryRow {
  id: string;
  status: string;
  amount_cents: number;
  invoice_pdf_url: string | null;
  stripe_invoice_id: string | null;
  created_at: string;
}

export async function POST(request: NextRequest) {
  let authed = false;
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;
  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    authed = true;
  }
  if (!authed) {
    const adminAuth = await verifySuperAdminAuth(request.headers);
    if (adminAuth.valid) authed = true;
  }
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cfg = getBillingConfig();
  if (!cfg.configured) {
    return NextResponse.json(
      { error: 'Billing not configured', detail: cfg.reason },
      { status: 503 }
    );
  }

  const supabase = getSupabase();
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dry_run') === '1';

  // Pull all past_due alipay_invoice schools.
  const { data: schools, error: queryErr } = await supabase
    .from('montree_schools')
    .select('id, name, payment_method, subscription_status, billing_email, owner_email')
    .eq('payment_method', 'alipay_invoice')
    .eq('subscription_status', 'past_due');

  if (queryErr) {
    console.error('[cron dunning] query failed:', queryErr.message);
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  const outcomes: DunningOutcome[] = [];
  const nowMs = Date.now();

  for (const school of schools || []) {
    // Find the OLDEST unresolved failed billing_history row. "Unresolved" =
    // no subsequent 'paid' row for the same invoice.
    const { data: historyRaw } = await supabase
      .from('montree_billing_history')
      .select('id, status, amount_cents, invoice_pdf_url, stripe_invoice_id, created_at')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const history = (historyRaw || []) as BillingHistoryRow[];

    // Walk newest → oldest to figure out which invoice is currently unresolved.
    // Group by stripe_invoice_id and pick the most recent status per group.
    const latestStatusByInvoice = new Map<string, BillingHistoryRow>();
    for (const row of history) {
      if (!row.stripe_invoice_id) continue;
      if (!latestStatusByInvoice.has(row.stripe_invoice_id)) {
        latestStatusByInvoice.set(row.stripe_invoice_id, row);
      }
    }
    const unresolvedFailures = Array.from(latestStatusByInvoice.values()).filter(
      (r) => r.status === 'failed'
    );
    if (unresolvedFailures.length === 0) {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        days_overdue: 0,
        action: 'skipped',
        reason: 'No unresolved failures found — past_due may be stale',
      });
      continue;
    }

    // Anchor on the OLDEST unresolved failure (earliest first observation of
    // payment failure for this school).
    const anchor = unresolvedFailures.reduce((a, b) =>
      new Date(a.created_at).getTime() < new Date(b.created_at).getTime() ? a : b
    );
    const anchorMs = new Date(anchor.created_at).getTime();
    const daysOverdue = Math.floor((nowMs - anchorMs) / (24 * 60 * 60 * 1000));

    // Cancel path — day >= 14.
    if (daysOverdue >= DUNNING_CANCEL_DAY) {
      if (dryRun) {
        outcomes.push({
          school_id: school.id,
          school_name: school.name,
          days_overdue: daysOverdue,
          action: 'canceled',
          reason: 'dry-run: would cancel',
        });
        continue;
      }
      await supabase
        .from('montree_schools')
        .update({ subscription_status: 'canceled' })
        .eq('id', school.id);
      await setSchoolAiTier(supabase, school.id, 'free', 'dunning_cron');
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        days_overdue: daysOverdue,
        action: 'canceled',
      });
      continue;
    }

    // Reminder path — day == 1, 7, or 13.
    const dayMarker = (DUNNING_REMINDER_DAYS as readonly number[]).find((d) => d === daysOverdue);
    if (!dayMarker) {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        days_overdue: daysOverdue,
        action: 'skipped',
        reason: `No reminder scheduled for day ${daysOverdue}`,
      });
      continue;
    }

    // Idempotency — has this reminder already fired today/recently?
    const action = `dunning_reminder_day${dayMarker}`;
    const todayStart = new Date(nowMs - 12 * 60 * 60 * 1000).toISOString(); // 12h dedup window
    const { data: existingLog } = await supabase
      .from('montree_outreach_log')
      .select('id')
      .eq('action', action)
      .gte('created_at', todayStart)
      .filter('metadata->school_id', 'eq', school.id)
      .maybeSingle();

    if (existingLog) {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        days_overdue: daysOverdue,
        action: 'skipped',
        day_marker: dayMarker,
        reason: `Reminder already sent in last 12h`,
      });
      continue;
    }

    if (dryRun) {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        days_overdue: daysOverdue,
        action: 'reminder_sent',
        day_marker: dayMarker,
        reason: 'dry-run',
      });
      continue;
    }

    const toEmail = school.billing_email || school.owner_email;
    if (!toEmail) {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        days_overdue: daysOverdue,
        action: 'skipped',
        day_marker: dayMarker,
        reason: 'No billing_email or owner_email on school',
      });
      continue;
    }

    const emailResult = await sendDunningReminderEmail({
      to: toEmail,
      schoolName: school.name || 'your school',
      hostedInvoiceUrl: null, // We don't store hosted URL on billing_history; the school clicks through to the original invoice email
      amountCents: anchor.amount_cents || 0,
      daysOverdue,
      daysUntilCancel: DUNNING_CANCEL_DAY - daysOverdue,
    });

    if (emailResult.success) {
      // Log idempotency row. Soft fail-open if table doesn't exist.
      await supabase
        .from('montree_outreach_log')
        .insert({
          action,
          notes: `Day ${dayMarker} dunning reminder sent to ${toEmail}`,
          metadata: { school_id: school.id, days_overdue: daysOverdue, invoice_id: anchor.stripe_invoice_id },
        })
        .then(({ error }) => {
          if (error) console.error('[cron dunning] log insert failed (non-fatal):', error.message);
        });
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        days_overdue: daysOverdue,
        action: 'reminder_sent',
        day_marker: dayMarker,
      });
    } else {
      outcomes.push({
        school_id: school.id,
        school_name: school.name,
        days_overdue: daysOverdue,
        action: 'skipped',
        day_marker: dayMarker,
        reason: emailResult.error || 'Email send failed',
      });
    }
  }

  const sent = outcomes.filter((o) => o.action === 'reminder_sent').length;
  const canceled = outcomes.filter((o) => o.action === 'canceled').length;
  const skipped = outcomes.filter((o) => o.action === 'skipped').length;

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    reminders_sent: sent,
    schools_canceled: canceled,
    skipped,
    outcomes,
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.searchParams.set('dry_run', '1');
  const newReq = new NextRequest(url, {
    method: 'POST',
    headers: request.headers,
  });
  return POST(newReq);
}
