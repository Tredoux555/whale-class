// lib/montree/agent-super-admin-messaging/access.ts
//
// Phase 4 of agent system fix plan — entry-point access guards for the
// agent ↔ super-admin messaging surface.
//
// AGENT SIDE — `resolveMessagingAgent`:
//   - Verifies JWT role === 'agent'
//   - Verifies is_agent=true AND not suspended on every request
//   - Does NOT require the agent to have founded schools (unlike Session 104's
//     agent_principal flow). An agent without referrals should still be able
//     to ping Tredoux ("I'm having trouble with X").
//   - Returns { agentId, agentName }
//
// SUPER-ADMIN SIDE — `resolveMessagingSuperAdmin`:
//   - Verifies super-admin token via verifySuperAdminAuth
//   - Returns the sentinel super-admin struct
//
// CROSS-POLLINATION CONTRACT:
//   - Agent endpoints filter by participant_id = agentId AND participant_role='agent'
//   - Super-admin endpoints can see ALL agent_super_admin threads globally
//     (Tredoux's role = oversight)
//   - Both sides scope query by thread_type='agent_super_admin' explicitly

import { NextRequest, NextResponse } from 'next/server';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { verifySchoolRequest } from '../verify-request';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import type { MessagingAgent, MessagingSuperAdmin } from './types';
import { SUPER_ADMIN_SENTINEL_UUID, SUPER_ADMIN_DISPLAY_NAME } from './types';

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  agent_suspended_at: string | null;
}

/**
 * Resolve and authorize the agent for super-admin messaging. Returns the
 * agent identity bundle on success, or a NextResponse the caller must return.
 *
 * Returns 401 when not authed, 403 when not an agent / disabled / suspended,
 * 404 when the JWT references an agent row that no longer exists.
 *
 * 🚨 Unlike the agent_principal resolver, this does NOT require schoolIds.
 */
export async function resolveMessagingAgent(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<MessagingAgent | NextResponse> {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== 'agent') {
    return NextResponse.json(
      { error: 'Forbidden — agent role required' },
      { status: 403 }
    );
  }

  // Defensive double-check — is_agent could be flipped off / suspended since
  // the JWT was minted.
  const { data: agentRaw } = await supabase
    .from('montree_teachers')
    .select('id, name, email, is_agent, agent_suspended_at')
    .eq('id', auth.userId)
    .maybeSingle();

  if (!agentRaw) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  const agent = agentRaw as AgentRow;
  if (!agent.is_agent) {
    return NextResponse.json({ error: 'Agent record disabled' }, { status: 403 });
  }
  if (agent.agent_suspended_at) {
    return NextResponse.json({ error: 'Agent suspended' }, { status: 403 });
  }

  return {
    agentId: agent.id,
    agentName: agent.name || agent.email || 'Agent',
  };
}

/**
 * Resolve super-admin auth and return the sentinel super-admin struct.
 * Returns 401 on auth failure.
 */
export async function resolveMessagingSuperAdmin(
  request: NextRequest
): Promise<MessagingSuperAdmin | NextResponse> {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return {
    id: SUPER_ADMIN_SENTINEL_UUID,
    name: SUPER_ADMIN_DISPLAY_NAME,
  };
}
