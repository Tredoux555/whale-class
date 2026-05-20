// app/api/montree/admin/meeting-notes/[id]/route.ts
//
// Principal-side single-meeting GET / PATCH / DELETE. Mirror of the teacher
// [id] route, but every query filters by principal_id + school_id.
//
// PATCH supports editing notes / child link / child name / meeting date /
// parent_visible toggle. summary + transcript are IMMUTABLE — editing the
// AI output would put the principal's words in Sonnet's mouth and break
// the "what was said" trust contract.
//
// When parent_visible flips true: shareMeetingNoteToThread() (Session 114
// finisher) posts the summary into a dedicated parent_principal thread via
// the existing Session 97 messaging infrastructure. shared_to_thread_id is
// stamped on the row so re-toggling never double-posts.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { shareMeetingNoteToThread } from '@/lib/montree/meeting-notes/share-to-thread';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTES_LEN = 4_000;
const MAX_CHILD_NAME_LEN = 100;

const SELECT_COLS =
  'id, principal_id, school_id, classroom_id, child_id, child_name, meeting_date, summary, transcript, notes, duration_seconds, locale, parent_visible, shared_to_thread_id, created_at, updated_at';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_meeting_notes')
    .select(SELECT_COLS)
    .eq('id', id)
    .eq('principal_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();

  if (error) {
    console.error('[admin/meeting-notes/[id] GET] error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ meeting: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }

  let body: {
    notes?: string | null;
    child_id?: string | null;
    child_name?: string | null;
    meeting_date?: string | null;
    parent_visible?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.notes !== undefined) {
    updates.notes = body.notes === null ? null : body.notes.slice(0, MAX_NOTES_LEN);
  }
  if (body.child_name !== undefined) {
    updates.child_name =
      body.child_name === null
        ? null
        : body.child_name.slice(0, MAX_CHILD_NAME_LEN).trim() || null;
  }
  if (body.meeting_date !== undefined) {
    updates.meeting_date = body.meeting_date ? body.meeting_date.slice(0, 10) : null;
  }
  if (typeof body.parent_visible === 'boolean') {
    updates.parent_visible = body.parent_visible;
  }

  const supabase = getSupabase();

  // If a new child_id is supplied, verify it belongs to this school via the
  // classroom's school_id (principal scope = entire school).
  if (body.child_id !== undefined) {
    if (body.child_id === null) {
      updates.child_id = null;
    } else if (UUID_RE.test(body.child_id)) {
      const { data: child } = await supabase
        .from('montree_children')
        .select('id, classrooms:montree_classrooms!inner(school_id)')
        .eq('id', body.child_id)
        .maybeSingle();
      const childRow = child as unknown as
        | { id: string; classrooms: { school_id: string } | null }
        | null;
      if (!childRow || !childRow.classrooms || childRow.classrooms.school_id !== auth.schoolId) {
        return NextResponse.json(
          { error: 'Child not found in this school.' },
          { status: 403 }
        );
      }
      updates.child_id = childRow.id;
    } else {
      return NextResponse.json({ error: 'Invalid child_id.' }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No editable fields supplied.' },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabase
    .from('montree_meeting_notes')
    .update(updates)
    .eq('id', id)
    .eq('principal_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .select(SELECT_COLS)
    .maybeSingle();

  if (error) {
    console.error('[admin/meeting-notes/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 🚨 Session 114 finisher — when parent_visible flips true, post the
  // summary into a dedicated parent_principal thread.
  let shareResult: { threadId: string | null; reason?: string; error?: string } | null = null;
  if (
    body.parent_visible === true &&
    updated.parent_visible === true &&
    !updated.shared_to_thread_id
  ) {
    shareResult = await shareMeetingNoteToThread({
      supabase,
      meeting: {
        id: updated.id,
        school_id: updated.school_id,
        classroom_id: updated.classroom_id,
        child_id: updated.child_id,
        child_name: updated.child_name,
        meeting_date: updated.meeting_date,
        summary: updated.summary,
        shared_to_thread_id: updated.shared_to_thread_id,
        locale: updated.locale,
      },
      authorRole: 'principal',
      authorId: auth.userId,
    });
    // Stamp shared_to_thread_id even on partial failure (thread created,
    // message insert failed) so a re-toggle doesn't create a second thread.
    if (shareResult.threadId) {
      const { data: restamped } = await supabase
        .from('montree_meeting_notes')
        .update({ shared_to_thread_id: shareResult.threadId })
        .eq('id', id)
        .eq('principal_id', auth.userId)
        .eq('school_id', auth.schoolId)
        .select(SELECT_COLS)
        .maybeSingle();
      if (restamped) {
        return NextResponse.json({ meeting: restamped, share: shareResult });
      }
    }
  }

  return NextResponse.json({
    meeting: updated,
    ...(shareResult ? { share: shareResult } : {}),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('montree_meeting_notes')
    .delete()
    .eq('id', id)
    .eq('principal_id', auth.userId)
    .eq('school_id', auth.schoolId);

  if (error) {
    console.error('[admin/meeting-notes/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
