// /api/montree/agent/messages/threads/[threadId]/messages/route.ts
// Session 104 — list messages + post reply for the agent surface.
//
// AI POSTURE: ai_drafted is ALWAYS false on agent posts. Mira drafts emails
// for the agent to send manually elsewhere; she doesn't ghost-write through
// this surface.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingAgent } from '@/lib/montree/agent-messaging/access';
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
}

interface ParticipantRow {
  can_reply: boolean;
  left_at: string | null;
}

async function verifyAgentThreadAccess(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string,
  agent: { agentId: string; schoolIds: string[] }
): Promise<ThreadRow | null> {
  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('id, school_id')
    .eq('id', threadId)
    .in('school_id', agent.schoolIds)
    .maybeSingle();
  if (!thread) return null;

  const { data: part } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('participant_role', 'agent')
    .eq('participant_id', agent.agentId)
    .is('left_at', null)
    .maybeSingle();
  if (!part) return null;

  return thread as ThreadRow;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const supabase = getSupabase();
  const agent = await resolveMessagingAgent(request, supabase);
  if (agent instanceof NextResponse) return agent;

  const { threadId } = await params;
  const thread = await verifyAgentThreadAccess(supabase, threadId, agent);
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

  // 🚨 Session 121 — decrypt body before returning.
  const decrypted = (messages || []).map((m: { body: string; encryption_version: number | null }) => ({
    ...m,
    body: readEncryptedField(m.body, m.encryption_version),
  }));

  return NextResponse.json({ messages: decrypted });
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
  const agent = await resolveMessagingAgent(request, supabase);
  if (agent instanceof NextResponse) return agent;

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

  const thread = await verifyAgentThreadAccess(supabase, threadId, agent);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  const { data: part } = await supabase
    .from('montree_message_thread_participants')
    .select('can_reply, left_at')
    .eq('thread_id', threadId)
    .eq('participant_role', 'agent')
    .eq('participant_id', agent.agentId)
    .maybeSingle();
  const partRow = part as ParticipantRow | null;
  if (!partRow || partRow.left_at || !partRow.can_reply) {
    return NextResponse.json({ error: 'You cannot reply to this thread' }, { status: 403 });
  }

  const safeBodyLocale =
    body.body_locale && isValidLocale(body.body_locale) ? body.body_locale : null;

  // 🚨 Session 121 — encrypt body when encryption_v1 is on for this school.
  const encEnabled = await isEncryptionEnabledForSchool(supabase, thread.school_id);
  const enc = writeEncryptedField(body.body.trim(), encEnabled);
  const { data: inserted, error } = await supabase
    .from('montree_thread_messages')
    .insert({
      thread_id: threadId,
      sender_role: 'agent',
      sender_id: agent.agentId,
      sender_name: agent.agentName,
      body: enc.value,
      encryption_version: enc.version,
      body_locale: safeBodyLocale,
      ai_drafted: false,
      ai_draft_source: null,
      approved_by_id: null,
      in_reply_to: body.in_reply_to || null,
    })
    .select()
    .single();

  if (error || !inserted) {
    console.error('[agent messages POST]', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }

  // Decrypt before returning to client.
  const insertedTyped = inserted as { body: string; encryption_version: number | null };
  const insertedDecrypted = {
    ...inserted,
    body: readEncryptedField(insertedTyped.body, insertedTyped.encryption_version),
  };

  await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', 'agent')
    .eq('participant_id', agent.agentId);

  return NextResponse.json({ message: insertedDecrypted }, { status: 201 });
}
