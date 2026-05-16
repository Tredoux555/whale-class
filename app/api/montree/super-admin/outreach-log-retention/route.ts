// /api/montree/super-admin/outreach-log-retention/route.ts
//
// Session 113 V2 Outreach audit MED F-7.1 — retention strategy.
//
// The legacy montree_outreach_log table grows unbounded (~500 rows/day at
// current campaign cadence). The HIGH F-5.1 drip-cron pagination fix bought
// time, but the table itself needs a retention strategy or the idempotency
// reads start exceeding the 100K MAX_ROWS scan ceiling at ~6 months.
//
// This route is the canonical periodic-archive trigger. It invokes
// migration 213's archive_old_outreach_log() RPC which atomically moves
// rows older than `cutoff_days` to montree_outreach_log_archive (preserves
// the full audit trail forever) and deletes them from the hot table.
//
// Schedule via Railway cron weekly: 0 4 * * 0 (04:00 UTC every Sunday).
//   curl -X POST 'https://montree.xyz/api/montree/super-admin/outreach-log-retention' \
//     -H "x-cron-secret: $CRON_SECRET"
//
// Auth: x-cron-secret OR super-admin. Super-admin can dry-run via ?dry_run=1
// and pass ?cutoff_days=<N> for one-off cleanup.
//
// 🚨 Architectural rule: archive is the canonical retention strategy.
// NEVER DELETE outreach_log rows directly — the audit trail must persist
// somewhere (compliance, post-mortem investigation, drip-idempotency
// reconstruction). Always go through this RPC.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_CUTOFF_DAYS = 90;
const MIN_CUTOFF_DAYS = 7; // matches the RPC's RAISE guard

export async function POST(request: NextRequest) {
  // Auth: cron-secret OR super-admin (mirror demo-request-drip pattern)
  const cronSecretHeader = (request.headers.get('x-cron-secret') || '').trim();
  const expected = (process.env.CRON_SECRET || '').trim();
  const isCron =
    cronSecretHeader.length > 0 &&
    expected.length > 0 &&
    cronSecretHeader === expected;
  if (!isCron) {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get('dry_run') === '1';
  const cutoffRaw = searchParams.get('cutoff_days');
  let cutoffDays = DEFAULT_CUTOFF_DAYS;
  if (cutoffRaw) {
    const parsed = parseInt(cutoffRaw, 10);
    if (!Number.isFinite(parsed) || parsed < MIN_CUTOFF_DAYS) {
      return NextResponse.json(
        { error: `cutoff_days must be an integer >= ${MIN_CUTOFF_DAYS}` },
        { status: 400 }
      );
    }
    cutoffDays = parsed;
  }

  const supabase = getSupabase();

  try {
    if (dryRun) {
      // Report what WOULD be archived without touching anything.
      const cutoffISO = new Date(
        Date.now() - cutoffDays * 24 * 60 * 60 * 1000
      ).toISOString();
      const { count, error } = await supabase
        .from('montree_outreach_log')
        .select('id', { count: 'exact', head: true })
        .lt('created_at', cutoffISO);
      if (error) throw error;
      return NextResponse.json({
        success: true,
        dry_run: true,
        cutoff_days: cutoffDays,
        cutoff_iso: cutoffISO,
        would_archive: count || 0,
      });
    }

    // Live archive run.
    const { data, error } = await supabase.rpc('archive_old_outreach_log', {
      p_cutoff_days: cutoffDays,
    });
    if (error) {
      // 42883 = function does not exist (migration not yet run)
      const code = (error as { code?: string }).code;
      if (code === '42883') {
        return NextResponse.json(
          {
            error:
              'archive_old_outreach_log RPC not found. Run migration 213 in Supabase first.',
            migration_pending: true,
          },
          { status: 503 }
        );
      }
      throw error;
    }

    const moved = typeof data === 'number' ? data : 0;
    return NextResponse.json({
      success: true,
      dry_run: false,
      cutoff_days: cutoffDays,
      rows_archived: moved,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[outreach-log-retention] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
