// app/api/montree/admin/parent-meetings/route.ts
//
// Ultimate Tracy Phase B — parent-meetings CRUD.
//
// POST   create a meeting (status='planned' or 'held')
// GET    list meetings for a parent (?parent_id=X) or the school
// PATCH  ?id=X      update lifecycle fields (held_at, status, outcome, etc.)
// DELETE ?id=X      hard-delete (cascades to transcripts + analyses)
//
// SCHOOL-SCOPING + CONSENT GATE
//   Every read/write filters by auth.schoolId. A meeting can only be
//   created against a parent whose school_id matches. The consent gate
//   (montree_parents.recording_consent_on_file) is checked by the
//   recording UI client-side AND enforced server-side at the start of
//   the FIRST transcribe-chunk call (Phase E adds the column).
//
// MIGRATION-AWARE
//   Returns migration_pending=true when migrations 239/240/241 haven't run.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const maxDuration = 30;

const VALID_TYPES = new Set([
  'parent_teacher_conference',
  'intro',
  'escalation',
  'exit',
  'behavioural',
  'progress',
  'other',
]);

const VALID_STATUSES = new Set([
  'planned',
  'held',
  'cancelled',
  'needs_follow_up',
  'closed',
]);

function isMigrationMissing(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return e.code === '42P01' || (e.message ?? '').includes('does not exist');
}

async function verifyParentInSchool(
  supabase: ReturnType<typeof getSupabase>,
  parentId: string,
  schoolId: string
): Promise<{ id: string; school_id: string; name: string | null } | null> {
  const { data } = await supabase
    .from('montree_parents')
    .select('id, school_id, name')
    .eq('id', parentId)
    .eq('school_id', schoolId)
    .maybeSingle();
  return (data as { id: string; school_id: string; name: string | null } | null) ?? null;
}

