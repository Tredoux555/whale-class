// /api/montree/parent/messages/threads/[threadId]/route.ts
// Session 98 — single thread view + mark-read for the parent surface.
//
// CROSS-POLLINATION CONTRACT:
//   - Feature flag check via resolveMessagingParent() (404 if off).
//   - Thread must belong to one of the parent's children.
//   - Parent must be a participant in the thread.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveMessagingParent } from '@/lib/montree/parent-messaging/access';

export const dynamic = 'force-dynamic';

interface ThreadRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  thread_type: string;
  subject: string | null;
  group_id: string | null;
  created_by_role: string;
  created_by_id: string;
  created_at: string;
  last_message_at: string;
  archived_at: string | null;
  archived_by_id: string | null;
}

/** Verify the parent has access to this thread. Returns the thread row or null. */
async function verifyParentThreadAccess(
  supabase: ReturnType<typeof getSupabase>,
  threadId: string,
  parent: { parentId: string; schoolId: string; childIds: string[] }
): Promise<ThreadRow | null> {
  const { data: thread } = await supabase
    .from('montree_message_threads')
    .select('*')
    .eq('id', threadId)
    .eq('school_id', parent.schoolId)
    .maybeSingle();
  if (!thread) return null;

  const t = thread as ThreadRow;

  // Thread must be about one of the parent's children — UNLESS it's a
  // broadcast (child_id IS NULL). Broadcasts are gated by the participant
  // check below: the parent must have been added to the thread's participants
  // explicitly (matches the threads LIST endpoint's H4 fix).
  if (t.child_id !== null && !parent.childIds.includes(t.child_id)) return null;

  // Parent must be in the participant list (not just observer of someone
  // else's thread — parents are never observers in this schema).
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
  _request: NextRequest,
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

  // Hydrate participants + child + classroom + appointments in parallel.
  // Appointments: scope by thread_id + this parent's id. The booking message
  // body holds the prose; this gives the front-end a structural CTA target
  // so the "Join video call" button can render inline in the thread.
  const [participantsRes, classroomRes, childRes, appointmentsRes] = await Promise.all([
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
    supabase
      .from('montree_appointments')
      .select('id, scheduled_start, scheduled_end, duration_minutes, status, provider, video_url, location, intake_subject')
      .eq('thread_id', threadId)
      .eq('school_id', parent.schoolId)
      .eq('parent_id', parent.parentId)
      .order('scheduled_start', { ascending: false })
      .limit(20),
  ]);

  // Hydrate participant names.
  const parts = participantsRes.data || [];
  const teacherIds = parts.filter((p) => p.participant_role === 'teacher').map((p) => p.participant_id);
  const parentIds = parts.filter((p) => p.participant_role === 'parent').map((p) => p.participant_id);
  const principalIds = parts.filter((p) => p.participant_role === 'principal').map((p) => p.participant_id);

  const [teachers, parents, principals] = await Promise.all([
    teacherIds.length
      ? supabase.from('montree_teachers').select('id, name').in('id', teacherIds)
      : Promise.resolve({ data: [] }),
    parentIds.length
      ? supabase.from('montree_parents').select('id, name, email').in('id', parentIds)
      : Promise.resolve({ data: [] }),
    principalIds.length
      ? supabase.from('montree_school_admins').select('id, name').in('id', principalIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map<string, string>();
  for (const t of (teachers.data || []) as Array<{ id: string; name: string }>)
    nameById.set(`teacher:${t.id}`, t.name);
  for (const p of (parents.data || []) as Array<{ id: string; name: string; email: string }>)
    nameById.set(`parent:${p.id}`, p.name || p.email);
  for (const p of (principals.data || []) as Array<{ id: string; name: string }>)
    nameById.set(`principal:${p.id}`, p.name);

  // L3: dedupe participants by (role, id) — defensive in case the participant
  // table contains duplicates (e.g. observer + primary inserted as two rows).
  const seen = new Set<string>();
  const dedupedParts: Array<typeof parts[number]> = [];
  for (const p of parts) {
    const key = `${p.participant_role}:${p.participant_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedParts.push(p);
  }

  return NextResponse.json({
    thread,
    classroom: classroomRes.data || null,
    child: childRes.data || null,
    // Soft-fail on appointments query (e.g. if the table doesn't exist yet
    // on a fresh DB) — never block the thread render.
    appointments: Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [],
    participants: dedupedParts.map((p) => ({
      role: p.participant_role,
      id: p.participant_id,
      name: nameById.get(`${p.participant_role}:${p.participant_id}`) || null,
      is_observer: p.is_observer,
      is_primary: p.is_primary,
      can_reply: p.can_reply,
      last_read_at: p.last_read_at,
      joined_at: p.joined_at,
      left_at: p.left_at,
      // is_me convenience flag for the UI
      is_me: p.participant_role === 'parent' && p.participant_id === parent.parentId,
    })),
  });
}

interface PatchBody {
  action: 'mark_read';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const supabase = getSupabase();
  const parent = await resolveMessagingParent(supabase);
  if (parent instanceof NextResponse) return parent;

  const { threadId } = await params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const thread = await verifyParentThreadAccess(supabase, threadId, parent);
  if (!thread) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

  if (body.action === 'mark_read') {
    await supabase
      .from('montree_message_thread_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('participant_role', 'parent')
      .eq('participant_id', parent.parentId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
