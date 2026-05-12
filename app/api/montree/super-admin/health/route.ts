// /api/montree/super-admin/health/route.ts
// System health snapshot for super-admin. Read-only.
//
// Surfaces:
//   - DB ping latency
//   - Stripe webhook delivery in the last 7 days
//   - AI usage cost in the last 30 days
//   - Web Vitals p75 LCP for the dashboard route (last 7 days)
//   - Recent payout calculator runs
//   - Cron health: last montree_api_usage row written (proxy for activity)
//
// Auth: super-admin only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface HealthStep {
  name: string;
  ok: boolean;
  ms: number;
  detail?: unknown;
}

async function timed<T>(name: string, fn: () => Promise<T>): Promise<{ step: HealthStep; result: T | null }> {
  const t0 = Date.now();
  try {
    const result = await fn();
    return { step: { name, ok: true, ms: Date.now() - t0, detail: result }, result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { step: { name, ok: false, ms: Date.now() - t0, detail: msg }, result: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const steps: HealthStep[] = [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. DB ping
    const dbPing = await timed('db_ping', async () => {
      const { error } = await supabase.from('montree_schools').select('id').limit(1);
      if (error) throw new Error(error.message);
      return 'ok';
    });
    steps.push(dbPing.step);

    // 2. Stripe webhook deliveries last 7d (count of finance_transactions
    // rows with source='stripe_webhook') + DLQ pending count. The DLQ
    // captures any webhook event that threw — if any are pending, the
    // card flips to warn.
    const stripeWebhook = await timed('stripe_webhook_7d', async () => {
      const { count, error } = await supabase
        .from('montree_finance_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'stripe_webhook')
        .gte('created_at', sevenDaysAgo);
      if (error) throw new Error(error.message);

      // DLQ pending count — soft-fail if table missing (pre-migration 200).
      let dlqPending = 0;
      try {
        const { count: dlqCount } = await supabase
          .from('montree_webhook_deadletter')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        dlqPending = dlqCount || 0;
      } catch {
        /* table doesn't exist yet — leave at 0 */
      }

      return {
        rows_last_7d: count || 0,
        dlq_pending: dlqPending,
      };
    });
    steps.push(stripeWebhook.step);

    // 3. AI usage cost last 30d
    const aiCost = await timed('ai_cost_30d', async () => {
      const { data, error } = await supabase
        .from('montree_api_usage')
        .select('cost_usd, created_at, school_id')
        .gte('created_at', thirtyDaysAgo);
      if (error) throw new Error(error.message);
      let total = 0;
      let mostRecent: string | null = null;
      const bySchool = new Set<string>();
      for (const row of data || []) {
        const cost = Number((row as { cost_usd: number }).cost_usd) || 0;
        total += cost;
        const ca = (row as { created_at: string }).created_at;
        if (!mostRecent || ca > mostRecent) mostRecent = ca;
        const sid = (row as { school_id: string | null }).school_id;
        if (sid) bySchool.add(sid);
      }
      return {
        total_usd: Math.round(total * 10000) / 10000,
        rows: data?.length || 0,
        schools_active: bySchool.size,
        most_recent: mostRecent,
      };
    });
    steps.push(aiCost.step);

    // 4. Web Vitals p75 LCP for /montree/dashboard last 7d
    const webVitals = await timed('web_vitals_p75_lcp', async () => {
      const { data, error } = await supabase
        .from('montree_perf_vitals')
        .select('value')
        .eq('metric', 'LCP')
        .eq('route', '/montree/dashboard')
        .gte('reported_at', sevenDaysAgo)
        .order('value', { ascending: true });
      if (error) throw new Error(error.message);
      const rows = (data || []) as Array<{ value: number }>;
      if (!rows.length) return { p75_ms: null, sample_size: 0 };
      const sorted = rows.map((r) => Number(r.value)).filter((n) => Number.isFinite(n));
      const idx = Math.floor(sorted.length * 0.75);
      return { p75_ms: Math.round(sorted[idx]), sample_size: sorted.length };
    });
    steps.push(webVitals.step);

    // 5. Most recent payout calculator runs (proxy = latest calculated_at)
    const payoutRuns = await timed('payout_runs', async () => {
      const { data, error } = await supabase
        .from('montree_agent_payouts')
        .select('period_month, calculated_at, status, payout_usd')
        .order('calculated_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      const rows = (data || []) as Array<{ period_month: string; calculated_at: string; status: string; payout_usd: number }>;
      // Most recent calculated_at overall
      const mostRecent = rows[0]?.calculated_at || null;
      // Group by period_month → count
      const byPeriod = new Map<string, { count: number; total_usd: number; latest_calc: string }>();
      for (const r of rows) {
        const existing = byPeriod.get(r.period_month) || { count: 0, total_usd: 0, latest_calc: r.calculated_at };
        existing.count += 1;
        existing.total_usd += Number(r.payout_usd) || 0;
        if (r.calculated_at > existing.latest_calc) existing.latest_calc = r.calculated_at;
        byPeriod.set(r.period_month, existing);
      }
      return {
        most_recent_calc: mostRecent,
        recent_periods: Array.from(byPeriod.entries())
          .map(([period, v]) => ({
            period_month: period,
            row_count: v.count,
            total_usd: Math.round(v.total_usd * 100) / 100,
            latest_calc: v.latest_calc,
          }))
          .sort((a, b) => b.period_month.localeCompare(a.period_month))
          .slice(0, 6),
      };
    });
    steps.push(payoutRuns.step);

    // 6. Active schools count (current month)
    const schools = await timed('active_schools', async () => {
      const { count, error } = await supabase
        .from('montree_schools')
        .select('id', { count: 'exact', head: true });
      if (error) throw new Error(error.message);
      const { count: trialing } = await supabase
        .from('montree_schools')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_status', 'trialing');
      const { count: active } = await supabase
        .from('montree_schools')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_status', 'active');
      return { total: count || 0, trialing: trialing || 0, active: active || 0 };
    });
    steps.push(schools.step);

    // 7. Demo-request pipeline — pending leads + drip activity last 7d
    const demoRequests = await timed('demo_requests', async () => {
      const { count: pending, error: pErr } = await supabase
        .from('montree_outreach_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'landing_page')
        .eq('status', 'demo_requested');
      if (pErr) throw new Error(pErr.message);

      // Oldest pending request — surfaces stale leads at risk of churn
      const { data: oldestRows } = await supabase
        .from('montree_outreach_contacts')
        .select('created_at, org_name, email')
        .eq('source', 'landing_page')
        .eq('status', 'demo_requested')
        .order('created_at', { ascending: true })
        .limit(1);
      const oldest = (oldestRows && oldestRows[0]) || null;

      // Drip activity last 7d (any of the 3 drip days)
      const { count: dripCount } = await supabase
        .from('montree_outreach_log')
        .select('id', { count: 'exact', head: true })
        .in('action', ['demo_request_drip_day3', 'demo_request_drip_day7', 'demo_request_drip_day14'])
        .gte('created_at', sevenDaysAgo);

      return {
        pending_count: pending || 0,
        drips_sent_7d: dripCount || 0,
        oldest_pending: oldest
          ? {
              created_at: oldest.created_at,
              org_name: oldest.org_name,
              email: oldest.email,
            }
          : null,
      };
    });
    steps.push(demoRequests.step);

    const allOk = steps.every((s) => s.ok);
    return NextResponse.json(
      {
        ok: allOk,
        generated_at: new Date().toISOString(),
        steps,
      },
      { status: allOk ? 200 : 500 }
    );
  } catch (err) {
    console.error('[health] unexpected', err);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
