// /api/montree/agent/me/route.ts
//
// Phase 7b — Minimum viable endpoint that powers the agent dashboard stub.
// Returns the agent's profile + the list of schools they've referred (where
// montree_schools.founding_teacher_id = auth.userId).
//
// 🚨 CRITICAL ARCHITECTURAL RULE — cross-pollination filter:
// Every agent endpoint MUST self-scope via WHERE founding_teacher_id =
// auth.userId. An agent must NEVER see another agent's schools, codes, or
// earnings. This is the most important security invariant for Phase 7. See
// docs/AGENT_DASHBOARD_PLAN.md Section 7.2.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  agent_default_share_pct: string | number | null;
  agent_login_set_at: string | null;
  agent_login_last_used_at: string | null;
  agent_suspended_at: string | null;
}

interface SchoolRow {
  id: string;
  name: string | null;
  created_at: string;
  revenue_share_pct: string | number | null;
  revenue_share_active: boolean | null;
  founding_teacher_id: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  // Only agents can hit this endpoint. Even though the route is /agent/me,
  // we still verify the JWT role explicitly — a teacher hitting this URL
  // should NOT see agent data.
  if (auth.role !== 'agent') {
    return NextResponse.json({ error: 'Forbidden — agent role required' }, { status: 403 });
  }

  const supabase = getSupabase();

  // ── Agent profile (self-scoped to auth.userId) ──────────────────────────
  const { data: agentRaw, error: agentErr } = await supabase
    .from('montree_teachers')
    .select('id, name, email, is_agent, agent_default_share_pct, agent_login_set_at, agent_login_last_used_at, agent_suspended_at')
    .eq('id', auth.userId)
    .maybeSingle();

  if (agentErr) {
    console.error('[agent/me] profile lookup failed:', agentErr.message);
    return NextResponse.json({ error: 'Profile lookup failed', detail: agentErr.message }, { status: 500 });
  }
  if (!agentRaw) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  const agent = agentRaw as AgentRow;

  // Defensive — JWT says role='agent' but DB row no longer has is_agent=true
  // (Tredoux removed the marker, race, etc.). Refuse to serve data.
  if (!agent.is_agent) {
    return NextResponse.json({ error: 'Agent record disabled' }, { status: 403 });
  }
  if (agent.agent_suspended_at) {
    // Suspended — UI should redirect to a "your access has been paused"
    // screen. For now surface a clear error so we know.
    return NextResponse.json({
      error: 'Agent suspended',
      suspended_at: agent.agent_suspended_at,
    }, { status: 403 });
  }

  // ── Referred schools (the cross-pollination filter is RIGHT HERE) ───────
  const { data: schoolsRaw, error: schoolsErr } = await supabase
    .from('montree_schools')
    .select('id, name, created_at, revenue_share_pct, revenue_share_active, founding_teacher_id')
    .eq('founding_teacher_id', auth.userId) // ← critical filter
    .order('created_at', { ascending: false });

  if (schoolsErr) {
    console.error('[agent/me] schools lookup failed:', schoolsErr.message);
    // Don't fail the whole endpoint — return profile with empty schools list
    // so the dashboard shell still renders.
    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        agent_default_share_pct: agent.agent_default_share_pct === null
          ? null
          : Number(agent.agent_default_share_pct),
        agent_login_set_at: agent.agent_login_set_at,
        agent_login_last_used_at: agent.agent_login_last_used_at,
      },
      schools: [],
      schools_error: 'Could not load referred schools — try again later.',
    });
  }

  const schools = (schoolsRaw || []) as SchoolRow[];

  // Per-school student count (montree_children, is_active=true).
  // Done in a single query to avoid N+1.
  const schoolIds = schools.map(s => s.id);
  let countMap: Record<string, number> = {};
  if (schoolIds.length > 0) {
    const { data: childRows } = await supabase
      .from('montree_children')
      .select('school_id')
      .in('school_id', schoolIds)
      .eq('is_active', true);
    countMap = (childRows || []).reduce((acc: Record<string, number>, row) => {
      const sid = row.school_id as string;
      acc[sid] = (acc[sid] || 0) + 1;
      return acc;
    }, {});
  }

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      agent_default_share_pct: agent.agent_default_share_pct === null
        ? null
        : Number(agent.agent_default_share_pct),
      agent_login_set_at: agent.agent_login_set_at,
      agent_login_last_used_at: agent.agent_login_last_used_at,
    },
    schools: schools.map(s => ({
      id: s.id,
      name: s.name,
      created_at: s.created_at,
      revenue_share_pct: s.revenue_share_pct === null ? null : Number(s.revenue_share_pct),
      revenue_share_active: Boolean(s.revenue_share_active),
      student_count: countMap[s.id] || 0,
    })),
  });
}
