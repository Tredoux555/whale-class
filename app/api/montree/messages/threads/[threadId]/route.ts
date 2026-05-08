// /api/montree/messages/threads/[threadId]/route.ts
// Session 97 — single thread view + mark-read + archive.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyThreadAccess } from '@/lib/montree/messaging/thread-resolver';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
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

  // Pull participants + child + classroom hydration in parallel.
  const [participantsRes, classroomRes, childRes] = await Promise.all([
    supabase
      .from('montree_message_thread_participants')
      .select('participant_role, participant_id, is_observer, is_primary, can_reply, last_read_at, joined_at, left_at')
      .eq('thread_id', threadId),
    thread.classroom_id
      ? supabase.from('montree_classrooms').select('id, name').eq('id', thread.classroom_id).maybeSingle()
      : Promise.resolve({ data: null }),
    thread.child_id
      ? supabase.from('montree_children').select('id, name, photo_url').eq('id', thread.child_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Hydrate participant names.
  const parts = participantsRes.data || [];
  const teacherIds = parts.filter((p) => p.participant_role === 'teacher').map((p) => p.participant_id);
  const parentIds = parts.filter((p) => p.participant_role === 'parent').map((p) => p.participant_id);
  const principalIds = parts.filter((p) => p.participant_role === 'principal').map((p) => p.participant_id);

  const [teachers, parents, principals] = await Promise.all([
    teacherIds.length
      ? supabase.from('montree_teachers').select('id, name, email').in('id', teacherIds)
      : Promise.resolve({ data: [] }),
    parentIds.length
      ? supabase.from('montree_parents').select('id, name, email').in('id', parentIds)
      : Promise.resolve({ data: [] }),
    principalIds.length
      ? supabase.from('montree_school_admins').select('id, name, email').in('id', principalIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map<string, { name: string; email: string | null }>();
  for (const t of (teachers.data || []) as Array<{ id: string; name: string; email: string }>)
    nameById.set(`teacher:${t.id}`, { name: t.name, email: t.email });
  for (const p of (parents.data || []) as Array<{ id: string; name: string; email: string }>)
    nameById.set(`parent:${p.id}`, { name: p.name || p.email, email: p.email });
  for (const p of (principals.data || []) as Array<{ id: string; name: string; email: string }>)
    nameById.set(`principal:${p.id}`, { name: p.name, email: p.email });

  return NextResponse.json({
    thread,
    classroom: classroomRes.data || null,
    child: childRes.data || null,
    participants: parts.map((p) => ({
      role: p.participant_role,
      id: p.participant_id,
      name: nameById.get(`${p.participant_role}:${p.participant_id}`)?.name || null,
      email: nameById.get(`${p.participant_role}:${p.participant_id}`)?.email || null,
      is_observer: p.is_observer,
      is_primary: p.is_primary,
      can_reply: p.can_reply,
      last_read_at: p.last_read_at,
      joined_at: p.joined_at,
      left_at: p.left_at,
    })),
  });
}

interface PatchBody {
  action: 'mark_read' | 'archive' | 'unarchive';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  const { threadId } = await params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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

  if (body.action === 'mark_read') {
    const partRole = auth.role === 'homeschool_parent' ? 'parent' : auth.role;
    await supabase
      .from('montree_message_thread_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('participant_role', partRole)
      .eq('participant_id', auth.userId);
    return NextResponse.json({ success: true });
  }

  if (body.action === 'archive') {
    if (auth.role !== 'principal' && thread.created_by_id !== auth.userId) {
      return NextResponse.json({ error: 'Only the creator or principal can archive' }, { status: 403 });
    }
    await supabase
      .from('montree_message_threads')
      .update({ archived_at: new Date().toISOString(), archived_by_id: auth.userId })
      .eq('id', threadId);
    return NextResponse.json({ success: true });
  }

  if (body.action === 'unarchive') {
    if (auth.role !== 'principal' && thread.created_by_id !== auth.userId) {
      return NextResponse.json({ error: 'Only the creator or principal can unarchive' }, { status: 403 });
    }
    await supabase
      .from('montree_message_threads')
      .update({ archived_at: null, archived_by_id: null })
      .eq('id', threadId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
