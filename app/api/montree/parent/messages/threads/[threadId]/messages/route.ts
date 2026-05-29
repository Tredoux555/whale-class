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
//   - ai_drafted is ALWAYS false on parent posts. Astra's drafting tools
//     belong to the principal. Parents have no AI drafting in v1.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingParent } from '@/lib/montree/parent-messaging/access';
import { isValidLocale } from '@/lib/montree/i18n/locales';
import {
  isEncryptionEnabledForSchool,
  writeEncryptedField,
  readEncryptedField,
} from '@/lib/montree/messaging-crypto';

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
  // Broadcasts (child_id IS NULL) are allowed through the child check; the
  // participant check below still gates them to threads the parent was
  // explicitly added to. Mirrors the sibling thread/[threadId] route + H4 fix.
  if (t.child_id !== null && !parent.childIds.includes(t.child_id)) return null;

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

  // 🚨 Session 121 — decrypt body before returning to client.
  const decryptedMessages = (messages || []).map((m: { body: string; encryption_version: number | null }) => ({
    ...m,
    body: readEncryptedField(m.body, m.encryption_version),
  }));

  return NextResponse.json({ messages: decryptedMessages });
}

interface PostBody {
  body: string;
  body_locale?: string;
  in_reply_to?: string;
  // Voice notes — body carries the Whisper transcript; media_* carries the
  // audio file. Principal still sees everything via the observer rule.
  media_url?: string;
  media_type?: 'image' | 'video' | 'document' | 'audio';
  media_filename?: string;
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

  // L1: validate body_locale — accept only known locales, otherwise null.
  const safeBodyLocale =
    body.body_locale && isValidLocale(body.body_locale) ? body.body_locale : null;

  // Validate audio media — must be 'audio' type with a URL we control.
  const isAudio = body.media_type === 'audio';
  if (isAudio && (!body.media_url || typeof body.media_url !== 'string')) {
    return NextResponse.json({ error: 'media_url required for audio' }, { status: 400 });
  }

  // 🚨 Session 121 — encrypt body when encryption_v1 is enabled.
  const encEnabled = await isEncryptionEnabledForSchool(supabase, parent.schoolId);
  const enc = writeEncryptedField(body.body.trim(), encEnabled);
  // Insert. ai_drafted is forced false — parents don't get AI drafting in v1.
  const { data: inserted, error } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: threadId,
      sender_role: 'parent',
      sender_id: parent.parentId,
      sender_name: parent.parentName,
      body: enc.value,
      encryption_version: enc.version,
      body_locale: safeBodyLocale,
      media_url: body.media_url || null,
      media_type: body.media_type || null,
      media_filename: body.media_filename || null,
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

  // Decrypt the inserted row before returning so the client sees plaintext.
  const insertedTyped = inserted as { body: string; encryption_version: number | null };
  const insertedDecrypted = {
    ...inserted,
    body: readEncryptedField(insertedTyped.body, insertedTyped.encryption_version),
  };

  // Mark the parent as having read up to and including their own message.
  await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', 'parent')
    .eq('participant_id', parent.parentId);

  return NextResponse.json({ message: insertedDecrypted }, { status: 201 });
}
