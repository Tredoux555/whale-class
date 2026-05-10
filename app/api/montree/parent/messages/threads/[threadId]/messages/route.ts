// /api/montree/parent/messages/threads/[threadId]/messages/route.ts
// Session 98 — list messages in a thread + post a reply on the parent side.
//
// CROSS-POLLINATION CONTRACT:
//   - Feature flag check via resolveMessagingParent() (404 if off).
//   - Thread must belong to one of the parent's children.
//   - Parent must be a participant (not just observer — parents are never observers).
//   - Reply enforces can_reply on the parent's participant row.
//
// AI POSTURE:
//   - ai_drafted is ALWAYS false on parent posts. Tracy's drafting tools
//     belong to the principal. Parents have no AI drafting in v1.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingParent } from '@/lib/montree/parent-messaging/access';

export const dynamic = 'force-dynamic';

interface ThreadRow {
  id: string;
  school_id: string;
  child_id: string | null;
}

interface ParticipantRow {
  can_reply: boolean;
  left_at: string | null;
}

/** Verify the parent has access to this thread + return the thread row. */
async function verifyParentThreadAccess(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string,
  parent: { parentId: string; schoolId: string; childIds: string[] }
): Promise<ThreadRow | null> {
  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('id, school_id, child_id')
    .eq('id', threadId)
    .eq('school_id', parent.schoolId)
    .maybeSingle();
  if (!thread) return null;
  const t = thread as ThreadRow;
  if (!t.child_id || !parent.childIds.includes(t.child_id)) return null;

  const { data: part } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('participant_role', 'parent')
    .eq('participant_id', parent.parentId)
    .is('left_at', null)
    .maybeSingle();
  if (!part) return null;

  return t;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const supabase = getSupabase();
  const parent = await resolveMessagingParent(supabase);
  if (parent instanceof NextResponse) return parent;

  const { threadId } = await params;
  const thread = await verifyParentThreadAccess(supabase, threadId, parent);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') || '100'), 500);

  const { data: messages } = await supabase
    .from('montree_thread_messages')
    .select('*')
    .eq('thread_id', threadId)
    .is('deleted_at', null)
    .order('sent_at', { ascending: true })
    .limit(limit);

  return NextResponse.json({ messages: messages || [] });
}

interface PostBody {
  body: string;
  body_locale?: string;
  in_reply_to?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const supabase = getSupabase();
  const parent = await resolveMessagingParent(supabase);
  if (parent instanceof NextResponse) return parent;

  const { threadId } = await params;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.body || typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }
  if (body.body.length > 10000) {
    return NextResponse.json({ error: 'body exceeds 10000 chars' }, { status: 400 });
  }

  const thread = await verifyParentThreadAccess(supabase, threadId, parent);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  // Enforce can_reply on the parent's participant row.
  const { data: part } = await supabase
    .from('montree_message_thread_participants')
    .select('can_reply, left_at')
    .eq('thread_id', threadId)
    .eq('participant_role', 'parent')
    .eq('participant_id', parent.parentId)
    .maybeSingle();
  const partRow = part as ParticipantRow | null;
  if (!partRow || partRow.left_at || !partRow.can_reply) {
    return NextResponse.json({ error: 'You cannot reply to this thread' }, { status: 403 });
  }

  // Insert. ai_drafted is forced false — parents don't get AI drafting in v1.
  const { data: inserted, error } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: threadId,
      sender_role: 'parent',
      sender_id: parent.parentId,
      sender_name: parent.parentName,
      body: body.body.trim(),
      body_locale: body.body_locale || null,
      ai_drafted: false,
      ai_draft_source: null,
      approved_by_id: null,
      in_reply_to: body.in_reply_to || null,
    })
    .select()
    .single();

  if (error || !inserted) {
    console.error('[parent messages POST]', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  // Mark the parent as having read up to and including their own message.
  await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', 'parent')
    .eq('participant_id', parent.parentId);

  return NextResponse.json({ message: inserted }, { status: 201 });
}
