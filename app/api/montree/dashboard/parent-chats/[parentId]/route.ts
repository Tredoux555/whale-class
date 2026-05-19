// app/api/montree/dashboard/parent-chats/[parentId]/route.ts
//
// 🚨 Session 119 — per-parent flat chat stream + send. Pairs with the
// /api/montree/dashboard/parent-chats list endpoint.
//
// GET: returns every message across every thread the caller shares with
//      this parent, in chronological order. The teacher experiences a
//      single continuous WeChat-style chat regardless of how many child
//      contexts the underlying threads cover. Each message carries its
//      child_name (when the originating thread had one) so the teacher
//      can still see "this was about Amy" without losing the unified feel.
//
// POST: sends a new message into the MOST RECENT active thread between
//      the caller and parent. If no thread exists, create a new
//      parent_teacher thread (no child anchor — that's fine for the
//      "general chat" use case). This keeps everything inside the
//      existing montree_message_threads infrastructure — no parallel data
//      model — so principal-observer transparency + parent surfaces all
//      keep working unchanged.
//
// CROSS-POLLINATION: thread school_id MUST match caller.schoolId. Parent
// row's school_id MUST match too. Mark-read on GET updates last_read_at
// across every thread shared with this parent.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { createThreadWithParticipants } from '@/lib/montree/messaging/thread-resolver';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_CHARS = 10_000;

interface FlatMessage {
  id: string;
  thread_id: string;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  ai_drafted: boolean;
  child_id: string | null;
  child_name: string | null;
}

