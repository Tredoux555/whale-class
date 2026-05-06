// /api/montree/agent/schools/route.ts
//
// Phase 7d — Agent's referred schools list. Self-scoped to auth.userId via
// founding_teacher_id. Section 3.4 of AGENT_DASHBOARD_PLAN lists this as a
// distinct endpoint from /me — same data shape but standalone. Used by the
// /montree/agent/schools page (full list) when there's overflow beyond what
// fits on the dashboard.
//
// 🚨 CRITICAL FILTER: WHERE founding_teacher_id = auth.userId.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

const SUBSCRIPTION_PER_STUDENT_USD = 7;

interface SchoolRow {
  id: string;
  name: string | null;
  created_at: string;
  revenue_share_pct: string | number | null;
  revenue_share_active: boolean | null;
  primary_locale: string | null;
}

export async function GET(req: NextRequest) {
  const auth = await verifySchoolRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const supabase = getSupabase();

  const { data: schoolsRaw, error: schoolsErr } = await supabase
    .from('montree_schools')
    .select('id, name, created_at, revenue_share_pct, revenue_share_active, primary_locale')
    .eq('founding_teacher_id', auth.userId) // ← CRITICAL: cross-pollination filter
    .order('created_at', { ascending: false });

  if (schoolsErr) {
    console.error('[agent/schools GET] lookup failed:', schoolsErr.message);
    return NextResponse.json({ error: 'Lookup failed', detail: schoolsErr.message }, { status: 500 });
  }
  const schools = (schoolsRaw || []) as SchoolRow[];
  const schoolIds = schools.map(s => s.id);

  // Per-school student count, single batch query.
  const counts: Record<string, number> = {};
  if (schoolIds.length > 0) {
    const { data: childRows } = await supabase
      .from('montree_children')
      .select('school_id')
      .in('school_id', schoolIds)
      .eq('is_active', true);
    for (const row of childRows || []) {
      const sid = row.school_id as string;
      counts[sid] = (counts[sid] || 0) + 1;
    }
  }

  return NextResponse.json({
    schools: schools.map(s => {
      const studentCount = counts[s.id] || 0;
      const sharePct = Number(s.revenue_share_pct || 0);
      const grossEstimate = studentCount * SUBSCRIPTION_PER_STUDENT_USD;
      return {
        id: s.id,
        name: s.name,
        created_at: s.created_at,
        revenue_share_pct: sharePct,
        revenue_share_active: Boolean(s.revenue_share_active),
        primary_locale: s.primary_locale,
        student_count: studentCount,
        gross_estimate_usd: Math.round(grossEstimate * 100) / 100,
      };
    }),
  });
}
