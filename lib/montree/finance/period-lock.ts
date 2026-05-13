// lib/montree/finance/period-lock.ts
//
// Phase B3 — Period locking helpers for finance mutations.
//
// Usage in any route that mutates montree_finance_transactions or
// montree_agent_payouts:
//
//   import { assertPeriodOpen } from '@/lib/montree/finance/period-lock';
//   const lockErr = await assertPeriodOpen(supabase, period_month);
//   if (lockErr) return lockErr;
//
// `assertPeriodOpen` returns a NextResponse (409) if the period is closed,
// or null if it's open. Callers MUST return the response verbatim if non-null.
//
// `isPeriodClosed` is the underlying boolean check; useful for UI rendering
// or read-only flows.

import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PeriodLockRow {
  period_month: string;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
}

/**
 * Returns true if the given YYYY-MM period is currently closed (has a row
 * in montree_period_locks with closed_at IS NOT NULL).
 *
 * Migration-not-yet-run is treated as "everything open" — graceful degrade.
 */
export async function isPeriodClosed(
  supabase: SupabaseClient,
  periodMonth: string
): Promise<boolean> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) {
    return false; // invalid format → not closed (the caller's validation will catch this)
  }
  try {
    const { data, error } = await supabase
      .from('montree_period_locks')
      .select('closed_at')
      .eq('period_month', periodMonth)
      .maybeSingle();

    if (error) {
      // 42P01 = table doesn't exist (migration not yet run). Fail-open.
      if ((error as { code?: string }).code === '42P01') return false;
      // Anything else — log + fail-open. Better to let mutations through than
      // block everything on a metadata-query glitch.
      console.error('[period-lock] isPeriodClosed lookup error', error);
      return false;
    }
    return !!(data && (data as { closed_at: string | null }).closed_at);
  } catch (e) {
    console.error('[period-lock] unexpected', e);
    return false;
  }
}

/**
 * Guard for any mutation route. If the period is closed, returns a 409
 * NextResponse the caller must return verbatim. Otherwise returns null and
 * the caller proceeds.
 */
export async function assertPeriodOpen(
  supabase: SupabaseClient,
  periodMonth: string
): Promise<NextResponse | null> {
  const closed = await isPeriodClosed(supabase, periodMonth);
  if (!closed) return null;
  return NextResponse.json(
    {
      error: `Period ${periodMonth} is closed.`,
      detail:
        'This financial period has been closed for audit. Reopen it via super-admin Money tab → period locks before making changes, OR record the correction in the open current period.',
      period_locked: true,
    },
    { status: 409 }
  );
}

/**
 * List all period locks (for super-admin UI).
 * Returns rows sorted newest first.
 */
export async function listPeriodLocks(supabase: SupabaseClient): Promise<PeriodLockRow[]> {
  const { data, error } = await supabase
    .from('montree_period_locks')
    .select('period_month, closed_at, closed_by, notes')
    .order('period_month', { ascending: false });
  if (error) {
    if ((error as { code?: string }).code === '42P01') return [];
    console.error('[period-lock] listPeriodLocks failed', error);
    return [];
  }
  return (data as PeriodLockRow[]) || [];
}

/**
 * Derive the "period_month" from a timestamp. Used by routes that know the
 * occurred_at but not the explicit period.
 */
export function periodMonthOf(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
