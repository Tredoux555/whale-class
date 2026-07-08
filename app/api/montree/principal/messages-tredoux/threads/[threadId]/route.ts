// /api/montree/principal/messages-tredoux/threads/[threadId]
//
// Migration 292 — principal-side thread detail + mark-read.
//
// GET   — thread metadata (no messages — those live at .../messages)
// PATCH — only action: 'mark_read' (sets last_read_at = NOW)
//
// CROSS-POLLINATION: verifies the principal IS a participant in this specific
// thread before returning anything.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingPrincipal } from '@/lib/montree/agent-super-admin-messaging/principal-access';

export const dynamic = 'force-dynamic';

async function verifyPrincipalInThread(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string,
  principalId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data: part } = await supabase
    .from('montree_message_thread_participants')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('participant_role', 'principal')
    .eq('participant_id', principalId)
    .is('left_at', null)
    .maybeSingle();
  if (!part) return { ok: false, status: 403, error: 'Not a participant in this thread' };
  return { ok: true };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabase();
  const principal = await resolveMessagingPrincipal(request, supabase);
  if (principal instanceof NextResponse) return principal;

  const check = await verifyPrincipalInThread(supabase, threadId, principal.principalId);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('*')
    .eq('id', threadId)
    .eq('thread_type', 'principal_super_admin')
    .maybeSingle();

  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  return NextResponse.json({ thread });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabase();
  const principal = await resolveMessagingPrincipal(request, supabase);
  if (principal instanceof NextResponse) return principal;

  const check = await verifyPrincipalInThread(supabase, threadId, principal.principalId);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  let body: { action?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.action !== 'mark_read') {
    return NextResponse.json(
      { error: "Only action='mark_read' is supported" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', 'principal')
    .eq('participant_id', principal.principalId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
