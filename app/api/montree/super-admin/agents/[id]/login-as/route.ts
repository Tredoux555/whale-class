// /api/montree/super-admin/agents/[id]/login-as/route.ts
//
// Session 103 — super-admin agent impersonation. Mirrors the schools
// "Login →" pattern from /api/montree/super-admin/login-as, but for agents.
// Issues a real montree-auth JWT cookie with role='agent' so the agent
// dashboard's cookie-based auth (verifySchoolRequest) recognises the session.
//
// Architectural rules (do NOT break):
// - Super-admin only. verifySuperAdminAuth gates the route.
// - Refuses impersonation of accounts that aren't actually agents
//   (is_agent must be true). Without that guard a super-admin could mint
//   an agent JWT for a regular teacher row, breaking the Phase 7a contract.
// - Suspended agents CAN be impersonated — the suspend flag only blocks
//   self-login. Tredoux needs to inspect their dashboard regardless.
// - Audit-logs to montree_agent_audit with event_type
//   'agent_impersonated_by_super_admin'. The plaintext code is NEVER touched —
//   we issue a JWT directly, leaving the SHA-256 hash on agent_password_hash
//   intact.
// - Returns { success, redirect } so the client can router.push to the
//   agent dashboard. setMontreeAuthCookie writes the httpOnly cookie.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { logAgentAudit } from '@/lib/montree/referral/agent-audit';
import { getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

export const dynamic = 'force-dynamic';

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  school_id: string | null;
  classroom_id: string | null;
  is_agent: boolean | null;
  is_active: boolean | null;
  agent_suspended_at: string | null;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperAdminAuth(req.headers);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: agentId } = await ctx.params;
  if (!agentId || typeof agentId !== 'string') {
    return NextResponse.json({ error: 'agent id required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const ip = getClientIP(req.headers);
  const userAgent = getUserAgent(req.headers);

  // Look up the agent row.
  const { data: row, error } = await supabase
    .from('montree_teachers')
    .select(
      'id, name, email, school_id, classroom_id, is_agent, is_active, agent_suspended_at'
    )
    .eq('id', agentId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  const agent = row as AgentRow;

  if (!agent.is_agent) {
    return NextResponse.json(
      { error: 'This account is not an agent. Issue an agent login first.' },
      { status: 400 }
    );
  }

  if (!agent.school_id) {
    // Agent JWT schoolId is INERT but the type requires a value. The agent's
    // teacher row should always have school_id. Bail explicitly rather than
    // silently passing a placeholder.
    return NextResponse.json(
      { error: 'Agent row is missing school_id; cannot mint token.' },
      { status: 500 }
    );
  }

  // Mint the agent JWT. Same shape as tryAgentLogin in /api/montree/auth/unified.
  const token = await createMontreeToken({
    sub: agent.id,
    schoolId: agent.school_id,
    classroomId: agent.classroom_id || undefined,
    role: 'agent',
  });

  // Audit to the agent-specific log (surfaced in super-admin "Recent
  // agent activity" panel). Fire-and-forget. We deliberately don't ALSO
  // write to montree_super_admin_audit — the agent log is the canonical
  // surface for agent-impacting events and Tredoux is the only super-admin.
  void logAgentAudit(supabase, {
    agent_id: agent.id,
    agent_display_name: agent.name,
    agent_email: agent.email,
    event_type: 'agent_impersonated_by_super_admin',
    actor_role: 'super_admin',
    details: {
      reason: 'super_admin_login_as',
      endpoint: '/api/montree/super-admin/agents/[id]/login-as',
    },
    ip_address: ip,
    user_agent: userAgent,
  });

  const response = NextResponse.json({
    success: true,
    redirect: '/montree/agent/dashboard',
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
    },
  });
  setMontreeAuthCookie(response, token, 'agent');
  return response;
}
