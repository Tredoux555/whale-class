// app/api/montree/super-admin/demo-requests/bulk-reply/route.ts
//
// Bulk "Reply with trial link" — super-admin selects N stale demo leads and
// hits Reply. Server sends the personalised trial-link email via Resend for
// each one, then auto-marks each contact as 'contacted' to stop the drip.
//
// Same email body and tone as the per-row mailto reply (see lib/montree/email.ts
// → sendDemoTrialLinkReply) so a recipient who got the bulk version followed
// by a manual one still gets coherent voice.
//
// Architectural notes:
//   - Super-admin auth gated (verifySuperAdminAuth).
//   - All actions logged to `montree_outreach_log` with action='bulk_reply_trial_link'.
//   - Idempotent on the lead status side — if the lead is already 'contacted' or
//     'not_interested' we SKIP it. Trying to re-send a trial link to someone who
//     already declined is a footgun.
//   - Cap at 100 leads per call to keep the request bounded.
//   - Per-email failures don't block the rest; we return a per-lead outcome list
//     and the client surfaces sent/failed counts.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { sendDemoTrialLinkReply } from '@/lib/montree/email';

const MAX_LEADS_PER_BATCH = 100;

interface BulkReplyRequest {
  lead_ids?: string[];
  /** If true, ignore lead_ids and target every status=demo_requested lead older
   *  than 14 days. Convenience for the "Reply to all stale" header button. */
  all_stale?: boolean;
}

interface LeadRow {
  id: string;
  email: string | null;
  contact_person: string | null;
  org_name: string | null;
  status: string;
  created_at: string;
}

interface Outcome {
  lead_id: string;
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  message_id?: string;
}

export async function POST(req: NextRequest) {
  const { valid } = await verifySuperAdminAuth(req.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: BulkReplyRequest;
  try {
    body = (await req.json()) as BulkReplyRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Resolve target leads — either explicit list or all-stale.
  let leads: LeadRow[] = [];
  if (body.all_stale) {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('montree_outreach_contacts')
      .select('id, email, contact_person, org_name, status, created_at')
      .eq('source', 'landing_page')
      .eq('status', 'demo_requested')
      .lt('created_at', fourteenDaysAgo)
      .order('created_at', { ascending: true })
      .limit(MAX_LEADS_PER_BATCH);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    leads = (data || []) as LeadRow[];
  } else {
    const ids = Array.isArray(body.lead_ids) ? body.lead_ids.filter((x) => typeof x === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'lead_ids or all_stale required' }, { status: 400 });
    }
    if (ids.length > MAX_LEADS_PER_BATCH) {
      return NextResponse.json(
        { error: `Too many leads — cap is ${MAX_LEADS_PER_BATCH} per call.` },
        { status: 400 },
      );
    }
    const { data, error } = await supabase
      .from('montree_outreach_contacts')
      .select('id, email, contact_person, org_name, status, created_at')
      .in('id', ids);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    leads = (data || []) as LeadRow[];
  }

  if (leads.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, skipped: 0, outcomes: [] });
  }

  // Process sequentially to avoid hammering Resend with parallel bursts and
  // to give each lead its own log row with deterministic ordering.
  const outcomes: Outcome[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const lead of leads) {
    // Skip leads not in a contactable state. Re-sending a trial link to someone
    // who already declined is a footgun — better to surface it than ignore it.
    if (lead.status !== 'demo_requested') {
      outcomes.push({
        lead_id: lead.id,
        ok: false,
        skipped: true,
        reason: `status=${lead.status} (only 'demo_requested' is eligible)`,
      });
      skipped++;
      continue;
    }
    if (!lead.email || !lead.email.includes('@')) {
      outcomes.push({
        lead_id: lead.id,
        ok: false,
        skipped: true,
        reason: 'missing or malformed email',
      });
      skipped++;
      continue;
    }

    const result = await sendDemoTrialLinkReply(
      lead.email,
      lead.contact_person,
      lead.org_name || 'your school',
    );

    if (!result.success) {
      outcomes.push({
        lead_id: lead.id,
        ok: false,
        reason: result.error || 'send failed',
      });
      failed++;
      // Log the failure but don't abort the batch — every lead is independent.
      void supabase.from('montree_outreach_log').insert({
        contact_id: lead.id,
        action: 'bulk_reply_trial_link_failed',
        notes: result.error?.slice(0, 500) || 'send failed',
      });
      continue;
    }

    // Send succeeded — mark as contacted + log to outreach_log.
    const { error: updateError } = await supabase
      .from('montree_outreach_contacts')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .eq('id', lead.id);

    if (updateError) {
      // The email went out but we couldn't update the DB — log a warning but
      // still count it as sent. Next drip cron run will see status is still
      // 'demo_requested' and may re-fire, which is a minor footgun. The audit
      // log makes this recoverable.
      console.error(
        `[bulk-reply] lead ${lead.id} email sent (${result.messageId}) but status update failed:`,
        updateError,
      );
    }

    void supabase.from('montree_outreach_log').insert({
      contact_id: lead.id,
      action: 'bulk_reply_trial_link',
      notes: `messageId=${result.messageId || 'unknown'}`,
    });

    outcomes.push({
      lead_id: lead.id,
      ok: true,
      message_id: result.messageId,
    });
    sent++;
  }

  return NextResponse.json(
    {
      sent,
      failed,
      skipped,
      outcomes,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
