// app/api/montree/dashboard/parent-chats/route.ts
//
// 🚨 Session 119 — WeChat-style "by parent" chat aggregation. The existing
// /api/montree/messages/threads endpoint returns one row PER THREAD (a
// per-child or per-topic conversation). This endpoint COLLAPSES every thread
// that involves the same parent into a single row — one chat per parent,
// regardless of which child the original thread was about.
//
// Match the WeChat pattern parents already know: a list of conversations,
// each row showing the other person's name + last snippet + unread badge.
// Tap the row → see all messages with that parent in chronological order,
// across all child contexts.
//
// CROSS-POLLINATION: the caller (teacher OR principal) only sees parents
// linked to children in their school. Filter chain:
//   caller is participant in thread → thread.school_id == caller.school_id
//   → parent participant in that same thread.
//
// AUTH: teachers + principals only. Parents see their own version via
// /api/montree/parent/messages/threads (their existing surface).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

interface ParentChatRow {
  parent_id: string;
  parent_name: string;
  parent_email: string | null;
  last_message_at: string;
  last_snippet: string;
  last_sender_is_me: boolean;
  last_sender_name: string;
  unread_count: number;
  thread_count: number;
  child_names: string[];   // children associated with these threads (de-duplicated)
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabase();

  // ── 1. Find every thread the caller participates in ──────────────────
  const { data: myParticipantRows } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id, last_read_at')
    .eq('participant_role', auth.role)
    .eq('participant_id', auth.userId)
    .is('left_at', null);

  const myThreads = (myParticipantRows || []) as Array<{
    thread_id: string;
    last_read_at: string | null;
  }>;
  if (myThreads.length === 0) {
    return jsonNoStore({ parents: [] as ParentChatRow[] });
  }
  const myThreadIds = myThreads.map(r => r.thread_id);
  const myLastReadByThread = new Map(
    myThreads.map(r => [r.thread_id, r.last_read_at]),
  );

  // ── 2. Pull the threads themselves — verify school + grab child_id ───
  const { data: threadsRaw } = await supabase
    .from('montree_message_threads')
    .select('id, school_id, child_id, thread_type, last_message_at, archived_at')
    .in('id', myThreadIds)
    .eq('school_id', auth.schoolId);

  type ThreadShape = {
    id: string;
    school_id: string;
    child_id: string | null;
    thread_type: string;
    last_message_at: string;
    archived_at: string | null;
  };
  const threadsAll = (threadsRaw || []) as ThreadShape[];
  const threads = threadsAll.filter(t => t.archived_at === null);
  if (threads.length === 0) {
    return jsonNoStore({ parents: [] as ParentChatRow[] });
  }
  const threadById = new Map(threads.map(t => [t.id, t]));
  const validThreadIds = threads.map(t => t.id);

  // ── 3. Pull every parent participant in those threads ────────────────
  const { data: parentParticipantsRaw } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id, participant_id')
    .in('thread_id', validThreadIds)
    .eq('participant_role', 'parent')
    .is('left_at', null);
  const parentParticipants = (parentParticipantsRaw || []) as Array<{
    thread_id: string;
    participant_id: string;
  }>;
  if (parentParticipants.length === 0) {
    return jsonNoStore({ parents: [] as ParentChatRow[] });
  }

  // Map parent_id → set of thread_ids they participate in
  const threadsByParent = new Map<string, Set<string>>();
  for (const row of parentParticipants) {
    if (!threadsByParent.has(row.participant_id)) {
      threadsByParent.set(row.participant_id, new Set());
    }
    threadsByParent.get(row.participant_id)!.add(row.thread_id);
  }

  // ── 4. Pull parent names + email from montree_parents ────────────────
  const parentIds = [...threadsByParent.keys()];
  const { data: parentsRaw } = await supabase
    .from('montree_parents')
    .select('id, name, email')
    .in('id', parentIds);
  const parentInfoById = new Map<string, { name: string; email: string | null }>(
    ((parentsRaw || []) as Array<{ id: string; name: string | null; email: string | null }>).map(
      p => [p.id, { name: p.name || 'Parent', email: p.email }],
    ),
  );