// ─── GET ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> },
) {
  const { parentId } = await params;
  if (!UUID_RE.test(parentId)) {
    return NextResponse.json({ error: 'Invalid parent id' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();
  const ctx = await loadParentChatContext(supabase, auth.userId, auth.role, auth.schoolId, parentId);
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  // Fetch the most-recent 5000 messages across shared threads.
  // 🚨 Audit pass 2: must order DESC + limit so the SLICE we get is the
  // newest 5000, not the oldest 5000. (asc+limit would truncate the
  // recent end of a long chat history — exactly wrong for a chat UI.)
  // Then reverse client-side to render chronologically for display.
  const { data: messagesRaw } = await supabase
    .from('montree_thread_messages')
    .select('id, thread_id, sender_role, sender_id, sender_name, body, created_at, ai_drafted')
    .in('thread_id', ctx.sharedThreadIds)
    .order('created_at', { ascending: false })
    .limit(5000);
  const messagesNewestFirst = (messagesRaw || []) as Array<{
    id: string;
    thread_id: string;
    sender_role: string;
    sender_id: string;
    sender_name: string;
    body: string;
    created_at: string;
    ai_drafted: boolean | null;
  }>;
  // Reverse to chronological for the UI feed
  const messages = [...messagesNewestFirst].reverse();

  // Map thread → child for the child_name decoration
  const childIds = [
    ...new Set(ctx.sharedThreads.map(t => t.child_id).filter((v): v is string => Boolean(v))),
  ];
  const childNameById = new Map<string, string>();
  if (childIds.length > 0) {
    const { data: childrenRaw } = await supabase
      .from('montree_children')
      .select('id, name')
      .in('id', childIds);
    for (const c of (childrenRaw || []) as Array<{ id: string; name: string | null }>) {
      if (c.id && c.name) childNameById.set(c.id, c.name);
    }
  }
  const childIdByThread = new Map(ctx.sharedThreads.map(t => [t.id, t.child_id]));

  const flat: FlatMessage[] = messages.map(m => ({
    id: m.id,
    thread_id: m.thread_id,
    sender_role: m.sender_role,
    sender_id: m.sender_id,
    sender_name: m.sender_name,
    body: m.body,
    created_at: m.created_at,
    ai_drafted: !!m.ai_drafted,
    child_id: childIdByThread.get(m.thread_id) ?? null,
    child_name: (() => {
      const cid = childIdByThread.get(m.thread_id);
      return cid ? (childNameById.get(cid) ?? null) : null;
    })(),
  }));

  // Fire-and-forget mark-read for every shared thread.
  const nowIso = new Date().toISOString();
  for (const threadId of ctx.sharedThreadIds) {
    void supabase
      .from('montree_message_thread_participants')
      .update({ last_read_at: nowIso })
      .eq('thread_id', threadId)
      .eq('participant_role', auth.role)
      .eq('participant_id', auth.userId)
      .then(({ error }) => {
        if (error) console.warn('[parent-chats GET] mark-read failed:', error.message);
      });
  }

  return jsonNoStore({
    parent: {
      id: ctx.parent.id,
      name: ctx.parent.name,
      email: ctx.parent.email,
    },
    messages: flat,
    thread_ids: ctx.sharedThreadIds,
  });
}

// ─── POST — send a message ────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> },
) {
  const { parentId } = await params;
  if (!UUID_RE.test(parentId)) {
    return NextResponse.json({ error: 'Invalid parent id' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { body?: string; subject?: string } = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const messageBody = (body.body || '').trim();
  if (!messageBody) {
    return NextResponse.json({ error: 'Body required' }, { status: 400 });
  }
  if (messageBody.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: `Body too long (${MAX_BODY_CHARS} max)` }, { status: 400 });
  }

  const supabase = getSupabase();
  const ctx = await loadParentChatContext(supabase, auth.userId, auth.role, auth.schoolId, parentId);
  if ('error' in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  // Pick target thread: most recently active shared thread.
  let targetThreadId: string | null = null;
  if (ctx.sharedThreads.length > 0) {
    const mostRecent = [...ctx.sharedThreads].sort(
      (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    )[0];
    targetThreadId = mostRecent.id;
  } else {
    // No thread exists yet — spin up a parent_teacher thread without a child
    // anchor (this is a general chat, not pinned to one child).
    // createThreadWithParticipants auto-adds the principal as observer for
    // parent_teacher threads (Session 97 transparency rule), so we don't
    // need to call addPrincipalObserver explicitly here.
    const created = await createThreadWithParticipants(supabase, {
      schoolId: auth.schoolId,
      classroomId: auth.classroomId ?? null,
      childId: null,
      threadType: 'parent_teacher',
      subject: body.subject?.trim() || null,
      createdBy: { role: auth.role, id: auth.userId },
      participants: [
        { role: auth.role, id: auth.userId, canReply: true, isPrimary: true },
        { role: 'parent', id: parentId, canReply: true, isPrimary: false },
      ],
    });
    if (!created) {
      return NextResponse.json(
        { error: 'Could not start a chat with this parent' },
        { status: 500 },
      );
    }
    targetThreadId = created.id;
  }

  // Lookup caller's display name for sender_name (denormalised audit).
  let senderName: string = auth.role === 'principal' ? 'Principal' : 'Teacher';
  if (auth.role === 'teacher') {
    const { data: row } = await supabase
      .from('montree_teachers').select('name').eq('id', auth.userId).maybeSingle();
    const name = (row as { name?: string | null } | null)?.name;
    if (name) senderName = name;
  } else {
    const { data: row } = await supabase
      .from('montree_school_admins').select('name').eq('id', auth.userId).maybeSingle();
    const name = (row as { name?: string | null } | null)?.name;
    if (name) senderName = name;
  }

  const { data: msgRow, error: insertErr } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: targetThreadId,
      sender_role: auth.role,
      sender_id: auth.userId,
      sender_name: senderName,
      body: messageBody,
      ai_drafted: false, // Parent-chats UI is never Tracy-assisted (per Session 97 rule).
    })
    .select('id, thread_id, sender_role, sender_id, sender_name, body, created_at, ai_drafted')
    .maybeSingle();
  if (insertErr || !msgRow) {
    console.error('[parent-chats POST] insert failed:', insertErr?.message);
    return NextResponse.json({ error: 'Could not send', detail: insertErr?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: msgRow, thread_id: targetThreadId });
}

// ─── Helper: load all threads the caller shares with this parent ───
//
// Returns the parent row, the shared thread metadata, and the list of
// thread IDs. Also enforces school-scope on both the caller's threads
// and the parent's row.

interface ParentChatCtxOk {
  parent: { id: string; name: string; email: string | null; school_id: string };
  sharedThreadIds: string[];
  sharedThreads: Array<{
    id: string;
    child_id: string | null;
    last_message_at: string;
    thread_type: string;
  }>;
}
interface ParentChatCtxErr {
  error: string;
  status: number;
}

async function loadParentChatContext(
  supabase: ReturnType<typeof getSupabase>,
  callerId: string,
  callerRole: 'teacher' | 'principal',
  callerSchoolId: string,
  parentId: string,
): Promise<ParentChatCtxOk | ParentChatCtxErr> {
  // Parent row + school-scope check
  const { data: parentRaw } = await supabase
    .from('montree_parents')
    .select('id, name, email, school_id')
    .eq('id', parentId)
    .maybeSingle();
  const parent = parentRaw as { id: string; name: string | null; email: string | null; school_id: string } | null;
  if (!parent) {
    return { error: 'Parent not found', status: 404 };
  }
  if (parent.school_id !== callerSchoolId) {
    return { error: 'Parent not in your school', status: 403 };
  }

  // Caller's threads
  const { data: myParticipantRows } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('participant_role', callerRole)
    .eq('participant_id', callerId)
    .is('left_at', null);
  const myThreadIds = ((myParticipantRows || []) as Array<{ thread_id: string }>).map(r => r.thread_id);
  if (myThreadIds.length === 0) {
    return {
      parent: { id: parent.id, name: parent.name || 'Parent', email: parent.email, school_id: parent.school_id },
      sharedThreadIds: [],
      sharedThreads: [],
    };
  }

  // Parent's threads
  const { data: parentParticipantRows } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('participant_role', 'parent')
    .eq('participant_id', parentId)
    .is('left_at', null);
  const parentThreadIds = new Set(
    ((parentParticipantRows || []) as Array<{ thread_id: string }>).map(r => r.thread_id),
  );

  // Shared = intersection
  const sharedIds = myThreadIds.filter(id => parentThreadIds.has(id));
  if (sharedIds.length === 0) {
    return {
      parent: { id: parent.id, name: parent.name || 'Parent', email: parent.email, school_id: parent.school_id },
      sharedThreadIds: [],
      sharedThreads: [],
    };
  }

  // Verify school-scope on the shared threads (school_id MUST match)
  const { data: threadsRaw } = await supabase
    .from('montree_message_threads')
    .select('id, school_id, child_id, last_message_at, thread_type, archived_at')
    .in('id', sharedIds)
    .eq('school_id', callerSchoolId);
  const sharedThreads = ((threadsRaw || []) as Array<{
    id: string;
    school_id: string;
    child_id: string | null;
    last_message_at: string;
    thread_type: string;
    archived_at: string | null;
  }>).filter(t => t.archived_at === null);

  return {
    parent: { id: parent.id, name: parent.name || 'Parent', email: parent.email, school_id: parent.school_id },
    sharedThreadIds: sharedThreads.map(t => t.id),
    sharedThreads: sharedThreads.map(t => ({
      id: t.id,
      child_id: t.child_id,
      last_message_at: t.last_message_at,
      thread_type: t.thread_type,
    })),
  };
}

function jsonNoStore<T>(payload: T) {
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
