// /api/montree/messages/threads/route.ts
// Session 97 — list/create threads in the new Communication system.
//
// GET: returns the caller's threads (or all school threads if principal),
//      with participant rollup, last-message snippet, and unread count.
// POST: creates a new thread + adds participants. Used for 1:1 DMs and
//       custom group threads. For broadcast fan-out, use /broadcast.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { createThreadWithParticipants } from '@/lib/montree/messaging/thread-resolver';
import type {
  ParticipantRole,
  ThreadType,
  ThreadListItem,
  SenderRole,
} from '@/lib/montree/messaging/types';

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
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const filterType = searchParams.get('type'); // optional: parent_teacher / broadcast / etc
  const classroomFilter = searchParams.get('classroom_id');
  const childFilter = searchParams.get('child_id');
  const unreadOnly = searchParams.get('unread_only') === 'true';

  // --- Step 1: get the candidate thread IDs the caller is allowed to see.
  let threadIds: string[] = [];

  if (auth.role === 'principal') {
    // Principal sees every thread in their school (transparency).
    let q = supabase
      .from('montree_message_threads')
      .select('id')
      .eq('school_id', auth.schoolId)
      .is('archived_at', null);
    if (filterType) q = q.eq('thread_type', filterType);
    if (classroomFilter) q = q.eq('classroom_id', classroomFilter);
    if (childFilter) q = q.eq('child_id', childFilter);
    const { data: rows } = await q.order('last_message_at', { ascending: false }).limit(200);
    threadIds = (rows || []).map((r) => r.id);
  } else if (auth.role === 'teacher' || auth.role === 'homeschool_parent') {
    const myRole: ParticipantRole = auth.role === 'homeschool_parent' ? 'parent' : 'teacher';
    const { data: parts } = await supabase
      .from('montree_message_thread_participants')
      .select('thread_id')
      .eq('participant_role', myRole)
      .eq('participant_id', auth.userId)
      .is('left_at', null);
    threadIds = (parts || []).map((p) => p.thread_id);
  } else {
    return NextResponse.json({ threads: [] });
  }

  if (!threadIds.length) {
    return NextResponse.json({ threads: [] });
  }

  // --- Step 2: load the thread rows (school-filtered as a belt-and-braces).
  let threadsQuery = supabase
    .from('montree_message_threads')
    .select('*')
    .in('id', threadIds)
    .eq('school_id', auth.schoolId)
    .is('archived_at', null);
  if (filterType) threadsQuery = threadsQuery.eq('thread_type', filterType);
  if (classroomFilter) threadsQuery = threadsQuery.eq('classroom_id', classroomFilter);
  if (childFilter) threadsQuery = threadsQuery.eq('child_id', childFilter);
  const { data: threads } = await threadsQuery.order('last_message_at', { ascending: false }).limit(200);
  const threadRows = (threads || []) as ThreadRow[];

  if (!threadRows.length) return NextResponse.json({ threads: [] });

  const ids = threadRows.map((t) => t.id);

  // --- Step 3: pull participants for these threads, plus my own last_read_at
  // --- and last messages in parallel.
  const [participantsRes, lastMessagesRes, myParticipationRes] = await Promise.all([
    supabase
      .from('montree_message_thread_participants')
      .select('thread_id, participant_role, participant_id, is_observer, is_primary')
      .in('thread_id', ids),
    supabase
      .from('montree_thread_messages')
      .select('id, thread_id, body, sender_role, sender_name, sent_at')
      .in('thread_id', ids)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(500),
    auth.role === 'principal'
      ? Promise.resolve({ data: [] as Array<{ thread_id: string; last_read_at: string | null }> })
      : supabase
          .from('montree_message_thread_participants')
          .select('thread_id, last_read_at')
          .in('thread_id', ids)
          .eq('participant_role', auth.role === 'homeschool_parent' ? 'parent' : auth.role)
          .eq('participant_id', auth.userId),
  ]);

  // Hydrate participant names in batch.
  const allParts = participantsRes.data || [];
  const teacherIds = new Set<string>();
  const parentIds = new Set<string>();
  const principalIds = new Set<string>();
  for (const p of allParts) {
    if (p.participant_role === 'teacher') teacherIds.add(p.participant_id);
    else if (p.participant_role === 'parent') parentIds.add(p.participant_id);
    else if (p.participant_role === 'principal') principalIds.add(p.participant_id);
  }
  const [teachersRes, parentsRes, principalsRes] = await Promise.all([
    teacherIds.size
      ? supabase.from('montree_teachers').select('id, name').in('id', Array.from(teacherIds))
      : Promise.resolve({ data: [] }),
    parentIds.size
      ? supabase.from('montree_parents').select('id, name, email').in('id', Array.from(parentIds))
      : Promise.resolve({ data: [] }),
    principalIds.size
      ? supabase.from('montree_school_admins').select('id, name').in('id', Array.from(principalIds))
      : Promise.resolve({ data: [] }),
  ]);
  const nameByKey = new Map<string, string>();
  for (const t of (teachersRes.data || []) as Array<{ id: string; name: string }>)
    nameByKey.set(`teacher:${t.id}`, t.name);
  for (const p of (parentsRes.data || []) as Array<{ id: string; name: string; email: string }>)
    nameByKey.set(`parent:${p.id}`, p.name || p.email);
  for (const p of (principalsRes.data || []) as Array<{ id: string; name: string }>)
    nameByKey.set(`principal:${p.id}`, p.name);

  const partsByThread = new Map<string, ThreadListItem['participants']>();
  for (const p of allParts) {
    const arr = partsByThread.get(p.thread_id) || [];
    arr.push({
      role: p.participant_role as ParticipantRole,
      id: p.participant_id,
      name: nameByKey.get(`${p.participant_role}:${p.participant_id}`) || null,
      is_observer: p.is_observer,
      is_primary: p.is_primary,
    });
    partsByThread.set(p.thread_id, arr);
  }

  // Pick the latest message per thread.
  const latestByThread = new Map<
    string,
    { id: string; body: string; sender_role: SenderRole; sender_name: string; sent_at: string }
  >();
  for (const m of lastMessagesRes.data || []) {
    if (!latestByThread.has(m.thread_id)) {
      latestByThread.set(m.thread_id, {
        id: m.id,
        body: m.body,
        sender_role: m.sender_role as SenderRole,
        sender_name: m.sender_name,
        sent_at: m.sent_at,
      });
    }
  }

  const lastReadByThread = new Map<string, string | null>();
  for (const r of myParticipationRes.data || []) {
    lastReadByThread.set(r.thread_id, r.last_read_at);
  }

  // Compute unread per thread (only for non-principal participants — principal
  // is observer and we don't badge unread for them across the whole school).
  const unreadByThread = new Map<string, number>();
  if (auth.role !== 'principal') {
    // Count messages newer than my last_read_at in each thread.
    const countPerThread = new Map<string, number>();
    for (const m of lastMessagesRes.data || []) {
      const lr = lastReadByThread.get(m.thread_id);
      if (m.sender_role === auth.role || (auth.role === 'homeschool_parent' && m.sender_role === 'parent'))
        continue; // own messages don't count
      if (!lr || m.sent_at > lr) {
        countPerThread.set(m.thread_id, (countPerThread.get(m.thread_id) || 0) + 1);
      }
    }
    for (const [tid, count] of countPerThread) unreadByThread.set(tid, count);
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
      unread_for_me: unreadByThread.get(t.id) || 0,
    };
  });

  const filtered = unreadOnly ? enriched.filter((t) => t.unread_for_me > 0) : enriched;

  return NextResponse.json({ threads: filtered });
}

