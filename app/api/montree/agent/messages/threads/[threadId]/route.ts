// /api/montree/agent/messages/threads/[threadId]/route.ts
// Session 104 — Agent thread detail + mark_read.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingAgent } from '@/lib/montree/agent-messaging/access';

export const dynamic = 'force-dynamic';

interface ThreadRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  thread_type: string;
  subject: string | null;
  group_id: string | null;
  created_by_role: string;
  created_by_id: string;
  created_at: string;
  last_message_at: string;
  archived_at: string | null;
  archived_by_id: string | null;
}

async function verifyAgentThreadAccess(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string,
  agent: { agentId: string; schoolIds: string[] }
): Promise<ThreadRow | null> {
  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('*')
    .eq('id', threadId)
    .in('school_id', agent.schoolIds)
    .maybeSingle();
  if (!thread) return null;

  const { data: part } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('participant_role', 'agent')
    .eq('participant_id', agent.agentId)
    .is('left_at', null)
    .maybeSingle();
  if (!part) return null;

  return thread as ThreadRow;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const supabase = getSupabase();
  const agent = await resolveMessagingAgent(request, supabase);
  if (agent instanceof NextResponse) return agent;

  const { threadId } = await params;
  const thread = await verifyAgentThreadAccess(supabase, threadId, agent);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  const [participantsRes, schoolRes] = await Promise.all([
    supabase
      .from('montree_message_thread_participants')
      .select('participant_role, participant_id, is_observer, is_primary, can_reply, last_read_at, joined_at, left_at')
      .eq('thread_id', threadId),
    supabase.from('montree_schools').select('id, name').eq('id', thread.school_id).maybeSingle(),
  ]);

  const parts = participantsRes.data || [];
  const teacherIds = parts.filter((p) => p.participant_role === 'teacher').map((p) => p.participant_id);
  const principalIds = parts.filter((p) => p.participant_role === 'principal').map((p) => p.participant_id);
  const agentIds = parts.filter((p) => p.participant_role === 'agent').map((p) => p.participant_id);

  const [teachers, principals, agents] = await Promise.all([
    teacherIds.length
      ? supabase.from('montree_teachers').select('id, name').in('id', teacherIds)
      : Promise.resolve({ data: [] }),
    principalIds.length
      ? supabase.from('montree_school_admins').select('id, name').in('id', principalIds)
      : Promise.resolve({ data: [] }),
    agentIds.length
      ? supabase.from('montree_teachers').select('id, name, email').in('id', agentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map<string, string>();
  for (const t of (teachers.data || []) as Array<{ id: string; name: string }>)
    nameById.set(`teacher:${t.id}`, t.name);
  for (const p of (principals.data || []) as Array<{ id: string; name: string }>)
    nameById.set(`principal:${p.id}`, p.name);
  for (const a of (agents.data || []) as Array<{ id: string; name: string; email: string }>)
    nameById.set(`agent:${a.id}`, a.name || a.email);

  const seen = new Set<string>();
  const dedupedParts: Array<typeof parts[number]> = [];
  for (const p of parts) {
    const key = `${p.participant_role}:${p.participant_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedParts.push(p);
  }

  return NextResponse.json({
    thread,
    school: schoolRes.data || null,
    participants: dedupedParts.map((p) => ({
      role: p.participant_role,
      id: p.participant_id,
      name: nameById.get(`${p.participant_role}:${p.participant_id}`) || null,
      is_observer: p.is_observer,
      is_primary: p.is_primary,
      can_reply: p.can_reply,
      last_read_at: p.last_read_at,
      joined_at: p.joined_at,
      left_at: p.left_at,
      is_me: p.participant_role === 'agent' && p.participant_id === agent.agentId,
    })),
  });
}

interface PatchBody {
  action: 'mark_read';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const supabase = getSupabase();
  const agent = await resolveMessagingAgent(request, supabase);
  if (agent instanceof NextResponse) return agent;

  const { threadId } = await params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const thread = await verifyAgentThreadAccess(supabase, threadId, agent);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  if (body.action === 'mark_read') {
    await supabase
      .from('montree_message_thread_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('participant_role', 'agent')
      .eq('participant_id', agent.agentId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