// ── POST — create meeting ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only principals or teachers can create meetings.' },
      { status: 403 }
    );
  }

  let body: {
    parent_id?: string;
    child_id?: string;
    meeting_type?: string;
    scheduled_at?: string;
    held_at?: string;
    duration_minutes?: number;
    status?: string;
    locale?: string;
    linked_dossier_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parentId = String(body.parent_id || '').trim();
  if (!parentId) {
    return NextResponse.json({ error: 'parent_id is required' }, { status: 400 });
  }
  const meetingType = String(body.meeting_type || 'parent_teacher_conference');
  if (!VALID_TYPES.has(meetingType)) {
    return NextResponse.json({ error: 'invalid meeting_type' }, { status: 400 });
  }
  const status = String(body.status || 'planned');
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  }

  const supabase = getSupabase();
  const parent = await verifyParentInSchool(supabase, parentId, auth.schoolId);
  if (!parent) {
    return NextResponse.json({ error: 'parent not found in this school' }, { status: 404 });
  }

  // Verify child belongs to school if provided.
  const childId: string | null = body.child_id ? String(body.child_id).trim() : null;
  if (childId) {
    const { data: child } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', childId)
      .maybeSingle();
    if (!child) {
      return NextResponse.json({ error: 'child not found' }, { status: 404 });
    }
    // Belt-and-braces school scope.
    if (child.classroom_id) {
      const { data: classroom } = await supabase
        .from('montree_classrooms')
        .select('school_id')
        .eq('id', child.classroom_id)
        .maybeSingle();
      if (!classroom || classroom.school_id !== auth.schoolId) {
        return NextResponse.json({ error: 'child not in this school' }, { status: 403 });
      }
    }
  }

  const payload: Record<string, unknown> = {
    parent_id: parentId,
    child_id: childId,
    school_id: auth.schoolId,
    meeting_type: meetingType,
    status,
    locale: typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : 'en',
    scheduled_at: body.scheduled_at ?? null,
    held_at: body.held_at ?? null,
    duration_minutes:
      typeof body.duration_minutes === 'number' ? body.duration_minutes : null,
    linked_dossier_id: body.linked_dossier_id ?? null,
  };
  if (auth.role === 'principal') {
    payload.principal_id = auth.userId;
  } else if (auth.role === 'teacher') {
    payload.teacher_id = auth.userId;
  }

  try {
    const { data, error } = await supabase
      .from('montree_parent_meetings')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      if (isMigrationMissing(error)) {
        return NextResponse.json({ migration_pending: true }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ meeting: data });
  } catch (err) {
    if (isMigrationMissing(err)) {
      return NextResponse.json({ migration_pending: true }, { status: 200 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}

// ── GET — list meetings ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only principals or teachers can list meetings.' },
      { status: 403 }
    );
  }

  const supabase = getSupabase();
  const url = new URL(request.url);
  const parentId = url.searchParams.get('parent_id') || null;
  const limit = Math.min(50, Number(url.searchParams.get('limit') || '20'));

  let query = supabase
    .from('montree_parent_meetings')
    .select(
      'id, parent_id, child_id, school_id, principal_id, teacher_id, scheduled_at, held_at, duration_minutes, meeting_type, status, locale, outcome_notes, transcript_id, analysis_id, linked_dossier_id, created_at, updated_at'
    )
    .eq('school_id', auth.schoolId)
    .order('held_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (parentId) {
    query = query.eq('parent_id', parentId);
  }

  try {
    const { data, error } = await query;
    if (error) {
      if (isMigrationMissing(error)) {
        return NextResponse.json({ migration_pending: true, meetings: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { meetings: data ?? [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    if (isMigrationMissing(err)) {
      return NextResponse.json({ migration_pending: true, meetings: [] });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}

// ── PATCH — update meeting ─────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal' && auth.role !== 'teacher') {
    return NextResponse.json(
      { error: 'Only principals or teachers can update meetings.' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const meetingId = url.searchParams.get('id') || '';
  if (!meetingId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Verify ownership.
  const { data: existing, error: lookupErr } = await supabase
    .from('montree_parent_meetings')
    .select('id, school_id')
    .eq('id', meetingId)
    .maybeSingle();
  if (lookupErr) {
    if (isMigrationMissing(lookupErr)) {
      return NextResponse.json({ migration_pending: true }, { status: 200 });
    }
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'meeting not found' }, { status: 404 });
  }
  if (existing.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'meeting not in this school' }, { status: 403 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.held_at === 'string') patch.held_at = body.held_at;
  if (typeof body.scheduled_at === 'string') patch.scheduled_at = body.scheduled_at;
  if (typeof body.duration_minutes === 'number') {
    patch.duration_minutes = body.duration_minutes;
  }
  if (typeof body.status === 'string' && VALID_STATUSES.has(body.status)) {
    patch.status = body.status;
  }
  if (typeof body.meeting_type === 'string' && VALID_TYPES.has(body.meeting_type)) {
    patch.meeting_type = body.meeting_type;
  }
  if (typeof body.outcome_notes === 'string') {
    patch.outcome_notes = body.outcome_notes.trim().slice(0, 2000);
  }
  if (typeof body.locale === 'string') {
    patch.locale = body.locale.trim().toLowerCase();
  }
  if (typeof body.linked_dossier_id === 'string') {
    patch.linked_dossier_id = body.linked_dossier_id;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no editable fields in patch' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('montree_parent_meetings')
    .update(patch)
    .eq('id', meetingId)
    .eq('school_id', auth.schoolId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ meeting: data });
}

// ── DELETE — hard delete (cascades) ────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can delete meetings.' },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const meetingId = url.searchParams.get('id') || '';
  if (!meetingId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: existing, error: lookupErr } = await supabase
    .from('montree_parent_meetings')
    .select('id, school_id')
    .eq('id', meetingId)
    .maybeSingle();
  if (lookupErr) {
    if (isMigrationMissing(lookupErr)) {
      return NextResponse.json({ migration_pending: true }, { status: 200 });
    }
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'meeting not found' }, { status: 404 });
  }
  if (existing.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'meeting not in this school' }, { status: 403 });
  }

  const { error } = await supabase
    .from('montree_parent_meetings')
    .delete()
    .eq('id', meetingId)
    .eq('school_id', auth.schoolId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
