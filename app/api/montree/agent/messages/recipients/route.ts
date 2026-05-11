// /api/montree/agent/messages/recipients/route.ts
// Session 104 — list the agent's referred schools + the principal of each
// for the compose modal.
//
// CROSS-POLLINATION CONTRACT: schools filtered to those founded by this
// agent (montree_schools.founding_teacher_id = auth.userId, resolved into
// agent.schoolIds by resolveMessagingAgent).
//
// Principal resolution mirrors addPrincipalObserver() in thread-resolver.ts:
// most-recently-logged-in active principal per school, oldest as tiebreaker.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingAgent } from '@/lib/montree/agent-messaging/access';
import type { AgentRecipientSchool } from '@/lib/montree/agent-messaging/types';

export const dynamic = 'force-dynamic';

interface SchoolRow {
  id: string;
  name: string | null;
}

interface PrincipalRow {
  id: string;
  name: string | null;
  school_id: string;
  last_login: string | null;
  created_at: string;
  is_active: boolean;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const agent = await resolveMessagingAgent(request, supabase);
  if (agent instanceof NextResponse) return agent;

  const { data: schools } = await supabase
    .from('montree_schools')
    .select('id, name')
    .in('id', agent.schoolIds)
    .order('name', { ascending: true });

  const schoolRows = (schools || []) as SchoolRow[];
  if (!schoolRows.length) return NextResponse.json({ schools: [] });

  // Pull every active principal for the schools and pick the canonical one
  // per school in code (avoids N round-trips).
  const { data: principals } = await supabase
    .from('montree_school_admins')
    .select('id, name, school_id, last_login, created_at, is_active')
    .in('school_id', agent.schoolIds)
    .eq('is_active', true);

  // Group + pick winner per school. Sort: last_login DESC (nulls last),
  // then created_at DESC.
  const byPrincipalSchool = new Map<string, PrincipalRow>();
  for (const raw of (principals || []) as PrincipalRow[]) {
    const existing = byPrincipalSchool.get(raw.school_id);
    if (!existing) {
      byPrincipalSchool.set(raw.school_id, raw);
      continue;
    }
    // Compare ordering
    const existingLogin = existing.last_login ? Date.parse(existing.last_login) : -Infinity;
    const candidateLogin = raw.last_login ? Date.parse(raw.last_login) : -Infinity;
    if (candidateLogin > existingLogin) {
      byPrincipalSchool.set(raw.school_id, raw);
      continue;
    }
    if (candidateLogin === existingLogin) {
      // Tiebreak on created_at DESC.
      if (Date.parse(raw.created_at) > Date.parse(existing.created_at)) {
        byPrincipalSchool.set(raw.school_id, raw);
      }
    }
  }

  const bundles: AgentRecipientSchool[] = schoolRows.map((s) => {
    const p = byPrincipalSchool.get(s.id);
    return {
      school_id: s.id,
      school_name: s.name || 'Unnamed school',
      principal: p ? { id: p.id, name: p.name || 'Principal' } : null,
    };
  });

  return NextResponse.json({ schools: bundles });
}
