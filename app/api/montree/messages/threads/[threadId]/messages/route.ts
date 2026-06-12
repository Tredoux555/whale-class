// /api/montree/messages/threads/[threadId]/messages/route.ts
// Session 97 — list messages in a thread + post a new message.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyThreadAccess } from '@/lib/montree/messaging/thread-resolver';
import { isValidLocale } from '@/lib/montree/i18n/locales';
import type { SenderRole } from '@/lib/montree/messaging/types';
import {
  isEncryptionEnabledForSchool,
  writeEncryptedField,
  readEncryptedField,
} from '@/lib/montree/messaging-crypto';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role === 'agent') {
    return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
  }
  const { threadId } = await params;

  const supabase = getSupabase();
  const callerRole = auth.role === 'homeschool_parent' ? 'parent' : auth.role;
  const thread = await verifyThreadAccess(
    supabase,
    threadId,
    auth.schoolId,
    callerRole as 'teacher' | 'principal' | 'parent' | 'agent' | 'homeschool_parent',
    auth.userId
  );
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 404 });
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
  // Plaintext rows (encryption_version NULL) pass through untouched.
  const decryptedMessages = (messages || []).map((m: { body: string; encryption_version: number | null }) => ({
    ...m,
    body: readEncryptedField(m.body, m.encryption_version),
  }));

  return NextResponse.json({ messages: decryptedMessages });
}

interface PostBody {
  body: string;
  body_locale?: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document' | 'audio';
  media_filename?: string;
  ai_drafted?: boolean;
  ai_draft_source?: string;
  in_reply_to?: string;
  /**
   * Reserved field — the server always records `approved_by_id = caller.userId`
   * when `ai_drafted=true` regardless of what the client sends. Kept on the
   * type for forward-compat with surfaces that pass it through.
   */
  approved_by_id?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role === 'agent') {
    return NextResponse.json({ error: 'Agents cannot use messaging' }, { status: 403 });
  }
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
    return NextResponse.json({ error: 'Message body exceeds 10000 chars' }, { status: 400 });
  }

  const supabase = getSupabase();
  const callerRole = auth.role === 'homeschool_parent' ? 'parent' : auth.role;
  const thread = await verifyThreadAccess(
    supabase,
    threadId,
    auth.schoolId,
    callerRole as 'teacher' | 'principal' | 'parent' | 'agent' | 'homeschool_parent',
    auth.userId
  );
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found or access denied' }, { status: 404 });
  }

  // Look up the participant row to enforce can_reply.
  const partRole = auth.role === 'homeschool_parent' ? 'parent' : auth.role;
  if (partRole !== 'principal') {
    const { data: part } = await supabase
      .from('montree_message_thread_participants')
      .select('can_reply, left_at')
      .eq('thread_id', threadId)
      .eq('participant_role', partRole)
      .eq('participant_id', auth.userId)
      .maybeSingle();
    if (!part || part.left_at || !part.can_reply) {
      return NextResponse.json({ error: 'You cannot reply to this thread' }, { status: 403 });
    }
  }

  // Resolve the sender's display name for audit trail.
  let senderName = 'Unknown';
  if (partRole === 'teacher') {
    const { data: t } = await supabase
      .from('montree_teachers')
      .select('name')
      .eq('id', auth.userId)
      .maybeSingle();
    if (t?.name) senderName = t.name;
  } else if (partRole === 'principal') {
    const { data: p } = await supabase
      .from('montree_school_admins')
      .select('name')
      .eq('id', auth.userId)
      .maybeSingle();
    if (p?.name) senderName = p.name;
  } else if (partRole === 'parent') {
    const { data: p } = await supabase
      .from('montree_parents')
      .select('name, email')
      .eq('id', auth.userId)
      .maybeSingle();
    if (p) senderName = p.name || p.email || senderName;
  }

  // ai_drafted only valid when sender is principal.
  const aiDrafted = !!body.ai_drafted && partRole === 'principal';

  // L1: validate body_locale — accept only known locales, otherwise null.
  const safeBodyLocale =
    body.body_locale && isValidLocale(body.body_locale) ? body.body_locale : null;

  // 🚨 Session 121 — encrypt body when encryption_v1 is enabled.
  const encEnabled = await isEncryptionEnabledForSchool(supabase, auth.schoolId);
  const enc = writeEncryptedField(body.body.trim(), encEnabled);
  const { data: inserted, error } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: threadId,
      sender_role: partRole as SenderRole,
      sender_id: auth.userId,
      sender_name: senderName,
      body: enc.value,
      encryption_version: enc.version,
      body_locale: safeBodyLocale,
      media_url: body.media_url || null,
      media_type: body.media_type || null,
      media_filename: body.media_filename || null,
      ai_drafted: aiDrafted,
      ai_draft_source: aiDrafted ? body.ai_draft_source || null : null,
      approved_by_id: aiDrafted ? auth.userId : null,
      in_reply_to: body.in_reply_to || null,
    })
    .select()
    .single();

  if (error || !inserted) {
    console.error('[messages POST]', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  // Return plaintext to the client even though we just encrypted — the
  // client's optimistic UI uses this to swap in the canonical row.
  const insertedTyped = inserted as { body: string; encryption_version: number | null };
  const insertedDecrypted = {
    ...inserted,
    body: readEncryptedField(insertedTyped.body, insertedTyped.encryption_version),
  };

  // Mark this message as read for the sender.
  await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', partRole)
    .eq('participant_id', auth.userId);

  // App Store build (Jun 2026): native push to the OTHER active participants.
  // Notification shows sender + a generic line — never the message body
  // (bodies can be encrypted; lock screens shouldn't leak them anyway).
  try {
    const { data: others } = await supabase
      .from('montree_message_thread_participants')
      .select('participant_role, participant_id')
      .eq('thread_id', threadId)
      .is('left_at', null);
    const recipients = (others || [])
      .filter(
        (p: { participant_role: string; participant_id: string }) =>
          !(p.participant_role === partRole && p.participant_id === auth.userId)
      )
      .map((p: { participant_role: string; participant_id: string }) => ({
        type: (p.participant_role === 'parent'
          ? 'parent'
          : p.participant_role === 'principal'
            ? 'principal'
            : 'teacher') as 'parent' | 'principal' | 'teacher',
        id: p.participant_id,
      }));
    if (recipients.length) {
      const { sendPushToOwners } = await import('@/lib/montree/push/sender');
      // Parents and staff land on different message surfaces — batch per group.
      const parentRecipients = recipients.filter((r) => r.type === 'parent');
      const staffRecipients = recipients.filter((r) => r.type !== 'parent');
      if (parentRecipients.length) {
        void sendPushToOwners(supabase, parentRecipients, {
          title: `💬 ${senderName}`,
          body: 'sent you a new message',
          data: { url: '/montree/parent/messages', type: 'message', threadId },
        });
      }
      if (staffRecipients.length) {
        void sendPushToOwners(supabase, staffRecipients, {
          title: `💬 ${senderName}`,
          body: 'sent you a new message',
          data: { url: '/montree/dashboard/messages', type: 'message', threadId },
        });
      }
    }
  } catch (e) {
    console.error('[messages POST] push dispatch error:', e);
  }

  return NextResponse.json({ message: insertedDecrypted }, { status: 201 });
}
