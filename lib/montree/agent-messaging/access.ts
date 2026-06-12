// lib/montree/agent-messaging/access.ts
// Session 104 — entry-point access guard for the agent messaging surface.
//
// CROSS-POLLINATION CONTRACT: every downstream query MUST filter by either
//   - participant_id = agent.agentId AND participant_role='agent'  (participation)
//   - school_id IN agent.schoolIds                                  (school scope)
// where schoolIds is derived from montree_schools.founding_teacher_id =
// agent.userId (the canonical agent-self-scope filter from Phase 7).
//
// This module gates BOTH the JWT role (must be 'agent') AND verifies the agent
// still has is_agent=true and is not suspended in montree_teachers.

import { NextRequest, NextResponse } from 'next/server';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { verifySchoolRequest } from '../verify-request';
import type { MessagingAgent } from './types';

interface AgentRow {
  id: string;
  name: string | null;
  email: string | null;
  is_agent: boolean | null;
  agent_suspended_at: string | null;
}

interface SchoolRow {
  id: string;
}

/**
 * Resolve and authorize an agent for messaging. Returns the agent identity
 * bundle on success, or a NextResponse the caller must return verbatim.
 *
 * Returns 401 when not authed, 403 when not an agent / disabled / suspended,
 * 404 when the agent has no founded schools (nothing to message about).
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

  // Defensive double-check against montree_teachers — refuse if is_agent has
  // been flipped off or the agent has been suspended since the JWT was minted.
  const { data: agentRaw } = await supabase
    .from('montree_teachers')
    .select('id, name, email, is_agent, agent_suspended_at')
    .eq('id', auth.userId)
    .maybeSingle();

  if (!agentRaw) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 401 });
  }
  const agent = agentRaw as AgentRow;
  if (!agent.is_agent) {
    return NextResponse.json({ error: 'Agent record disabled' }, { status: 403 });
  }
  if (agent.agent_suspended_at) {
    return NextResponse.json({ error: 'Agent suspended' }, { status: 403 });
  }

  // Cross-pollination filter — the schools this agent founded.
  const { data: schools } = await supabase
    .from('montree_schools')
    .select('id')
    .eq('founding_teacher_id', auth.userId);

  const schoolIds = ((schools as SchoolRow[] | null) || []).map((s) => s.id);
  if (!schoolIds.length) {
    return NextResponse.json(
      { error: 'No referred schools — nothing to message about yet.' },
      { status: 404 }
    );
  }

  return {
    agentId: agent.id,
    agentName: agent.name || agent.email || 'Agent',
    schoolIds,
  };
}
