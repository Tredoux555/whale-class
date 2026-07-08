// /api/montree/super-admin/founding-messages/threads/[threadId]
//
// Migration 292 — super-admin side thread detail + mark-read.
//
// GET   — thread metadata + school name + principal identity
// PATCH — action='mark_read' sets super-admin's last_read_at on this thread

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingSuperAdmin } from '@/lib/montree/agent-super-admin-messaging/access';
import { SUPER_ADMIN_SENTINEL_UUID } from '@/lib/montree/agent-super-admin-messaging/types';

export const dynamic = 'force-dynamic';

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
  const sa = await resolveMessagingSuperAdmin(request);
  if (sa instanceof NextResponse) return sa;

  if (!(await verifyThreadIsPrincipalSuperAdmin(supabase, threadId))) {
    return NextResponse.json({ error: 'Wrong thread type' }, { status: 403 });
  }

  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('*')
    .eq('id', threadId)
    .maybeSingle();

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });

  const threadRow = thread as { school_id: string | null };

  // Pull the principal identity for display.
  const { data: principalPart } = await supabase
    .from('montree_message_thread_participants')
    .select('participant_id')
    .eq('thread_id', threadId)
    .eq('participant_role', 'principal')
    .maybeSingle();

  let principalInfo: { id: string; name: string; email: string | null } | null = null;
  if (principalPart) {
    const principalId = (principalPart as { participant_id: string }).participant_id;
    const { data: p } = await supabase
      .from('montree_school_admins')
      .select('id, name, email')
      .eq('id', principalId)
      .maybeSingle();
    if (p) {
      const row = p as { id: string; name: string | null; email: string | null };
      principalInfo = { id: row.id, name: row.name || row.email || 'Principal', email: row.email };
    }
  }

  // School name for display.
  let schoolName: string | null = null;
  if (threadRow.school_id) {
    const { data: s } = await supabase
      .from('montree_schools')
      .select('name')
      .eq('id', threadRow.school_id)
      .maybeSingle();
    schoolName = (s as { name: string | null } | null)?.name || null;
  }

  return NextResponse.json({ thread, principal: principalInfo, school_name: schoolName });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const supabase = getSupabase();
  const sa = await resolveMessagingSuperAdmin(request);
  if (sa instanceof NextResponse) return sa;

  if (!(await verifyThreadIsPrincipalSuperAdmin(supabase, threadId))) {
    return NextResponse.json({ error: 'Wrong thread type' }, { status: 403 });
  }

  let body: { action?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.action !== 'mark_read') {
    return NextResponse.json({ error: "Only action='mark_read'" }, { status: 400 });
  }

  const { error } = await supabase
    .from('montree_message_thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('participant_role', 'super_admin')
    .eq('participant_id', SUPER_ADMIN_SENTINEL_UUID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
