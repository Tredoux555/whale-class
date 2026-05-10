// /api/montree/parent/messages/threads/route.ts
// Session 98 — list and create threads on the parent side.
//
// All endpoints in this tree gate on the `parent_messaging` feature flag via
// resolveMessagingParent(). When OFF, return 404 — the surface should not
// appear to exist.
//
// CROSS-POLLINATION CONTRACT:
//   - GET filters thread_id list to where the parent is a participant.
//   - GET further filters thread.child_id to the parent's child set.
//   - POST validates child_id ∈ parent.childIds before creating anything.
//   - POST validates the recipient (teacher) is in the SAME classroom as the
//     child, OR the recipient (principal) is in the SAME school.
//   - All writes go through createThreadWithParticipants() which auto-adds
//     the principal as observer for parent_teacher / parent_principal
//     threads (Session 96 transparency rule).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingParent } from '@/lib/montree/parent-messaging/access';
import { createThreadWithParticipants } from '@/lib/montree/messaging/thread-resolver';
import type {
  ParticipantRole,
  ThreadType,
  SenderRole,
  ThreadListItem,
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

export async function GET() {
  const supabase = getSupabase();
  const parent = await resolveMessagingParent(supabase);
  if (parent instanceof NextResponse) return parent;

  // 1. The parent's participant rows give us the thread IDs they can see.
  const { data: parts } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('participant_role', 'parent')
    .eq('participant_id', parent.parentId)
    .is('left_at', null);

  const threadIds = (parts || []).map((p) => p.thread_id);
  if (!threadIds.length) {
    return NextResponse.json({ threads: [] });
  }

  // 2. Pull the thread rows. Belt-and-braces school filter + child_id ∈ parent
  // child set so a stale participant row can't leak a thread for a child the
  // parent no longer has access to.
  const { data: threads } = await supabase
    .from('montree_message_threads')
    .select('*')
    .in('id', threadIds)
    .eq('school_id', parent.schoolId)
    .in('child_id', parent.childIds)
    .is('archived_at', null)
    .order('last_message_at', { ascending: false })
    .limit(200);

  const threadRows = (threads || []) as ThreadRow[];
  if (!threadRows.length) return NextResponse.json({ threads: [] });

  const ids = threadRows.map((t) => t.id);

  // 3. Pull participants + last messages + my last_read_at in parallel.
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
    supabase
      .from('montree_message_thread_participants')
      .select('thread_id, last_read_at')
      .in('thread_id', ids)
      .eq('participant_role', 'parent')
      .eq('participant_id', parent.parentId),
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

  // Latest message per thread.
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

  // Unread per thread (messages not authored by me, sent after my last_read_at).
  const unreadByThread = new Map<string, number>();
  const unreadCount = new Map<string, number>();
  for (const m of lastMessagesRes.data || []) {
    if (m.sender_role === 'parent' && nameByKey.get(`parent:${parent.parentId}`)) {
      // Skip my own messages — but we don't have sender_id in this select.
      // Use sender_name as a proxy: skip messages whose sender_name matches mine.
      if (m.sender_name === parent.parentName) continue;
    }
    const lr = lastReadByThread.get(m.thread_id);
    if (!lr || m.sent_at > lr) {
      unreadCount.set(m.thread_id, (unreadCount.get(m.thread_id) || 0) + 1);
    }
  }
  for (const [tid, count] of unreadCount) unreadByThread.set(tid, count);

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

  return NextResponse.json({ threads: enriched });
}

interface CreateThreadBody {
  child_id: string;
  recipient: { role: 'teacher' | 'principal'; id: string };
  subject?: string | null;
  body: string;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const parent = await resolveMessagingParent(supabase);
  if (parent instanceof NextResponse) return parent;

  let body: CreateThreadBody;
  try {
    body = (await request.json()) as CreateThreadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.child_id || !parent.childIds.includes(body.child_id)) {
    return NextResponse.json(
      { error: 'child_id must be one of your children' },
      { status: 403 }
    );
  }
  if (!body.recipient || !body.recipient.role || !body.recipient.id) {
    return NextResponse.json({ error: 'recipient is required' }, { status: 400 });
  }
  if (!['teacher', 'principal'].includes(body.recipient.role)) {
    return NextResponse.json(
      { error: 'recipient.role must be teacher or principal' },
      { status: 400 }
    );
  }
  if (!body.body || typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }
  if (body.body.length > 10000) {
    return NextResponse.json({ error: 'body exceeds 10000 chars' }, { status: 400 });
  }

  // Resolve the child's classroom — needed for thread.classroom_id and for
  // verifying the recipient teacher is actually in that classroom.
  const { data: child } = await supabase
    .from('montree_children')
    .select('id, classroom_id, montree_classrooms!inner(school_id)')
    .eq('id', body.child_id)
    .maybeSingle();

  if (!child || !child.classroom_id) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  // Belt-and-braces: the child's classroom must be in the parent's school.
  const childSchoolId = (child.montree_classrooms as { school_id: string } | null)?.school_id;
  if (childSchoolId && childSchoolId !== parent.schoolId) {
    return NextResponse.json({ error: 'Child not in your school' }, { status: 403 });
  }

  // Verify the recipient.
  let threadType: ThreadType;
  if (body.recipient.role === 'teacher') {
    const { data: teacher } = await supabase
      .from('montree_teachers')
      .select('id, classroom_id, school_id, is_active')
      .eq('id', body.recipient.id)
      .maybeSingle();
    if (
      !teacher ||
      !teacher.is_active ||
      teacher.school_id !== parent.schoolId ||
      teacher.classroom_id !== child.classroom_id
    ) {
      return NextResponse.json(
        { error: 'Recipient teacher is not in this child’s classroom' },
        { status: 403 }
      );
    }
    threadType = 'parent_teacher';
  } else {
    const { data: principal } = await supabase
      .from('montree_school_admins')
      .select('id, school_id, is_active')
      .eq('id', body.recipient.id)
      .maybeSingle();
    if (!principal || !principal.is_active || principal.school_id !== parent.schoolId) {
      return NextResponse.json(
        { error: 'Recipient principal is not in your school' },
        { status: 403 }
      );
    }
    threadType = 'parent_principal';
  }

  // Create the thread + participants. createThreadWithParticipants() will
  // auto-add the principal as observer for both parent_teacher and
  // parent_principal types.
  const result = await createThreadWithParticipants(supabase, {
    schoolId: parent.schoolId,
    classroomId: child.classroom_id,
    childId: body.child_id,
    threadType,
    subject: body.subject ? String(body.subject).slice(0, 200) : null,
    createdBy: { role: 'parent', id: parent.parentId },
    participants: [
      {
        role: body.recipient.role,
        id: body.recipient.id,
        isPrimary: true,
        canReply: true,
      },
      // Parent themselves is auto-added as participant by the resolver.
    ],
  });

  if (!result) {
    return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
  }

  // Post the first message immediately so the thread isn't empty when
  // the recipient opens it.
  const { error: msgErr } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: result.id,
      sender_role: 'parent',
      sender_id: parent.parentId,
      sender_name: parent.parentName,
      body: body.body.trim(),
      ai_drafted: false,
    });

  if (msgErr) {
    console.error('[parent thread POST] first-message insert failed', msgErr);
    // Thread row exists; don't 500 the whole request. Caller will see an
    // empty thread and can post manually.
  }

  // Mark the parent as having read their own first message.
  await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', result.id)
    .eq('participant_role', 'parent')
    .eq('participant_id', parent.parentId);

  return NextResponse.json({ thread_id: result.id }, { status: 201 });
}