  // ── 5. Pull child names for the threads that have child_id ──────────
  const childIds = [
    ...new Set(threads.map(t => t.child_id).filter((v): v is string => Boolean(v))),
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

  // ── 6. Pull the most-recent message per thread (one query, latest at top) ─
  // Then we'll fold to per-parent stats client-side.
  // 🚨 Schema columns: actual time column is `sent_at` (not created_at), and
  // we must filter out soft-deleted messages (`deleted_at IS NULL`).
  const { data: messagesRaw } = await supabase
    .from('montree_thread_messages')
    .select('thread_id, sender_role, sender_id, sender_name, body, sent_at')
    .in('thread_id', validThreadIds)
    .is('deleted_at', null)
    .order('sent_at', { ascending: false })
    .limit(2000); // generous cap; classrooms have rarely > a few hundred messages
  const messages = (messagesRaw || []) as Array<{
    thread_id: string;
    sender_role: string;
    sender_id: string;
    sender_name: string;
    body: string;
    sent_at: string;
  }>;

  // ── 7. Fold into per-parent rows ─────────────────────────────────────
  const rows: ParentChatRow[] = [];
  for (const [parentId, threadIdSet] of threadsByParent.entries()) {
    const info = parentInfoById.get(parentId);
    if (!info) continue; // parent row missing — skip rather than crash

    const myThreadIdsForParent = [...threadIdSet];
    // Latest message across ALL threads with this parent
    const messagesForParent = messages.filter(m => threadIdSet.has(m.thread_id));
    if (messagesForParent.length === 0) {
      // Edge case: thread exists but has no messages yet — show an "empty"
      // row so the teacher can still tap into it and start.
      const firstThreadId = myThreadIdsForParent[0];
      const fallbackThread = threadById.get(firstThreadId);
      rows.push({
        parent_id: parentId,
        parent_name: info.name,
        parent_email: info.email,
        last_message_at: fallbackThread?.last_message_at || new Date(0).toISOString(),
        last_snippet: '',
        last_sender_is_me: false,
        last_sender_name: '',
        unread_count: 0,
        thread_count: threadIdSet.size,
        child_names: collectChildNames(myThreadIdsForParent, threadById, childNameById),
      });
      continue;
    }
    // First in messagesForParent is the latest because the underlying query
    // is ordered DESC.
    const latest = messagesForParent[0];

    // Unread = messages NOT authored by the caller, whose sent_at is
    // AFTER the caller's last_read_at on THAT thread (one tally per thread).
    let unread = 0;
    for (const m of messagesForParent) {
      if (m.sender_id === auth.userId) continue;
      const lastRead = myLastReadByThread.get(m.thread_id);
      if (!lastRead || new Date(m.sent_at) > new Date(lastRead)) {
        unread += 1;
      }
    }

    rows.push({
      parent_id: parentId,
      parent_name: info.name,
      parent_email: info.email,
      last_message_at: latest.sent_at,
      last_snippet: latest.body.length > 140
        ? latest.body.slice(0, 140).trimEnd() + '…'
        : latest.body,
      last_sender_is_me: latest.sender_id === auth.userId,
      last_sender_name: latest.sender_name,
      unread_count: unread,
      thread_count: threadIdSet.size,
      child_names: collectChildNames(myThreadIdsForParent, threadById, childNameById),
    });
  }

  // Sort by most-recent first
  rows.sort((a, b) =>
    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
  );

  return jsonNoStore({ parents: rows });
}

function collectChildNames(
  threadIds: string[],
  threadById: Map<string, { child_id: string | null }>,
  childNameById: Map<string, string>,
): string[] {
  const out: Set<string> = new Set();
  for (const tid of threadIds) {
    const t = threadById.get(tid);
    if (!t || !t.child_id) continue;
    const name = childNameById.get(t.child_id);
    if (name) out.add(name);
  }
  return [...out].sort();
}

function jsonNoStore<T>(payload: T) {
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
