// /api/montree/super-admin/demo-request-drip/route.ts
// Daily drip campaign for inbound demo-request leads.
//
// Schedule via Railway cron: 0 10 * * * (10:00 UTC daily, one hour after
// trial-drip to spread API load).
// curl -X POST 'https://montree.xyz/api/montree/super-admin/demo-request-drip' \
//   -H "x-cron-secret: $CRON_SECRET"
//
// Logic:
//   - Pull every montree_outreach_contacts row where source='landing_page'
//     AND status='demo_requested' (stops as soon as Tredoux marks 'contacted')
//   - Compute days_since_request = floor((now - created_at) / day)
//   - On day 3 → send day3 nudge email
//   - On day 7 → send day7 follow-up
//   - On day 14 → send day14 final note
//
// Idempotency: track sends in montree_outreach_log so we don't re-send.
// Action format: 'demo_request_drip_dayN'.
//
// Auth: x-cron-secret only. Super-admin can dry-run via ?dry_run=1.
//
// 🚨 Architectural rule: only fires while status='demo_requested'. The
// moment Tredoux marks the contact 'contacted'/'meeting_booked'/etc., the
// drip stops automatically. This is the canonical "auto-follow-up that
// gives up gracefully" pattern.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { sendDemoRequestDripEmail, type DemoDripDay } from '@/lib/montree/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

interface ContactRow {
  id: string;
  org_name: string | null;
  contact_person: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
}

const DRIP_DAYS: Array<{ day: number; key: DemoDripDay }> = [
  { day: 3, key: 'day3' },
  { day: 7, key: 'day7' },
  { day: 14, key: 'day14' },
];

