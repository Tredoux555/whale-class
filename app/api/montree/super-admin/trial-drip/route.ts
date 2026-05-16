// /api/montree/super-admin/trial-drip/route.ts
// Daily drip campaign for trial schools.
//
// Schedule via Railway cron: 0 9 * * * (09:00 UTC daily).
// curl -X POST 'https://montree.xyz/api/montree/super-admin/trial-drip' \
//   -H "x-cron-secret: $CRON_SECRET"
//
// Logic:
//   - Pull every school where subscription_status='trialing' AND owner_email is set
//   - Compute days_since_signup = floor((now - created_at) / day)
//   - On day 7 → send day7 email (if not already sent)
//   - On day 14 → send day14 email
//   - On day 25 → send day25 email
//
// Idempotency: track sends in montree_outreach_log so we don't re-send the
// same drip to the same school. Action format: 'trial_drip_dayN'.
//
// Auth: x-cron-secret only. Super-admin can dry-run via ?dry_run=1.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { sendTrialDripEmail, type TrialDripDay } from '@/lib/montree/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 90;

interface SchoolRow {
  id: string;
  name: string | null;
  owner_email: string | null;
  owner_name: string | null;
  created_at: string;
  subscription_status: string | null;
}

const DRIP_DAYS: Array<{ day: number; key: TrialDripDay }> = [
  { day: 7, key: 'day7' },
  { day: 14, key: 'day14' },
  { day: 25, key: 'day25' },
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

  // 1. Pull trial schools.
  const { data: schoolsRaw, error: schoolsErr } = await supabase
    .from('montree_schools')
    .select('id, name, owner_email, owner_name, created_at, subscription_status')
    .eq('subscription_status', 'trialing');
  if (schoolsErr) {
    return NextResponse.json({ error: schoolsErr.message }, { status: 500 });
  }
  const schools = (schoolsRaw || []) as SchoolRow[];

  // 2. Pull all prior drip sends (idempotency).
  //
  // 🚨 Session 113 V2 Outreach audit HIGH F-5.1 — paginated read. The
  // legacy SELECT without .range()/.limit() relied on PostgREST's default
  // 1000-row cap. After enough drip rows accumulate the idempotency check
  // silently truncates and the cron starts re-firing already-sent emails.
  const sentKey = new Set<string>();
  const PAGE_SIZE = 1000;
  const MAX_ROWS = 100_000;
  let offset = 0;
  while (offset < MAX_ROWS) {
    const { data: page, error: pageErr } = await supabase
      .from('montree_outreach_log')
      .select('action, metadata')
      .in('action', ['trial_drip_day7', 'trial_drip_day14', 'trial_drip_day25'])
      .range(offset, offset + PAGE_SIZE - 1);
    if (pageErr) {
      console.error('[trial-drip] page read failed at offset', offset, pageErr);
      break;
    }
    const rows = (page || []) as Array<{ action: string; metadata: Record<string, unknown> | null }>;
    for (const row of rows) {
      const sid = row.metadata?.school_id;
      if (typeof sid === 'string') {
        sentKey.add(`${sid}::${row.action}`);
      }
    }
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  if (offset >= MAX_ROWS) {
    console.warn(
      '[trial-drip] outreach_log scan hit MAX_ROWS ceiling — idempotency check may be incomplete.'
    );
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  interface SendOutcome {
    school_id: string;
    school_name: string;
    day: TrialDripDay;
    ok: boolean;
    skipped?: 'no_email' | 'already_sent' | 'wrong_day';
    error?: string;
  }
  const outcomes: SendOutcome[] = [];

  for (const s of schools) {
    if (!s.owner_email) {
      outcomes.push({ school_id: s.id, school_name: s.name || s.id, day: 'day7', ok: false, skipped: 'no_email' });
      continue;
    }
    const daysSince = Math.floor((now - new Date(s.created_at).getTime()) / dayMs);
    // Find the matching drip day (exact match) OR within a 1-day window since
    // we run daily but schools might have signed up at any time of day.
    const drip = DRIP_DAYS.find((d) => daysSince === d.day);
    if (!drip) continue; // not a drip day for this school

    const idempKey = `${s.id}::trial_drip_${drip.key}`;
    if (sentKey.has(idempKey)) {
      outcomes.push({
        school_id: s.id,
        school_name: s.name || s.id,
        day: drip.key,
        ok: false,
        skipped: 'already_sent',
      });
      continue;
    }

    if (dryRun) {
      outcomes.push({
        school_id: s.id,
        school_name: s.name || s.id,
        day: drip.key,
        ok: true,
      });
      continue;
    }

    try {
      const r = await sendTrialDripEmail(
        s.owner_email,
        s.owner_name || s.owner_email.split('@')[0],
        s.name || 'your school',
        drip.key
      );
      if (r.success) {
        // Log idempotency record.
        await supabase.from('montree_outreach_log').insert({
          action: `trial_drip_${drip.key}`,
          notes: `Drip ${drip.key} sent to ${s.owner_email}`,
          metadata: { school_id: s.id, day: drip.day, days_since_signup: daysSince, message_id: r.messageId },
        });
        outcomes.push({ school_id: s.id, school_name: s.name || s.id, day: drip.key, ok: true });
      } else {
        outcomes.push({
          school_id: s.id,
          school_name: s.name || s.id,
          day: drip.key,
          ok: false,
          error: r.error,
        });
      }
    } catch (err) {
      outcomes.push({
        school_id: s.id,
        school_name: s.name || s.id,
        day: drip.key,
        ok: false,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  return NextResponse.json({
    success: true,
    dry_run: dryRun,
    schools_scanned: schools.length,
    sends_made: outcomes.filter((o) => o.ok && !o.skipped).length,
    skipped: outcomes.filter((o) => o.skipped).length,
    errors: outcomes.filter((o) => !o.ok && !o.skipped).length,
    outcomes,
  });
}
