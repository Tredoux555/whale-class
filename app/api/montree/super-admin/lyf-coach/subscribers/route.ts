// app/api/montree/super-admin/lyf-coach/subscribers/route.ts
//
// Super-admin — Lyf Coach subscriber roster. BILLING METADATA ONLY: space label,
// plan, status, period end, MRR estimate. NEVER coach conversation content
// (privacy boundary, rule #319). Super-admin auth required.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

const MONTHLY_USD = 14.99;

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('story_admin_users')
    .select('space, username, plan, subscription_status, current_period_end')
    .not('subscription_status', 'is', null)
    .order('subscription_status', { ascending: true });

  if (error) {
    // 42703 = columns absent (migration 269 not run) → tell the UI gracefully.
    if (error.code === '42703') {
      return NextResponse.json({ migration_pending: true, subscribers: [], summary: {} });
    }
    console.error('[lyf-coach subscribers]', error);
    return NextResponse.json({ error: 'Failed to load subscribers' }, { status: 500 });
  }

  const rows = (data || []) as Array<{
    space: string; username: string | null; plan: string | null;
    subscription_status: string | null; current_period_end: string | null;
  }>;

  const summary = { active: 0, trialing: 0, past_due: 0, canceled: 0, other: 0 };
  for (const r of rows) {
    const s = r.subscription_status || 'other';
    if (s in summary) (summary as Record<string, number>)[s] += 1;
    else summary.other += 1;
  }
  const estMrrUsd = Math.round(summary.active * MONTHLY_USD * 100) / 100;

  return NextResponse.json({
    subscribers: rows.map((r) => ({
      space: r.space,
      label: r.username || r.space,
      plan: r.plan,
      status: r.subscription_status,
      current_period_end: r.current_period_end,
    })),
    summary,
    est_mrr_usd: estMrrUsd, // active × $14.99 (estimate — annual subs differ)
  });
}
