// /api/montree/messages/threads/[threadId]/messages/route.ts
// Session 97 — list messages in a thread + post a new message.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyThreadAccess } from '@/lib/montree/messaging/thread-resolver';
import { isValidLocale } from '@/lib/montree/i18n/locales';
import type { SenderRole } from '@/lib/montree/messaging/types';

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

  return NextResponse.json({ messages: messages || [] });
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

  const { data: inserted, error } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: threadId,
      sender_role: partRole as SenderRole,
      sender_id: auth.userId,
      sender_name: senderName,
      body: body.body.trim(),
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

  // Mark this message as read for the sender.
  await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', partRole)
    .eq('participant_id', auth.userId);

  return NextResponse.json({ message: inserted }, { status: 201 });
}
