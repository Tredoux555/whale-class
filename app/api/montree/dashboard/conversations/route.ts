// app/api/montree/dashboard/conversations/route.ts
//
// Teacher meeting-notes CRUD root. GET (list) + POST (save new). Per-row
// operations live in the [id] sibling route.
//
// AUTH: teacher-only. Every query filters by teacher_id + school_id —
// the canonical cross-pollination guard.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import {
  isEncryptionEnabledForSchool,
  writeEncryptedField,
  readEncryptedField,
} from '@/lib/montree/messaging-crypto';

export const maxDuration = 30;

// Hard upper bounds. Anything over these is suspect.
const MAX_SUMMARY_LEN = 8_000; // ~1,500 words
const MAX_TRANSCRIPT_LEN = 30_000; // matches transcribe cap
const MAX_NOTES_LEN = 4_000;
const MAX_CHILD_NAME_LEN = 100;

// ── GET — list this teacher's recent meeting notes ────────────────────
export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  // 🚨 Session 121 — pull encryption_version so we decrypt summary/notes.
  const { data, error } = await supabase
    .from('montree_meeting_notes')
    .select(
      'id, teacher_id, school_id, classroom_id, child_id, child_name, meeting_date, summary, notes, encryption_version, duration_seconds, locale, parent_visible, shared_to_thread_id, created_at, updated_at'
    )
    .eq('teacher_id', auth.userId)
    .eq('school_id', auth.schoolId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    // Soft-fail if migration 214 isn't run yet — surface a clear message
    // instead of 500'ing the page.
    if (error.code === '42P01') {
      return NextResponse.json(
        {
          meetings: [],
          migration_pending: true,
          message: 'Migration 214 not yet run — run migrations/214_meeting_notes.sql in Supabase.',
        },
        { status: 200 }
      );
    }
    console.error('[meeting-notes GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to load meeting notes.' },
      { status: 500 }
    );
  }

  // 🚨 Decrypt summary + notes per row. Transcript isn't included in the
  // list response (intentionally — list view shows summary only).
  const decrypted = (data || []).map((m: { summary: string | null; notes: string | null; encryption_version: number | null }) => ({
    ...m,
    summary: readEncryptedField(m.summary, m.encryption_version),
    notes: m.notes ? readEncryptedField(m.notes, m.encryption_version) : null,
  }));

  return NextResponse.json({ meetings: decrypted });
}

// ── POST — save a new meeting note ────────────────────────────────────
//
// Body: {
//   summary: string (required),
//   transcript?: string,
//   notes?: string,
//   child_id?: string (UUID, must belong to this school),
//   child_name?: string,
//   meeting_date?: string (YYYY-MM-DD),
//   duration_seconds?: number,
//   locale?: string,
//   classroom_id?: string (defaults to the teacher's primary classroom),
// }
export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher') {
    return NextResponse.json({ error: 'Teacher-only route.' }, { status: 403 });
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
    return NextResponse.json(
      { error: 'summary is required.' },
      { status: 400 }
    );
  }
  if (summary.length > MAX_SUMMARY_LEN) {
    return NextResponse.json(
      { error: `summary too long (max ${MAX_SUMMARY_LEN} chars).` },
      { status: 400 }
    );
  }

  const transcript = body.transcript ? body.transcript.slice(0, MAX_TRANSCRIPT_LEN) : null;
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
  const classroomId = body.classroom_id || auth.classroomId || null;

  const supabase = getSupabase();

  // If a child_id is supplied, verify it belongs to this school. This is
  // the canonical cross-pollination guard for child-scoped writes.
  let childId: string | null = null;
  if (body.child_id) {
    const { data: child, error: childErr } = await supabase
      .from('montree_children')
      .select('id, school_id, name')
      .eq('id', body.child_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    if (childErr) {
      console.error('[meeting-notes POST] child verify error', childErr);
      return NextResponse.json(
        { error: 'Failed to verify child.' },
        { status: 500 }
      );
    }
    if (!child) {
      return NextResponse.json(
        { error: 'Child not found in this school.' },
        { status: 403 }
      );
    }
    childId = child.id;
  }

  // 🚨 Session 121 — encrypt summary + transcript + notes when encryption_v1
  // is enabled. All three columns share the same encryption_version on the row.
  const encEnabled = await isEncryptionEnabledForSchool(supabase, auth.schoolId);
  const encSummary = writeEncryptedField(summary, encEnabled);
  const encTranscript = transcript ? writeEncryptedField(transcript, encEnabled) : { value: null, version: null };
  const encNotes = notes ? writeEncryptedField(notes, encEnabled) : { value: null, version: null };
  // Row-level encryption_version is whichever non-null version we used. They
  // must agree because we computed them under the same flag, but pick from
  // summary which is always written.
  const rowVersion = encSummary.version;

  const { data: inserted, error: insertErr } = await supabase
    .from('montree_meeting_notes')
    .insert({
      school_id: auth.schoolId,
      classroom_id: classroomId,
      teacher_id: auth.userId,
      child_id: childId,
      child_name: childName,
      meeting_date: meetingDate,
      summary: encSummary.value,
      transcript: encTranscript.value,
      notes: encNotes.value,
      encryption_version: rowVersion,
      duration_seconds: durationSeconds,
      locale,
      parent_visible: false,
    })
    .select(
      'id, teacher_id, school_id, classroom_id, child_id, child_name, meeting_date, summary, notes, encryption_version, duration_seconds, locale, parent_visible, shared_to_thread_id, created_at, updated_at'
    )
    .maybeSingle();

  if (insertErr || !inserted) {
    // Migration not yet run — clear message back to the client.
    if (insertErr?.code === '42P01') {
      return NextResponse.json(
        {
          error: 'Meeting notes table not yet created — Tredoux needs to run migration 214 in Supabase.',
          migration_pending: true,
        },
        { status: 503 }
      );
    }
    console.error('[meeting-notes POST] insert error', insertErr);
    return NextResponse.json(
      { error: 'Failed to save meeting note.' },
      { status: 500 }
    );
  }

  // 🚨 Decrypt the inserted row before returning to the client.
  const insertedTyped = inserted as { summary: string; notes: string | null; encryption_version: number | null };
  const insertedDecrypted = {
    ...inserted,
    summary: readEncryptedField(insertedTyped.summary, insertedTyped.encryption_version),
    notes: insertedTyped.notes ? readEncryptedField(insertedTyped.notes, insertedTyped.encryption_version) : null,
  };

  return NextResponse.json({ meeting: insertedDecrypted });
}
