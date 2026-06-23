// app/api/montree/super-admin/lyf-coach/overview/route.ts
//
// Super-admin — Lyf Coach OVERVIEW. Aggregate-only signals for the dashboard:
// members + viewers, signups (7/30d), subscription mix + MRR estimate, page
// visits (story_visits), who's online now, coach AI usage this month, and short
// recent-activity lists. BILLING/USAGE METADATA ONLY — never coach conversation
// content (privacy boundary, rule #319). Super-admin auth required.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';

export const dynamic = 'force-dynamic';

const MONTHLY_USD = 14.99;

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const isoMinsAgo = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

// Head-count helper. Any failure (missing table/column, e.g. migrations not run)
// degrades to 0 rather than 500-ing the whole dashboard.
async function safeCount(
  q: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  try {
    const { count, error } = await q;
    return error ? 0 : count ?? 0;
  } catch {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const sevenAgo = isoDaysAgo(7);
  const thirtyAgo = isoDaysAgo(30);
  const onlineSince = isoMinsAgo(10);
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  // Subscription mix — pull statuses and tally server-side.
  let subSummary = { active: 0, trialing: 0, past_due: 0, canceled: 0, other: 0 };
  try {
    const { data, error } = await supabase
      .from('story_admin_users')
      .select('subscription_status')
      .not('subscription_status', 'is', null);
    if (!error) {
      for (const r of (data || []) as Array<{ subscription_status: string | null }>) {
        const s = r.subscription_status || 'other';
        if (s in subSummary) (subSummary as Record<string, number>)[s] += 1;
        else subSummary.other += 1;
      }
    }
  } catch {
    subSummary = { active: 0, trialing: 0, past_due: 0, canceled: 0, other: 0 };
  }
  const estMrrUsd = Math.round(subSummary.active * MONTHLY_USD * 100) / 100;

  // Recent signups (members) — newest first.
  let recentSignups: Array<{ space: string; label: string; status: string | null; created_at: string | null }> = [];
  try {
    const { data } = await supabase
      .from('story_admin_users')
      .select('space, username, subscription_status, created_at')
      .order('created_at', { ascending: false })
      .limit(8);
    recentSignups = ((data || []) as Array<{ space: string; username: string | null; subscription_status: string | null; created_at: string | null }>)
      .map((r) => ({ space: r.space, label: r.username || r.space, status: r.subscription_status, created_at: r.created_at }));
  } catch {
    recentSignups = [];
  }

  // Recent visits — newest first.
  let recentVisits: Array<{ username: string; visited_at: string; duration_seconds: number }> = [];
  try {
    const { data } = await supabase
      .from('story_visits')
      .select('username, visited_at, last_active_at')
      .order('visited_at', { ascending: false })
      .limit(10);
    recentVisits = ((data || []) as Array<{ username: string; visited_at: string; last_active_at: string }>)
      .map((r) => {
        const dur = Math.max(0, Math.floor((new Date(r.last_active_at).getTime() - new Date(r.visited_at).getTime()) / 1000));
        return { username: r.username, visited_at: r.visited_at, duration_seconds: dur };
      });
  } catch {
    recentVisits = [];
  }

  // Coach AI usage this month (sum of sonnet_count across spaces).
  let coachUsageThisMonth = 0;
  try {
    const { data } = await supabase
      .from('story_coach_usage')
      .select('sonnet_count')
      .eq('period_month', month);
    coachUsageThisMonth = ((data || []) as Array<{ sonnet_count: number | null }>)
      .reduce((sum, r) => sum + (r.sonnet_count || 0), 0);
  } catch {
    coachUsageThisMonth = 0;
  }

  const [
    members,
    newMembers7,
    newMembers30,
    viewers,
    newViewers7,
    visitsTotal,
    visits7,
    onlineNow,
  ] = await Promise.all([
    safeCount(supabase.from('story_admin_users').select('*', { count: 'exact', head: true })),
    safeCount(supabase.from('story_admin_users').select('*', { count: 'exact', head: true }).gte('created_at', sevenAgo)),
    safeCount(supabase.from('story_admin_users').select('*', { count: 'exact', head: true }).gte('created_at', thirtyAgo)),
    safeCount(supabase.from('story_users').select('*', { count: 'exact', head: true })),
    safeCount(supabase.from('story_users').select('*', { count: 'exact', head: true }).gte('created_at', sevenAgo)),
    safeCount(supabase.from('story_visits').select('*', { count: 'exact', head: true })),
    safeCount(supabase.from('story_visits').select('*', { count: 'exact', head: true }).gte('visited_at', sevenAgo)),
    safeCount(supabase.from('story_online_sessions').select('*', { count: 'exact', head: true }).eq('is_online', true).gte('last_seen_at', onlineSince)),
  ]);

  return NextResponse.json({
    month,
    members,
    viewers,
    signups: { new_members_7d: newMembers7, new_members_30d: newMembers30, new_viewers_7d: newViewers7 },
    subscriptions: { ...subSummary, est_mrr_usd: estMrrUsd },
    visits: { total: visitsTotal, last_7d: visits7 },
    online_now: onlineNow,
    coach_usage_this_month: coachUsageThisMonth,
    recent_signups: recentSignups,
    recent_visits: recentVisits,
  });
}
