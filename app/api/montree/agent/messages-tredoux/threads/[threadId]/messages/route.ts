// /api/montree/agent/messages-tredoux/threads/[threadId]/messages
//
// Phase 4 — agent-side messages list + send.
//
// GET  — paginated message list (newest last per UX)
// POST — send a reply. ai_drafted is FORCED false on agent posts (per
//        Session 84 architectural rule — agent never claims AI authorship
//        on their own messages).
//
// CROSS-POLLINATION: verifies the agent IS a participant before any read/write.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingAgent } from '@/lib/montree/agent-super-admin-messaging/access';

export const dynamic = 'force-dynamic';

async function verifyAgentInThread(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string,
  agentId: string
): Promise<boolean> {
  const { data: part } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id, can_reply')
    .eq('thread_id', threadId)
    .eq('participant_role', 'agent')
    .eq('participant_id', agentId)
    .is('left_at', null)
    .maybeSingle();
  return !!part;
}

async function verifyThreadIsAgentSuperAdmin(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string
): Promise<boolean> {
  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('thread_type')
    .eq('id', threadId)
    .maybeSingle();
  return (thread as { thread_type: string } | null)?.thread_type === 'agent_super_admin';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabase();
  const agent = await resolveMessagingAgent(request, supabase);
  if (agent instanceof NextResponse) return agent;

  if (!(await verifyAgentInThread(supabase, threadId, agent.agentId))) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }
  if (!(await verifyThreadIsAgentSuperAdmin(supabase, threadId))) {
    return NextResponse.json({ error: 'Wrong thread type' }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from('montree_thread_messages')
    .select('id, sender_role, sender_id, sender_name, body, ai_drafted, sent_at, edited_at')
    .eq('thread_id', threadId)
    .is('deleted_at', null)
    .order('sent_at', { ascending: true })
    .limit(500);

  return NextResponse.json({ messages: messages || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabase();
  const agent = await resolveMessagingAgent(request, supabase);
  if (agent instanceof NextResponse) return agent;

  if (!(await verifyAgentInThread(supabase, threadId, agent.agentId))) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }
  if (!(await verifyThreadIsAgentSuperAdmin(supabase, threadId))) {
    return NextResponse.json({ error: 'Wrong thread type' }, { status: 403 });
  }

  let body: { body?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = (body.body || '').trim();
  if (!text) return NextResponse.json({ error: 'body is required' }, { status: 400 });
  if (text.length > 10000) {
    return NextResponse.json({ error: 'body exceeds 10000 chars' }, { status: 400 });
  }

  const { data: msg, error: msgErr } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: threadId,
      sender_role: 'agent',
      sender_id: agent.agentId,
      sender_name: agent.agentName,
      body: text,
      ai_drafted: false, // forced — agents never claim AI authorship
    })
    .select('id, sender_role, sender_id, sender_name, body, ai_drafted, sent_at')
    .single();

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  // Mark agent's read state — they just sent, so no unread.
  void supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', 'agent')
    .eq('participant_id', agent.agentId)
    .then(({ error }) => {
      if (error) console.error('[agent ↔ tredoux POST msg] last_read update:', error);
    });

  return NextResponse.json({ message: msg });
}
