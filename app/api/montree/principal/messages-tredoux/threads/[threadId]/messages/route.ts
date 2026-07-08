// /api/montree/principal/messages-tredoux/threads/[threadId]/messages
//
// Migration 292 — principal-side messages list + send.
//
// GET  — paginated message list (oldest first per UX)
// POST — send a reply. ai_drafted is FORCED false on principal posts.
//
// CROSS-POLLINATION: verifies the principal IS a participant before any
// read/write.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingPrincipal } from '@/lib/montree/agent-super-admin-messaging/principal-access';
import {
  isEncryptionEnabledForSchool,
  writeEncryptedField,
  readEncryptedField,
} from '@/lib/montree/messaging-crypto';

export const dynamic = 'force-dynamic';

async function verifyPrincipalInThread(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string,
  principalId: string
): Promise<boolean> {
  const { data: part } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id, can_reply')
    .eq('thread_id', threadId)
    .eq('participant_role', 'principal')
    .eq('participant_id', principalId)
    .is('left_at', null)
    .maybeSingle();
  return !!part;
}

async function verifyThreadIsPrincipalSuperAdmin(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string
): Promise<boolean> {
  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('thread_type')
    .eq('id', threadId)
    .maybeSingle();
  return (thread as { thread_type: string } | null)?.thread_type === 'principal_super_admin';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabase();
  const principal = await resolveMessagingPrincipal(request, supabase);
  if (principal instanceof NextResponse) return principal;

  if (!(await verifyPrincipalInThread(supabase, threadId, principal.principalId))) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }
  if (!(await verifyThreadIsPrincipalSuperAdmin(supabase, threadId))) {
    return NextResponse.json({ error: 'Wrong thread type' }, { status: 403 });
  }

  const { data: messages } = await supabase
    // 🚨 Session 121 — pull encryption_version + decrypt for client.
    .from('montree_thread_messages')
    .select('id, sender_role, sender_id, sender_name, body, encryption_version, ai_drafted, sent_at, edited_at')
    .eq('thread_id', threadId)
    .is('deleted_at', null)
    .order('sent_at', { ascending: true })
    .limit(500);

  const decrypted = (messages || []).map((m: { body: string; encryption_version: number | null }) => ({
    ...m,
    body: readEncryptedField(m.body, m.encryption_version),
  }));

  return NextResponse.json({ messages: decrypted });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabase();
  const principal = await resolveMessagingPrincipal(request, supabase);
  if (principal instanceof NextResponse) return principal;

  if (!(await verifyPrincipalInThread(supabase, threadId, principal.principalId))) {
    return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
  }
  if (!(await verifyThreadIsPrincipalSuperAdmin(supabase, threadId))) {
    return NextResponse.json({ error: 'Wrong thread type' }, { status: 403 });
  }

  let body: { body?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = (body.body || '').trim();
  if (!text) return NextResponse.json({ error: 'body is required' }, { status: 400 });
  if (text.length > 10000) {
    return NextResponse.json({ error: 'body exceeds 10000 chars' }, { status: 400 });
  }

  const encEnabled = await isEncryptionEnabledForSchool(supabase, principal.schoolId);
  const enc = writeEncryptedField(text, encEnabled);
  const { data: msg, error: msgErr } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: threadId,
      sender_role: 'principal',
      sender_id: principal.principalId,
      sender_name: principal.name,
      body: enc.value,
      encryption_version: enc.version,
      ai_drafted: false, // forced — principals never claim AI authorship
    })
    .select('id, sender_role, sender_id, sender_name, body, encryption_version, ai_drafted, sent_at')
    .single();

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  // Decrypt before returning to client.
  const msgTyped = msg as { body: string; encryption_version: number | null };
  const msgDecrypted = {
    ...msg,
    body: readEncryptedField(msgTyped.body, msgTyped.encryption_version),
  };

  // Mark principal's read state — they just sent, so no unread.
  void supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', 'principal')
    .eq('participant_id', principal.principalId)
    .then(({ error }) => {
      if (error) console.error('[principal ↔ tredoux POST msg] last_read update:', error);
    });

  return NextResponse.json({ message: msgDecrypted });
}
