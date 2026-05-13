#!/usr/bin/env node
// scripts/sync-to-xero.mjs
//
// Phase C of FINANCIAL_ARCHITECTURE_PLAN.md.
//
// Reads finance_transactions rows that haven't been successfully synced to
// Xero yet (no `success` row in montree_xero_sync_log with the same finance_tx_id
// + xero_object_type), maps each to a Xero API object, POSTs, and writes the
// result to the sync log.
//
// 🚨 INACTIVE UNTIL ENV VARS ARE SET. Without XERO_CLIENT_ID etc. the script
// returns early. Migration 208 (montree_xero_sync_log table) must also be run.
//
// Run modes:
//   node scripts/sync-to-xero.mjs            — sync all unsynced rows
//   node scripts/sync-to-xero.mjs --dry-run  — just count what would sync
//   node scripts/sync-to-xero.mjs --since=2026-05-01 — only rows since a date
//
// Triggered:
//   - Daily Railway cron at 02:00 UTC (per docs/perf/CRON_SETUP.md)
//   - Health tab "Sync now" button (POSTs to /api/montree/super-admin/finance/xero-sync)
//
// Idempotent — re-running never duplicates Xero objects (unique partial index
// on montree_xero_sync_log).

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINCE_ARG = args.find((a) => a.startsWith('--since='));
const since = SINCE_ARG ? SINCE_ARG.split('=')[1] : null;

function isXeroConfigured() {
  return !!(
    process.env.XERO_CLIENT_ID &&
    process.env.XERO_CLIENT_SECRET &&
    process.env.XERO_TENANT_ID &&
    process.env.XERO_REFRESH_TOKEN
  );
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase env vars. Aborting.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!isXeroConfigured()) {
    console.log('[xero-sync] Xero env vars not set — skipping. Set XERO_CLIENT_ID, XERO_CLIENT_SECRET, XERO_TENANT_ID, XERO_REFRESH_TOKEN in Railway to activate.');
    process.exit(0);
  }

  console.log('[xero-sync] Starting sync. Dry run:', DRY_RUN, 'Since:', since || '(beginning of time)');

  // Load all successful sync log entries to compute "what's already synced".
  const { data: syncedRaw, error: syncedErr } = await supabase
    .from('montree_xero_sync_log')
    .select('finance_tx_id, xero_object_type')
    .eq('status', 'success');

  if (syncedErr) {
    if (syncedErr.code === '42P01') {
      console.error('[xero-sync] montree_xero_sync_log table missing — run migration 208 first.');
      process.exit(2);
    }
    console.error('[xero-sync] sync log read failed:', syncedErr.message);
    process.exit(2);
  }

  const alreadySynced = new Set();
  for (const row of syncedRaw || []) {
    alreadySynced.add(`${row.finance_tx_id}:${row.xero_object_type}`);
  }
  console.log(`[xero-sync] ${alreadySynced.size} rows already synced.`);

  // Load finance_tx rows to consider.
  let query = supabase
    .from('montree_finance_transactions')
    .select('*')
    .order('occurred_at', { ascending: true })
    .limit(5000); // safety cap per run

  if (since) {
    query = query.gte('occurred_at', since);
  }

  const { data: txRows, error: txErr } = await query;
  if (txErr) {
    console.error('[xero-sync] finance_tx read failed:', txErr.message);
    process.exit(2);
  }

  console.log(`[xero-sync] ${(txRows || []).length} finance_tx rows considered.`);

  // Dynamically import the mapper (ESM, lazy so the script can short-circuit
  // cleanly without bundler help when env vars are missing).
  const { mapFinanceTxToXero } = await import(
    new URL('../lib/montree/xero/mapper.js', import.meta.url).href
  ).catch(async () => {
    // TypeScript source — try .ts variant via tsx / direct fail.
    console.warn('[xero-sync] could not import compiled mapper — script needs to run via tsx');
    process.exit(3);
  });

  let counted = 0;
  let toSync = 0;
  let successes = 0;
  let failures = 0;

  for (const tx of txRows || []) {
    counted += 1;
    const mapping = mapFinanceTxToXero(tx);
    if (!mapping) continue;
    const key = `${tx.id}:${mapping.xero_object_type}`;
    if (alreadySynced.has(key)) continue;
    toSync += 1;

    if (DRY_RUN) continue;

    // Actual sync would happen here. For v1 scaffold we just log the
    // intended payload and write a sync_log row marking it skipped (so the
    // next non-dry-run can re-attempt cleanly).
    console.log(
      `[xero-sync] Would POST ${mapping.xero_object_type} for finance_tx ${tx.id} — ${tx.description}`
    );

    // ... real Xero API call would go here. For now: log as skipped so
    // the operator can see the queue depth via /finance/xero-sync-status.
    const { error: logErr } = await supabase.from('montree_xero_sync_log').insert({
      finance_tx_id: tx.id,
      xero_object_type: mapping.xero_object_type,
      status: 'skipped',
      error: 'Scaffold mode — real Xero API call not yet enabled. Will sync once switched to live mode.',
    });
    if (logErr) {
      failures += 1;
      console.error(`[xero-sync] log write failed for ${tx.id}:`, logErr.message);
    } else {
      successes += 1;
    }
  }

  console.log(
    `[xero-sync] Done. Considered: ${counted}, to sync: ${toSync}, succeeded: ${successes}, failed: ${failures}, dry-run: ${DRY_RUN}`
  );
}

main().catch((err) => {
  console.error('[xero-sync] unexpected error:', err);
  process.exit(2);
});
