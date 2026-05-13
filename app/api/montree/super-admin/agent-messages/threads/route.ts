// /api/montree/super-admin/agent-messages/threads
//
// Phase 4 — Tredoux's side. Lists ALL agent_super_admin threads across all
// agents. Hydrates with the agent identity so the inbox UI can show "from
// Gloria" / "from Sarah" without per-thread fetches.
//
// CROSS-POLLINATION: super-admin sees globally — by design.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingSuperAdmin } from '@/lib/montree/agent-super-admin-messaging/access';
import { SUPER_ADMIN_SENTINEL_UUID } from '@/lib/montree/agent-super-admin-messaging/types';

export const dynamic = 'force-dynamic';

interface ThreadRow {
  id: string;
  subject: string | null;
  created_at: string;
  last_message_at: string;
  created_by_role: string;
  created_by_id: string;
  archived_at: string | null;
}

interface MessageRow {
  id: string;
  thread_id: string;
  body: string;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  sent_at: string;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const sa = await resolveMessagingSuperAdmin(request);
  if (sa instanceof NextResponse) return sa;

  // 1. ALL agent_super_admin threads, newest first.
  const { data: threads } = await supabase
    .from('montree_message_threads')
    .select('*')
    .eq('thread_type', 'agent_super_admin')
    .is('archived_at', null)
    .order('last_message_at', { ascending: false })
    .limit(200);

  const threadRows = ((threads as ThreadRow[] | null) || []);
  if (!threadRows.length) {
    return NextResponse.json({ threads: [], total: 0, unread: 0 });
  }

  const ids = threadRows.map((t) => t.id);

  // 2. Agent participant per thread + last messages + super-admin last_read in parallel
  const [agentPartsRes, lastMessagesRes, saReadRes] = await Promise.all([
    supabase
      .from('montree_message_thread_participants')
      .select('thread_id, participant_id')
      .eq('participant_role', 'agent')
      .in('thread_id', ids),
    supabase
      .from('montree_thread_messages')
      .select('id, thread_id, body, sender_role, sender_id, sender_name, sent_at')
      .in('thread_id', ids)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(500),
    supabase
      .from('montree_message_thread_participants')
      .select('thread_id, last_read_at')
      .in('thread_id', ids)
      .eq('participant_role', 'super_admin')
      .eq('participant_id', SUPER_ADMIN_SENTINEL_UUID),
  ]);

  // Agent id per thread → fetch agent identity names.
  const agentIdByThread = new Map<string, string>();
  const allAgentIds = new Set<string>();
  for (const p of (agentPartsRes.data as { thread_id: string; participant_id: string }[] | null) || []) {
    agentIdByThread.set(p.thread_id, p.participant_id);
    allAgentIds.add(p.participant_id);
  }

  const { data: agentsData } = allAgentIds.size
    ? await supabase
        .from('montree_teachers')
        .select('id, name, email')
        .in('id', Array.from(allAgentIds))
    : { data: [] };

  const agentInfo = new Map<string, { name: string; email: string | null }>();
  for (const a of (agentsData as { id: string; name: string | null; email: string | null }[] | null) || []) {
    agentInfo.set(a.id, { name: a.name || a.email || 'Agent', email: a.email });
  }

  const latestByThread = new Map<string, MessageRow>();
  for (const m of (lastMessagesRes.data as MessageRow[] | null) || []) {
    if (!latestByThread.has(m.thread_id)) latestByThread.set(m.thread_id, m);
  }

  const saReadByThread = new Map<string, string | null>();
  for (const r of (saReadRes.data as { thread_id: string; last_read_at: string | null }[] | null) || []) {
    saReadByThread.set(r.thread_id, r.last_read_at);
  }

  // Unread = messages from someone other than super-admin AFTER super-admin's last_read_at
  const unreadByThread = new Map<string, number>();
  for (const m of (lastMessagesRes.data as MessageRow[] | null) || []) {
    if (m.sender_role === 'super_admin') continue;
    const lr = saReadByThread.get(m.thread_id);
    if (!lr || m.sent_at > lr) {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) || 0) + 1);
    }
  }

  const enriched = threadRows.map((t) => {
    const last = latestByThread.get(t.id);
    const agentId = agentIdByThread.get(t.id);
    const ai = agentId ? agentInfo.get(agentId) : null;
    return {
      id: t.id,
      subject: t.subject,
      created_at: t.created_at,
      last_message_at: t.last_message_at,
      agent_id: agentId || null,
      agent_name: ai?.name || 'Agent',
      agent_email: ai?.email || null,
      last_snippet: last ? last.body.slice(0, 240) : null,
      last_sender_role: last ? last.sender_role : null,
      last_sender_name: last ? last.sender_name : null,
      last_sender_is_me: last ? last.sender_role === 'super_admin' : false,
      unread_for_me: unreadByThread.get(t.id) || 0,
    };
  });

  const totalUnread = enriched.reduce((acc, t) => acc + (t.unread_for_me > 0 ? 1 : 0), 0);

  return NextResponse.json({ threads: enriched, total: enriched.length, unread: totalUnread });
}
