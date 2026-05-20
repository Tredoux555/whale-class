// /api/montree/super-admin/agent-messages/threads/[threadId]/messages
//
// Phase 4 — super-admin side message list + send.
//
// GET  — list messages in this thread
// POST — Tredoux sends a message. ai_drafted/approved_by_id fields preserved
//        for future Tracy-assisted draft support; currently always
//        ai_drafted=false (set true only when Tracy drafts).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingSuperAdmin } from '@/lib/montree/agent-super-admin-messaging/access';
import {
  isEncryptionEnabledForSchool,
  writeEncryptedField,
  readEncryptedField,
} from '@/lib/montree/messaging-crypto';
import {
  SUPER_ADMIN_SENTINEL_UUID,
  SUPER_ADMIN_DISPLAY_NAME,
} from '@/lib/montree/agent-super-admin-messaging/types';

export const dynamic = 'force-dynamic';

async function verifyThreadIsAgentSuperAdmin(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string
): Promise<boolean> {
  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('thread_type')
    .eq('id', threadId)
    .maybeSingle();
  return (thread as { thread_type: string } | null)?.thread_type === 'agent_super_admin';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabase();
  const sa = await resolveMessagingSuperAdmin(request);
  if (sa instanceof NextResponse) return sa;

  if (!(await verifyThreadIsAgentSuperAdmin(supabase, threadId))) {
    return NextResponse.json({ error: 'Wrong thread type' }, { status: 403 });
  }

  const { data: messages } = await supabase
    // 🚨 Session 121 — pull encryption_version + decrypt for client.
    .from('montree_thread_messages')
    .select('id, sender_role, sender_id, sender_name, body, encryption_version, ai_drafted, ai_draft_source, sent_at, edited_at')
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

interface SendBody {
  body?: string;
  /**
   * Optional — set true when Tracy drafted this message and Tredoux approved
   * it. ai_draft_source can carry the tool name (e.g. 'tracy.draft_agent_reply').
   * Both default to false / null.
   */
  ai_drafted?: boolean;
  ai_draft_source?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabase();
  const sa = await resolveMessagingSuperAdmin(request);
  if (sa instanceof NextResponse) return sa;

  if (!(await verifyThreadIsAgentSuperAdmin(supabase, threadId))) {
    return NextResponse.json({ error: 'Wrong thread type' }, { status: 403 });
  }

  let body: SendBody = {};
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

  const aiDrafted = !!body.ai_drafted;
  const aiDraftSource = aiDrafted && body.ai_draft_source ? String(body.ai_draft_source).slice(0, 120) : null;

  // 🚨 Session 121 — agent_super_admin threads have NULL school_id;
  // isEncryptionEnabledForSchool(null) falls through to default_enabled.
  const encEnabled = await isEncryptionEnabledForSchool(supabase, null);
  const enc = writeEncryptedField(text, encEnabled);
  const { data: msg, error: msgErr } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: threadId,
      sender_role: 'super_admin',
      sender_id: SUPER_ADMIN_SENTINEL_UUID,
      sender_name: SUPER_ADMIN_DISPLAY_NAME,
      body: enc.value,
      encryption_version: enc.version,
      ai_drafted: aiDrafted,
      ai_draft_source: aiDraftSource,
      // approved_by_id stays null — super-admin has no user UUID.
    })
    .select('id, sender_role, sender_id, sender_name, body, encryption_version, ai_drafted, ai_draft_source, sent_at')
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

  // Mark super-admin's last_read_at — they just sent, no unread.
  void supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', 'super_admin')
    .eq('participant_id', SUPER_ADMIN_SENTINEL_UUID)
    .then(({ error }) => {
      if (error) console.error('[super-admin POST msg] last_read update:', error);
    });

  return NextResponse.json({ message: msgDecrypted });
}
