// /api/montree/agent/messages/threads/route.ts
// Session 104 — Agent → Principal messaging: list / create threads.
//
// CROSS-POLLINATION CONTRACT (mirrors parent / teacher patterns):
//   - GET filters thread_id list to where the agent is a participant
//     (participant_role='agent', participant_id=auth.userId).
//   - GET further filters thread.school_id to the agent's founded schools.
//   - POST validates target school is in agent.schoolIds before any insert.
//   - POST resolves principal at-send-time from montree_school_admins.
//
// SECURITY:
//   - resolveMessagingAgent gates on auth.role === 'agent' AND verifies
//     is_agent=true + not suspended on every request.
//   - The DB foreign key from montree_schools.founding_teacher_id is the
//     canonical "this agent founded this school" signal — same as every other
//     /api/montree/agent/* endpoint.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingAgent } from '@/lib/montree/agent-messaging/access';
import { createThreadWithParticipants } from '@/lib/montree/messaging/thread-resolver';
import {
  isEncryptionEnabledForSchool,
  writeEncryptedField,
  readEncryptedField,
} from '@/lib/montree/messaging-crypto';
import type { ThreadListItem, ThreadType, SenderRole } from '@/lib/montree/messaging/types';

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

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const agent = await resolveMessagingAgent(request, supabase);
  if (agent instanceof NextResponse) return agent;

  // 1. Thread IDs this agent is a participant in.
  const { data: parts } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('participant_role', 'agent')
    .eq('participant_id', agent.agentId)
    .is('left_at', null);

  const threadIds = (parts || []).map((p) => p.thread_id);
  if (!threadIds.length) return NextResponse.json({ threads: [] });

  // 2. Pull the thread rows — belt-and-braces school filter.
  const { data: threads } = await supabase
    .from('montree_message_threads')
    .select('*')
    .in('id', threadIds)
    .in('school_id', agent.schoolIds)
    .is('archived_at', null)
    .order('last_message_at', { ascending: false })
    .limit(200);

  const threadRows = (threads || []) as ThreadRow[];
  if (!threadRows.length) return NextResponse.json({ threads: [] });

  const ids = threadRows.map((t) => t.id);

  // 3. Participants + last messages + my last_read_at in parallel.
  const [participantsRes, lastMessagesRes, myParticipationRes, schoolsRes] = await Promise.all([
    supabase
      .from('montree_message_thread_participants')
      .select('thread_id, participant_role, participant_id, is_observer, is_primary')
      .in('thread_id', ids),
    supabase
      // 🚨 Session 121 — pull encryption_version so we decrypt body for snippet.
      .from('montree_thread_messages')
      .select('id, thread_id, body, encryption_version, sender_role, sender_id, sender_name, sent_at')
      .in('thread_id', ids)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(500),
    supabase
      .from('montree_message_thread_participants')
      .select('thread_id, last_read_at')
      .in('thread_id', ids)
      .eq('participant_role', 'agent')
      .eq('participant_id', agent.agentId),
    supabase
      .from('montree_schools')
      .select('id, name')
      .in('id', agent.schoolIds),
  ]);

  // Hydrate participant names.
  const allParts = participantsRes.data || [];
  const teacherIds = new Set<string>();
  const principalIds = new Set<string>();
  const agentIds = new Set<string>();
  for (const p of allParts) {
    if (p.participant_role === 'teacher') teacherIds.add(p.participant_id);
    else if (p.participant_role === 'principal') principalIds.add(p.participant_id);
    else if (p.participant_role === 'agent') agentIds.add(p.participant_id);
  }
  const [teachersRes, principalsRes, agentsRes] = await Promise.all([
    teacherIds.size
      ? supabase.from('montree_teachers').select('id, name').in('id', Array.from(teacherIds))
      : Promise.resolve({ data: [] }),
    principalIds.size
      ? supabase.from('montree_school_admins').select('id, name').in('id', Array.from(principalIds))
      : Promise.resolve({ data: [] }),
    agentIds.size
      ? supabase.from('montree_teachers').select('id, name, email').in('id', Array.from(agentIds))
      : Promise.resolve({ data: [] }),
  ]);
  const nameByKey = new Map<string, string>();
  for (const t of (teachersRes.data || []) as Array<{ id: string; name: string }>)
    nameByKey.set(`teacher:${t.id}`, t.name);
  for (const p of (principalsRes.data || []) as Array<{ id: string; name: string }>)
    nameByKey.set(`principal:${p.id}`, p.name);
  for (const a of (agentsRes.data || []) as Array<{ id: string; name: string; email: string }>)
    nameByKey.set(`agent:${a.id}`, a.name || a.email);

  const schoolNameById = new Map<string, string>();
  for (const s of (schoolsRes.data || []) as Array<{ id: string; name: string }>)
    schoolNameById.set(s.id, s.name);

  const partsByThread = new Map<string, ThreadListItem['participants']>();
  for (const p of allParts) {
    const arr = partsByThread.get(p.thread_id) || [];
    arr.push({
      // Cast — 'agent' isn't in ParticipantRole yet but the DB allows it post-mig-197.
      role: p.participant_role as ThreadListItem['participants'][number]['role'],
      id: p.participant_id,
      name: nameByKey.get(`${p.participant_role}:${p.participant_id}`) || null,
      is_observer: p.is_observer,
      is_primary: p.is_primary,
    });
    partsByThread.set(p.thread_id, arr);
  }

  const latestByThread = new Map<
    string,
    { id: string; body: string; sender_role: SenderRole; sender_id: string; sender_name: string; sent_at: string }
  >();
  for (const m of (lastMessagesRes.data || []) as Array<{
    id: string;
    thread_id: string;
    body: string;
    encryption_version: number | null;
    sender_role: string;
    sender_id: string;
    sender_name: string;
    sent_at: string;
  }>) {
    if (!latestByThread.has(m.thread_id)) {
      latestByThread.set(m.thread_id, {
        id: m.id,
        // 🚨 Decrypt body before storing for snippet.
        body: readEncryptedField(m.body, m.encryption_version),
        sender_role: m.sender_role as SenderRole,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        sent_at: m.sent_at,
      });
    }
  }

  const lastReadByThread = new Map<string, string | null>();
  for (const r of myParticipationRes.data || []) {
    lastReadByThread.set(r.thread_id, r.last_read_at);
  }

  const unreadByThread = new Map<string, number>();
  for (const m of lastMessagesRes.data || []) {
    if (m.sender_id === agent.agentId) continue;
    const lr = lastReadByThread.get(m.thread_id);
    if (!lr || m.sent_at > lr) {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) || 0) + 1);
    }
  }

  const enriched: ThreadListItem[] = threadRows.map((t) => {
    const last = latestByThread.get(t.id);
    return {
      ...t,
      thread_type: t.thread_type as ThreadType,
      created_by_role: t.created_by_role as SenderRole,
      participants: partsByThread.get(t.id) || [],
      last_snippet: last ? last.body.slice(0, 240) : null,
      last_sender_name: last ? last.sender_name : null,
      last_sender_role: last ? last.sender_role : null,
      last_sender_id: last ? last.sender_id : null,
      last_sender_is_me: last ? last.sender_id === agent.agentId : false,
      unread_for_me: unreadByThread.get(t.id) || 0,
      // Augment with school_name so the agent list page can show which school
      // this thread is about without an extra fetch.
      school_name: schoolNameById.get(t.school_id) || null,
    } as ThreadListItem & { school_name: string | null };
  });

  return NextResponse.json({ threads: enriched });
}

