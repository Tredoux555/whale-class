// /api/montree/principal/messages-tredoux/threads
//
// Migration 292 — founding school ↔ super-admin threaded messaging.
//
// GET  — list the founding principal's threads with Tredoux
// POST — create a new thread + first message to Tredoux
//
// CROSS-POLLINATION CONTRACT:
//   - GET filters thread_id list to where the principal is a participant AND
//     thread_type='principal_super_admin'.
//   - POST inserts a thread with school_id = the principal's school (populated;
//     the migration-204 gated NULL CHECK only exempts agent_super_admin).
//
// SECURITY:
//   - resolveMessagingPrincipal gates on auth.role='principal' AND
//     founding_member=true.
//
// PRE-MIGRATION SAFETY:
//   - If migration 292 hasn't run, the thread INSERT fails the thread_type
//     CHECK (Postgres code 23514) → we return a clear 503 instead of crashing.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingPrincipal } from '@/lib/montree/agent-super-admin-messaging/principal-access';
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

interface ThreadRow {
  id: string;
  school_id: string | null;
  thread_type: string;
  subject: string | null;
  created_by_role: string;
  created_by_id: string;
  created_at: string;
  last_message_at: string;
  archived_at: string | null;
}

interface MessageRow {
  id: string;
  thread_id: string;
  body: string;
  encryption_version: number | null;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  sent_at: string;
}

interface ParticipantRow {
  thread_id: string;
  last_read_at: string | null;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const principal = await resolveMessagingPrincipal(request, supabase);
  if (principal instanceof NextResponse) return principal;

  // 1. Thread IDs where this principal participates.
  const { data: parts } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('participant_role', 'principal')
    .eq('participant_id', principal.principalId)
    .is('left_at', null);

  const threadIds = ((parts as { thread_id: string }[] | null) || []).map((p) => p.thread_id);
  if (!threadIds.length) return NextResponse.json({ threads: [] });

  // 2. Filter to principal_super_admin threads only.
  const { data: threads } = await supabase
    .from('montree_message_threads')
    .select('*')
    .in('id', threadIds)
    .eq('thread_type', 'principal_super_admin')
    .is('archived_at', null)
    .order('last_message_at', { ascending: false })
    .limit(200);

  const threadRows = ((threads as ThreadRow[] | null) || []);
  if (!threadRows.length) return NextResponse.json({ threads: [] });

  const ids = threadRows.map((t) => t.id);

  // 3. Last message per thread + my last_read_at, in parallel.
  const [lastMessagesRes, myParticipationRes] = await Promise.all([
    supabase
      // 🚨 Session 121 — pull encryption_version for snippet decrypt.
      .from('montree_thread_messages')
      .select('id, thread_id, body, encryption_version, sender_role, sender_id, sender_name, sent_at')
      .in('thread_id', ids)
      .is('deleted_at', null)
      .order('sent_at', { ascending: false })
      .limit(500),
    supabase
      .from('montree_message_thread_participants')
      .select('thread_id, last_read_at')
      .in('thread_id', ids)
      .eq('participant_role', 'principal')
      .eq('participant_id', principal.principalId),
  ]);

  const latestByThread = new Map<string, MessageRow>();
  for (const m of (lastMessagesRes.data as MessageRow[] | null) || []) {
    if (!latestByThread.has(m.thread_id)) {
      // 🚨 Decrypt body so the snippet renders plaintext.
      latestByThread.set(m.thread_id, {
        ...m,
        body: readEncryptedField(m.body, m.encryption_version),
      });
    }
  }

  const lastReadByThread = new Map<string, string | null>();
  for (const r of (myParticipationRes.data as ParticipantRow[] | null) || []) {
    lastReadByThread.set(r.thread_id, r.last_read_at);
  }

  const unreadByThread = new Map<string, number>();
  for (const m of (lastMessagesRes.data as MessageRow[] | null) || []) {
    if (m.sender_id === principal.principalId) continue;
    const lr = lastReadByThread.get(m.thread_id);
    if (!lr || m.sent_at > lr) {
      unreadByThread.set(m.thread_id, (unreadByThread.get(m.thread_id) || 0) + 1);
    }
  }

