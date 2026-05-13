// /api/montree/super-admin/finance/xero-sync-status
//
// Phase C — Health card surface for the Xero sync.
//
// GET: returns last sync time + counts + queue depth.
//
// Returns even when Xero env vars aren't set yet — the response just shows
// "Xero not configured" so the Health card surfaces "set up Xero env vars
// to activate sync."

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { isXeroConfigured } from '@/lib/montree/xero/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const configured = isXeroConfigured();
  const supabase = getSupabase();

  let lastSuccess: string | null = null;
  let successes7d = 0;
  let failures7d = 0;
  let skipped7d = 0;
  let queueDepth = 0;
  let migrationMissing = false;

  // Last successful sync.
  try {
    const { data: lastRaw, error: lastErr } = await supabase
      .from('montree_xero_sync_log')
      .select('synced_at')
      .eq('status', 'success')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastErr && (lastErr as { code?: string }).code === '42P01') {
      migrationMissing = true;
    } else if (lastRaw) {
      lastSuccess = (lastRaw as { synced_at: string }).synced_at;
    }
  } catch {
    // ignore
  }

  if (!migrationMissing) {
    // Last 7d counts.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: counts7d } = await supabase
      .from('montree_xero_sync_log')
      .select('status')
      .gte('synced_at', sevenDaysAgo);
    for (const r of (counts7d as Array<{ status: string }> | null) || []) {
      if (r.status === 'success') successes7d += 1;
      else if (r.status === 'failed') failures7d += 1;
      else if (r.status === 'skipped') skipped7d += 1;
    }

    // Queue depth — finance_tx rows that don't have a successful sync log row.
    // Cheap approximation: count of finance_tx in last 30d minus successes in
    // last 30d. Good enough for the Health card.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: txCount } = await supabase
      .from('montree_finance_transactions')
      .select('id', { count: 'exact', head: true })
      .gte('occurred_at', thirtyDaysAgo);
    const { count: successCount } = await supabase
      .from('montree_xero_sync_log')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'success')
      .gte('synced_at', thirtyDaysAgo);
    queueDepth = Math.max(0, (txCount || 0) - (successCount || 0));
  }

  return NextResponse.json({
    configured,
    migration_missing: migrationMissing,
    last_successful_sync_at: lastSuccess,
    successes_7d: successes7d,
    failures_7d: failures7d,
    skipped_7d: skipped7d,
    queue_depth_approx: queueDepth,
    status: !configured
      ? 'not_configured'
      : migrationMissing
        ? 'migration_pending'
        : failures7d > 0
          ? 'has_failures'
          : queueDepth > 100
            ? 'queue_high'
            : 'ok',
  });
}