interface CreateThreadBody {
  school_id: string;
  subject?: string | null;
  body: string;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const agent = await resolveMessagingAgent(request, supabase);
  if (agent instanceof NextResponse) return agent;

  let body: CreateThreadBody;
  try {
    body = (await request.json()) as CreateThreadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.school_id || !agent.schoolIds.includes(body.school_id)) {
    return NextResponse.json(
      { error: 'school_id must be one of your referred schools' },
      { status: 403 }
    );
  }
  if (!body.body || typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }
  if (body.body.length > 10000) {
    return NextResponse.json({ error: 'body exceeds 10000 chars' }, { status: 400 });
  }

  // Resolve the principal at-send-time. Use the same ordering as
  // addPrincipalObserver() (last_login DESC nullsFirst:false, created_at DESC)
  // so the agent's message always lands with the most-recently-active
  // principal.
  const { data: principal } = await supabase
    .from('montree_school_admins')
    .select('id, name')
    .eq('school_id', body.school_id)
    .eq('is_active', true)
    .order('last_login', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!principal) {
    return NextResponse.json(
      { error: 'This school has no active principal yet — try again once they sign up.' },
      { status: 404 }
    );
  }

  // Create the thread. thread_type='agent_principal' + 'agent' participant
  // role are added by migration 197. Until that runs, this will fail with a
  // CHECK constraint error — handled below via the null-result branch.
  const result = await createThreadWithParticipants(supabase, {
    schoolId: body.school_id,
    classroomId: null,
    childId: null,
    threadType: 'agent_principal',
    subject: body.subject ? String(body.subject).slice(0, 200) : null,
    createdBy: { role: 'agent', id: agent.agentId },
    participants: [
      {
        role: 'principal',
        id: principal.id,
        isPrimary: true,
        canReply: true,
      },
      {
        role: 'agent',
        id: agent.agentId,
        canReply: true,
      },
    ],
  });

  if (!result) {
    return NextResponse.json(
      { error: 'Failed to create thread — has migration 197 been run?' },
      { status: 500 }
    );
  }

  // 🚨 Session 121 — encrypt first-message body when encryption_v1 is on.
  const encEnabled = await isEncryptionEnabledForSchool(supabase, body.school_id);
  const enc = writeEncryptedField(body.body.trim(), encEnabled);
  const { error: msgErr } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: result.id,
      sender_role: 'agent',
      sender_id: agent.agentId,
      sender_name: agent.agentName,
      body: enc.value,
      encryption_version: enc.version,
      ai_drafted: false,
    });

  if (msgErr) {
    console.error('[agent thread POST] first-message insert failed', msgErr);
  }

  await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', result.id)
    .eq('participant_role', 'agent')
    .eq('participant_id', agent.agentId);

  return NextResponse.json({ thread_id: result.id }, { status: 201 });
}