interface CreateThreadBody {
  thread_type: ThreadType;
  subject?: string | null;
  classroom_id?: string | null;
  child_id?: string | null;
  group_id?: string | null;
  participants: Array<{
    role: ParticipantRole;
    id: string;
    is_primary?: boolean;
    is_observer?: boolean;
    can_reply?: boolean;
  }>;
}

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: CreateThreadBody;
  try {
    body = (await request.json()) as CreateThreadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.thread_type) {
    return NextResponse.json({ error: 'thread_type is required' }, { status: 400 });
  }
  if (!Array.isArray(body.participants) || body.participants.length === 0) {
    return NextResponse.json({ error: 'participants array is required' }, { status: 400 });
  }

  // Only principal/teacher can create internal threads. Parents can only
  // initiate parent_teacher / parent_principal threads.
  if (auth.role === 'homeschool_parent' && !['parent_teacher', 'parent_principal'].includes(body.thread_type)) {
    return NextResponse.json({ error: 'Parents can only initiate parent threads' }, { status: 403 });
  }

  const callerRole: 'teacher' | 'principal' | 'parent' =
    auth.role === 'homeschool_parent' ? 'parent' : (auth.role as 'teacher' | 'principal');

  const result = await createThreadWithParticipants(getSupabase(), {
    schoolId: auth.schoolId,
    classroomId: body.classroom_id ?? null,
    childId: body.child_id ?? null,
    threadType: body.thread_type,
    subject: body.subject ?? null,
    groupId: body.group_id ?? null,
    createdBy: { role: callerRole, id: auth.userId },
    participants: body.participants.map((p) => ({
      role: p.role,
      id: p.id,
      isPrimary: p.is_primary,
      isObserver: p.is_observer,
      canReply: p.can_reply,
    })),
  });

  if (!result) {
    return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
  }

  return NextResponse.json({ thread_id: result.id }, { status: 201 });
}
