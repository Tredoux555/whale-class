// app/api/montree/super-admin/dark-phonics/route.ts
//
// The Dark Phonics funnel, last 30 days, in one JSON answer.
//
// Super-admin only, via the existing verifySuperAdminAuth (the
// x-super-admin-token / x-super-admin-password headers every other super-admin
// route already uses). There is no per-person data here beyond the lead list
// the owner typed into a form himself, and the event rows are keyed on an
// anonymous browser id — but it is still business data, and business data is
// behind the same door as the rest.
//
// Pre-migration it answers 200 with empty series and `ready:false`, so the page
// renders its own calm "not set up yet" rather than an error.

import { NextResponse, type NextRequest } from 'next/server';

import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { getSupabase } from '@/lib/supabase-client';
import { DP_EVENTS } from '@/lib/montree/dark-phonics/events';

export const dynamic = 'force-dynamic';

const DAYS = 30;

interface EventRow {
  aid: string | null;
  event: string;
  lesson: number | null;
  utm: { source?: string | null } | null;
  created_at: string;
}

function isMissing(code?: string): boolean {
  return code === '42P01' || code === 'PGRST205';
}

export async function GET(request: NextRequest) {
  const auth = await verifySuperAdminAuth(request.headers);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();
  const supabase = getSupabase();

  const [eventsRes, leadsRes] = await Promise.all([
    supabase
      .from('montree_dp_events')
      .select('aid, event, lesson, utm, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(50000),
    supabase
      .from('montree_dp_leads')
      .select('email, role, utm, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (eventsRes.error && isMissing(eventsRes.error.code)) {
    return NextResponse.json({ ready: false, days: DAYS, daily: [], totals: {}, topLessons: [], bySource: [], leads: [] });
  }
  if (eventsRes.error) {
    console.error('[dp/super-admin] events query failed:', eventsRes.error.message);
    return NextResponse.json({ error: 'Query failed.' }, { status: 500 });
  }

  const rows = (eventsRes.data ?? []) as unknown as EventRow[];

  // ── Daily hub views + unique browsers ─────────────────────────────────────
  const byDay = new Map<string, { views: number; aids: Set<string> }>();
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    let cell = byDay.get(day);
    if (!cell) {
      cell = { views: 0, aids: new Set() };
      byDay.set(day, cell);
    }
    if (r.event === 'hub_view') cell.views++;
    if (r.aid) cell.aids.add(r.aid);
  }
  const daily = Array.from(byDay.entries())
    .map(([day, c]) => ({ day, views: c.views, uniques: c.aids.size }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  // ── The funnel ────────────────────────────────────────────────────────────
  const totals: Record<string, number> = {};
  for (const name of DP_EVENTS) totals[name] = 0;
  for (const r of rows) if (r.event in totals) totals[r.event]++;
  totals.unique_browsers = new Set(rows.map((r) => r.aid).filter(Boolean)).size;

  // ── Top lessons, by opens ─────────────────────────────────────────────────
  const opens = new Map<number, { opens: number; dones: number }>();
  for (const r of rows) {
    if (r.lesson === null) continue;
    if (r.event !== 'lesson_open' && r.event !== 'lesson_done') continue;
    const cell = opens.get(r.lesson) ?? { opens: 0, dones: 0 };
    if (r.event === 'lesson_open') cell.opens++;
    else cell.dones++;
    opens.set(r.lesson, cell);
  }
  const topLessons = Array.from(opens.entries())
    .map(([lesson, c]) => ({ lesson, ...c }))
    .sort((a, b) => b.opens - a.opens)
    .slice(0, 12);

  // ── By utm_source ─────────────────────────────────────────────────────────
  const sources = new Map<string, { views: number; aids: Set<string> }>();
  for (const r of rows) {
    if (r.event !== 'hub_view') continue;
    const key = r.utm?.source || 'direct';
    const cell = sources.get(key) ?? { views: 0, aids: new Set() };
    cell.views++;
    if (r.aid) cell.aids.add(r.aid);
    sources.set(key, cell);
  }
  const bySource = Array.from(sources.entries())
    .map(([source, c]) => ({ source, views: c.views, uniques: c.aids.size }))
    .sort((a, b) => b.views - a.views);

  const leads = leadsRes.error ? [] : (leadsRes.data ?? []);

  return NextResponse.json({ ready: true, days: DAYS, daily, totals, topLessons, bySource, leads });
}
