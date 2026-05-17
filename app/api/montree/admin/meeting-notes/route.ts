// app/api/montree/admin/meeting-notes/route.ts
//
// Principal Meeting Notes CRUD root. GET (list) + POST (save). Per-row
// operations live in the [id] sibling route.
//
// AUTH: principal-only. Every query filters by principal_id + school_id —
// the canonical cross-pollination guard (mirror of the teacher's
// /api/montree/dashboard/conversations/route.ts, but author column is
// principal_id instead of teacher_id).
//
// Backing table: montree_meeting_notes (shared with teacher meeting notes
// via migration 215, which made teacher_id nullable and added principal_id
// with a CHECK that exactly one author is set per row).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

export const maxDuration = 30;

const MAX_SUMMARY_LEN = 8_000; // ~1,500 words
const MAX_TRANSCRIPT_LEN = 30_000;
const MAX_NOTES_LEN = 4_000;
const MAX_CHILD_NAME_LEN = 100;

// ── GET — list this principal's recent meeting notes ──────────────────
export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('montree_meeting_notes')
    .select(
      'id, principal_id, school_id, classroom_id, child_id, child_name, meeting_date, summary, notes, duration_seconds, locale, parent_visible, shared_to_thread_id, created_at, updated_at'
    )
    .eq('principal_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    // 42P01 = relation does not exist. If migration 214 or 215 isn't run yet,
    // surface a clear message instead of 500'ing the page.
    if (error.code === '42P01') {
      return NextResponse.json(
        {
          meetings: [],
          migration_pending: true,
          message:
            'Migration 214 + 215 not yet run — run migrations/214_meeting_notes.sql and migrations/215_meeting_notes_principal_author.sql in Supabase.',
        },
        { status: 200 }
      );
    }
    // 42703 = column does not exist (principal_id missing → migration 215 not run).
    if (error.code === '42703') {
      return NextResponse.json(
        {
          meetings: [],
          migration_pending: true,
          message:
            'Migration 215 not yet run — run migrations/215_meeting_notes_principal_author.sql in Supabase.',
        },
        { status: 200 }
      );
    }
    console.error('[admin/meeting-notes GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to load meeting notes.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ meetings: data || [] });
}

// ── POST — save a new meeting note (principal-authored) ───────────────
export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json({ error: 'Principal-only route.' }, { status: 403 });
  }

  let body: {
    summary?: string;
    transcript?: string;
    notes?: string;
    child_id?: string | null;
    child_name?: string | null;
    meeting_date?: string | null;
    duration_seconds?: number | null;
    locale?: string | null;
    classroom_id?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const summary = (body.summary || '').trim();
  if (!summary) {
    return NextResponse.json({ error: 'summary is required.' }, { status: 400 });
  }
  if (summary.length > MAX_SUMMARY_LEN) {
    return NextResponse.json(
      { error: `summary too long (max ${MAX_SUMMARY_LEN} chars).` },
      { status: 400 }
    );
  }

  const transcript = body.transcript
    ? body.transcript.slice(0, MAX_TRANSCRIPT_LEN)
    : null;
  const notes = body.notes ? body.notes.slice(0, MAX_NOTES_LEN) : null;
  const childName = body.child_name
    ? body.child_name.slice(0, MAX_CHILD_NAME_LEN).trim() || null
    : null;
  const meetingDate = body.meeting_date ? body.meeting_date.slice(0, 10) : null;
  const durationSeconds =
    typeof body.duration_seconds === 'number' && body.duration_seconds >= 0
      ? Math.round(body.duration_seconds)
      : null;
  const locale = body.locale ? body.locale.slice(0, 10) : 'en';
  // Principals don't have a primary classroom — they can attach any classroom
  // in the school, or none.
  const classroomIdInput = body.classroom_id || null;

  const supabase = getSupabase();

  // If a child_id is supplied, verify it belongs to this school. Principal-
  // side scope is wider than teacher-side (no classroom membership check —
  // a principal can record a meeting about any child in their school).
  let childId: string | null = null;
  let resolvedClassroomId: string | null = classroomIdInput;
  if (body.child_id) {
    const { data: child, error: childErr } = await supabase
      .from('montree_children')
      .select('id, classroom_id, classrooms:montree_classrooms!inner(school_id)')
      .eq('id', body.child_id)
      .maybeSingle();
    if (childErr) {
      console.error('[admin/meeting-notes POST] child verify error', childErr);
      return NextResponse.json(
        { error: 'Failed to verify child.' },
        { status: 500 }
      );
    }
    // The child's classroom MUST belong to the principal's school.
    // The join above ensures we can read the parent school_id of the child.
    const childRow = child as unknown as
      | { id: string; classroom_id: string | null; classrooms: { school_id: string } | null }
      | null;
    if (!childRow || !childRow.classrooms || childRow.classrooms.school_id !== auth.schoolId) {
      return NextResponse.json(
        { error: 'Child not found in this school.' },
        { status: 403 }
      );
    }
    childId = childRow.id;
    // Auto-fill classroom from the child if caller didn't specify.
    if (!resolvedClassroomId && childRow.classroom_id) {
      resolvedClassroomId = childRow.classroom_id;
    }
  }

  // If classroom_id was supplied independently of child, verify school
  // membership.
  if (resolvedClassroomId && !childId) {
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', resolvedClassroomId)
      .maybeSingle();
    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json(
        { error: 'Classroom not found in this school.' },
        { status: 403 }
      );
    }
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('montree_meeting_notes')
    .insert({
      school_id: auth.schoolId,
      classroom_id: resolvedClassroomId,
      principal_id: auth.userId,
      teacher_id: null, // explicit — satisfies the meeting_notes_author_check CHECK
      child_id: childId,
      child_name: childName,
      meeting_date: meetingDate,
      summary,
      transcript,
      notes,
      duration_seconds: durationSeconds,
      locale,
      parent_visible: false,
    })
    .select(
      'id, principal_id, school_id, classroom_id, child_id, child_name, meeting_date, summary, notes, duration_seconds, locale, parent_visible, shared_to_thread_id, created_at, updated_at'
    )
    .maybeSingle();

  if (insertErr || !inserted) {
    if (insertErr?.code === '42P01' || insertErr?.code === '42703') {
      return NextResponse.json(
        {
          error:
            'Migrations 214 + 215 must be run in Supabase before principal meeting notes can be saved.',
          migration_pending: true,
        },
        { status: 503 }
      );
    }
    console.error('[admin/meeting-notes POST] insert error', insertErr);
    return NextResponse.json(
      { error: 'Failed to save meeting note.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ meeting: inserted });
}