export async function POST(request: NextRequest) {
  // Auth: cron-secret OR super-admin
  const cronSecret = request.headers.get('x-cron-secret');
  const expected = process.env.CRON_SECRET || '';
  const isCron = cronSecret && expected && cronSecret === expected;
  if (!isCron) {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dry_run') === '1';

  const supabase = getSupabase();

  // 1. Pull pending demo-request leads. Only status='demo_requested' — the
  //    moment Tredoux flips the status to anything else (contacted /
  //    meeting_booked / not_interested), drip stops automatically.
  const { data: contactsRaw, error: contactsErr } = await supabase
    .from('montree_outreach_contacts')
    .select('id, org_name, contact_person, email, status, created_at')
    .eq('source', 'landing_page')
    .eq('status', 'demo_requested');
  if (contactsErr) {
    return NextResponse.json({ error: contactsErr.message }, { status: 500 });
  }
  const contacts = (contactsRaw || []) as ContactRow[];

  // 2. Pull all prior drip sends (idempotency).
  //
  // 🚨 Session 113 V2 Outreach audit HIGH F-5.1 — paginated read. The
  // legacy single SELECT without .range()/.limit() relied on PostgREST's
  // default 1000-row cap. Once the outreach_log accumulates >1000 drip
  // rows (~6-12 months at current cadence), the idempotency check
  // silently truncates and the cron starts re-firing already-sent emails
  // every day. Paginate explicitly until we drain the table.
  const sentKey = new Set<string>();
  const PAGE_SIZE = 1000;
  let offset = 0;
  // Hard ceiling guards against pathological growth — at >100K log rows
  // someone is misusing the table and we should alert rather than scan.
  const MAX_ROWS = 100_000;
  while (offset < MAX_ROWS) {
    const { data: page, error: pageErr } = await supabase
      .from('montree_outreach_log')
      .select('action, metadata, contact_id')
      .in('action', ['demo_request_drip_day3', 'demo_request_drip_day7', 'demo_request_drip_day14'])
      .range(offset, offset + PAGE_SIZE - 1);
    if (pageErr) {
      console.error('[demo-request-drip] page read failed at offset', offset, pageErr);
      break;
    }
    const rows = (page || []) as Array<{
      action: string;
      metadata: Record<string, unknown> | null;
      contact_id: string | null;
    }>;
    for (const row of rows) {
      const cid = row.contact_id || (row.metadata?.contact_id as string | undefined);
      if (typeof cid === 'string') {
        sentKey.add(`${cid}::${row.action}`);
      }
    }
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  if (offset >= MAX_ROWS) {
    console.warn(
      '[demo-request-drip] outreach_log scan hit MAX_ROWS ceiling — idempotency check may be incomplete. Investigate log retention.'
    );
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  interface SendOutcome {
    contact_id: string;
    contact_email: string;
    org_name: string;
    day: DemoDripDay;
    ok: boolean;
    skipped?: 'no_email' | 'already_sent' | 'wrong_day';
    error?: string;
  }
  const outcomes: SendOutcome[] = [];

  for (const c of contacts) {
    if (!c.email) {
      outcomes.push({
        contact_id: c.id,
        contact_email: 'none',
        org_name: c.org_name || c.id,
        day: 'day3',
        ok: false,
        skipped: 'no_email',
      });
      continue;
    }
    const daysSince = Math.floor((now - new Date(c.created_at).getTime()) / dayMs);
    const drip = DRIP_DAYS.find((d) => daysSince === d.day);
    if (!drip) continue;

    const idempKey = `${c.id}::demo_request_drip_${drip.key}`;
    if (sentKey.has(idempKey)) {
      outcomes.push({
        contact_id: c.id,
        contact_email: c.email,
        org_name: c.org_name || c.id,
        day: drip.key,
        ok: false,
        skipped: 'already_sent',
      });
      continue;
    }

    if (dryRun) {
      outcomes.push({
        contact_id: c.id,
        contact_email: c.email,
        org_name: c.org_name || c.id,
        day: drip.key,
        ok: true,
      });
      continue;
    }

    // 🚨 Session 113 V2 Outreach audit MED F-7.4 — INSERT-then-send.
    //
    // The legacy "read priorSends, fire email, log it" pattern raced when
    // two cron triggers fired in the same minute (manual + scheduled, or
    // Railway retry). Both runners saw "not sent yet" and both fired the
    // email — recipients got two day3 emails on the same day.
    //
    // The fix is to INSERT the idempotency-claim row first (the partial
    // UNIQUE on idempotency_key from migration 213 will reject the second
    // runner's insert with 23505), and only fire the email after winning
    // the claim. Failure to claim means another runner is already sending
    // it — skip cleanly.
    const idempotencyKey = `demo_request_drip_${drip.key}::${c.id}`;
    const { error: claimErr } = await supabase
      .from('montree_outreach_log')
      .insert({
        action: `demo_request_drip_${drip.key}`,
        contact_id: c.id,
        notes: `Demo-request drip ${drip.key} claim for ${c.email}`,
        idempotency_key: idempotencyKey,
        metadata: {
          contact_id: c.id,
          day: drip.day,
          days_since_request: daysSince,
          claim_phase: 'pre_send',
        },
      });
    if (claimErr) {
      const code = (claimErr as { code?: string }).code;
      if (code === '23505') {
        // Another runner already claimed this drip. Skip silently.
        outcomes.push({
          contact_id: c.id,
          contact_email: c.email,
          org_name: c.org_name || c.id,
          day: drip.key,
          ok: false,
          skipped: 'already_sent',
        });
        continue;
      }
      // 42703 = idempotency_key column missing → migration 213 not run yet.
      // Fail loudly so the operator notices, rather than re-introducing the
      // race for an indeterminate window.
      console.error(
        '[demo-request-drip] claim insert failed (run migration 213?):',
        claimErr
      );
      outcomes.push({
        contact_id: c.id,
        contact_email: c.email,
        org_name: c.org_name || c.id,
        day: drip.key,
        ok: false,
        error: claimErr.message,
      });
      continue;
    }

    try {
      const recipientName = c.contact_person || c.email.split('@')[0];
      const r = await sendDemoRequestDripEmail(
        c.email,
        recipientName,
        c.org_name || 'your school',
        drip.key,
      );
      if (r.success) {
        outcomes.push({
          contact_id: c.id,
          contact_email: c.email,
          org_name: c.org_name || c.id,
          day: drip.key,
          ok: true,
        });
      } else {
        // Send failed AFTER the claim was inserted. Leave the claim row in
        // place to prevent re-attempts on the next cron run (avoids double-
        // sending if the upstream eventually succeeds asynchronously) and
        // surface the error in the outcome.
        outcomes.push({
          contact_id: c.id,
          contact_email: c.email,
          org_name: c.org_name || c.id,
          day: drip.key,
          ok: false,
          error: r.error,
        });
      }
    } catch (err) {
      outcomes.push({
        contact_id: c.id,
        contact_email: c.email,
        org_name: c.org_name || c.id,
        day: drip.key,
        ok: false,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return NextResponse.json({
    success: true,
    dry_run: dryRun,
    contacts_scanned: contacts.length,
    sends_made: outcomes.filter((o) => o.ok && !o.skipped).length,
    skipped: outcomes.filter((o) => o.skipped).length,
    errors: outcomes.filter((o) => !o.ok && !o.skipped).length,
    outcomes,
  });
}