  const enriched = threadRows.map((t) => {
    const last = latestByThread.get(t.id);
    return {
      id: t.id,
      thread_type: t.thread_type,
      subject: t.subject,
      created_at: t.created_at,
      last_message_at: t.last_message_at,
      last_snippet: last ? last.body.slice(0, 240) : null,
      last_sender_name: last ? last.sender_name : null,
      last_sender_role: last ? last.sender_role : null,
      last_sender_is_me: last ? last.sender_id === principal.principalId : false,
      unread_for_me: unreadByThread.get(t.id) || 0,
    };
  });

  return NextResponse.json({ threads: enriched });
}

interface CreateThreadBody {
  subject?: string | null;
  body: string;
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const principal = await resolveMessagingPrincipal(request, supabase);
  if (principal instanceof NextResponse) return principal;

  let body: CreateThreadBody;
  try {
    body = (await request.json()) as CreateThreadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.body || typeof body.body !== 'string' || !body.body.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }
  if (body.body.length > 10000) {
    return NextResponse.json({ error: 'body exceeds 10000 chars' }, { status: 400 });
  }

  // 1. Create the thread. school_id = the principal's school (populated).
  const { data: threadRaw, error: threadErr } = await supabase
    .from('montree_message_threads')
    .insert({
      school_id: principal.schoolId,
      classroom_id: null,
      child_id: null,
      thread_type: 'principal_super_admin',
      subject: body.subject ? String(body.subject).slice(0, 200) : null,
      created_by_role: 'principal',
      created_by_id: principal.principalId,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (threadErr || !threadRaw) {
    // Pre-migration safety: 23514 = check_violation (thread_type CHECK doesn't
    // yet allow 'principal_super_admin' because migration 292 hasn't run).
    if (threadErr?.code === '23514') {
      console.error('[principal ↔ tredoux POST thread] migration 292 pending', threadErr);
      return NextResponse.json(
        { error: 'Messaging is not available yet — please try again shortly.' },
        { status: 503 }
      );
    }
    console.error('[principal ↔ tredoux POST thread] thread insert failed', threadErr);
    return NextResponse.json(
      { error: 'Failed to create thread', detail: threadErr?.message || 'unknown' },
      { status: 500 }
    );
  }

  const threadId = (threadRaw as { id: string }).id;

  // 2. Add participants — principal + super-admin (sentinel UUID).
  const { error: partErr } = await supabase
    .from('montree_message_thread_participants')
    .insert([
      {
        thread_id: threadId,
        participant_role: 'principal',
        participant_id: principal.principalId,
        can_reply: true,
        is_observer: false,
        is_primary: true,
      },
      {
        thread_id: threadId,
        participant_role: 'super_admin',
        participant_id: SUPER_ADMIN_SENTINEL_UUID,
        can_reply: true,
        is_observer: false,
        is_primary: true,
      },
    ]);

  if (partErr) {
    console.error('[principal ↔ tredoux POST thread] participants insert failed', partErr);
    // Best-effort rollback — delete the just-created thread.
    await supabase.from('montree_message_threads').delete().eq('id', threadId);
    return NextResponse.json(
      { error: 'Failed to add participants', detail: partErr.message },
      { status: 500 }
    );
  }

  // 3. Insert the first message.
  const encEnabled = await isEncryptionEnabledForSchool(supabase, principal.schoolId);
  const enc = writeEncryptedField(body.body.trim(), encEnabled);
  const { error: msgErr } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: threadId,
      sender_role: 'principal',
      sender_id: principal.principalId,
      sender_name: principal.name,
      body: enc.value,
      encryption_version: enc.version,
      ai_drafted: false,
    });

  if (msgErr) {
    console.error('[principal ↔ tredoux POST thread] first-message insert failed', msgErr);
  }

  // 4. Mark the principal's last_read_at to now (they just sent — no unread).
  await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', 'principal')
    .eq('participant_id', principal.principalId);

  // Use SUPER_ADMIN_DISPLAY_NAME so the client can render the recipient label.
  void SUPER_ADMIN_DISPLAY_NAME;

  return NextResponse.json({ thread_id: threadId }, { status: 201 });
}
