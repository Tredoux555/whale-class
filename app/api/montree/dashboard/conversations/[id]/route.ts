// app/api/montree/dashboard/conversations/[id]/route.ts
//
// Single meeting-note GET / PATCH / DELETE. All filtered by teacher_id +
// school_id — a teacher can only touch their own notes.
//
// PATCH supports editing the teacher's free `notes` field, the
// child link / name, and the parent_visible toggle. The summary +
// transcript are immutable once saved (they're the AI output — editing
// them would put the teacher's words in Sonnet's mouth, and break the
// "what was said" trust contract).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTES_LEN = 4_000;
const MAX_CHILD_NAME_LEN = 100;

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
  if (auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_meeting_notes')
    .select(
      'id, teacher_id, school_id, classroom_id, child_id, child_name, meeting_date, summary, transcript, notes, duration_seconds, locale, parent_visible, shared_to_thread_id, created_at, updated_at'
    )
    .eq('id', id)
    .eq('teacher_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();

  if (error) {
    console.error('[meeting-notes/[id] GET] error:', error);
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
  if (auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher-only route.' }, { status: 403 });
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

  // If a new child_id is supplied, verify school membership.
  if (body.child_id !== undefined) {
    if (body.child_id === null) {
      updates.child_id = null;
    } else if (UUID_RE.test(body.child_id)) {
      const { data: child, error: childErr } = await supabase
        .from('montree_children')
        .select('id')
        .eq('id', body.child_id)
        .eq('school_id', auth.schoolId)
        .maybeSingle();
      if (childErr || !child) {
        return NextResponse.json(
          { error: 'Child not found in this school.' },
          { status: 403 }
        );
      }
      updates.child_id = child.id;
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
    .eq('teacher_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .select(
      'id, teacher_id, school_id, classroom_id, child_id, child_name, meeting_date, summary, notes, duration_seconds, locale, parent_visible, shared_to_thread_id, created_at, updated_at'
    )
    .maybeSingle();

  if (error) {
    console.error('[meeting-notes/[id] PATCH] error:', error);
    return NextResponse.json({ error: 'Failed to update.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ meeting: updated });
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
  if (auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('montree_meeting_notes')
    .delete()
    .eq('id', id)
    .eq('teacher_id', auth.userId)
    .eq('school_id', auth.schoolId);

  if (error) {
    console.error('[meeting-notes/[id] DELETE] error:', error);
    return NextResponse.json({ error: 'Failed to delete.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
