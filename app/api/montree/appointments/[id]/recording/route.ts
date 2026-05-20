// app/api/montree/appointments/[id]/recording/route.ts
//
// GET — fetch the recording row for an appointment.
//   - Returns the most-recent recording (one per appointment is normal but
//     allows for re-recording in edge cases).
//   - Staff (host) + principal always see transcript + summary.
//   - Parent sees ONLY when recording_visible_to_parent=true; otherwise
//     gets just the status (so they know it WAS recorded but not content).
//
// PATCH — flip recording_visible_to_parent (staff only).
//   - This is how staff "share the summary" with the parent.
//   - Idempotent — re-flipping has no side effect.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import { readEncryptedField } from '@/lib/montree/messaging-crypto';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const parentResolution = await resolveAppointmentsParent(supabase);

  let callerRole: 'parent' | 'teacher' | 'principal' | null = null;
  let callerId: string | null = null;
  let schoolId: string | null = null;

  if (!(parentResolution instanceof NextResponse)) {
    callerRole = 'parent';
    callerId = parentResolution.parentId;
    schoolId = parentResolution.schoolId;
  } else {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    if (auth.role !== 'teacher' && auth.role !== 'principal') {
      return NextResponse.json({ error: 'Auth required.' }, { status: 403 });
    }
    callerRole = auth.role;
    callerId = auth.userId;
    schoolId = auth.schoolId;
  }

  if (!callerRole || !callerId || !schoolId) {
    return NextResponse.json({ error: 'Auth required.' }, { status: 401 });
  }

  // Verify caller is on this appointment.
  const access = await callerCanAccess(supabase, id, schoolId, callerRole, callerId);
  if (!access) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fetch the most recent recording row.
  // 🚨 Session 121 — pull encryption_version so we decrypt transcript + summary.
  const { data: rec, error } = await supabase
    .from('montree_appointment_recordings')
    .select('id, recording_status, recording_storage_path, recording_duration_seconds, transcript, transcript_locale, summary, summary_locale, encryption_version, recording_visible_to_parent, failure_reason, started_at, ended_at, transcribed_at, summarized_at, created_at')
    .eq('appointment_id', id)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Migration 223 pending → table doesn't exist → recording feature
    // not available. Surface as 'no recording' rather than 500.
    if (error.code === '42P01') {
      return NextResponse.json({ recording: null });
    }
    console.error('[recording GET] error', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }

  if (!rec) {
    return NextResponse.json({ recording: null });
  }

  // Parents only see content when staff has explicitly shared it.
  if (callerRole === 'parent' && !rec.recording_visible_to_parent) {
    return NextResponse.json({
      recording: {
        id: rec.id,
        recording_status: rec.recording_status,
        recording_visible_to_parent: false,
        // No transcript, no summary, no storage path. Parents see "this
        // meeting was recorded" but not the content.
      },
    });
  }

  // 🚨 Session 121 — decrypt transcript + summary before returning. Both
  // columns share the row's encryption_version.
  const recTyped = rec as {
    transcript: string | null;
    summary: string | null;
    encryption_version: number | null;
  };
  const recDecrypted = {
    ...rec,
    transcript: recTyped.transcript ? readEncryptedField(recTyped.transcript, recTyped.encryption_version) : recTyped.transcript,
    summary: recTyped.summary ? readEncryptedField(recTyped.summary, recTyped.encryption_version) : recTyped.summary,
  };

  return NextResponse.json({ recording: recDecrypted });
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
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  let body: { recording_visible_to_parent?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (typeof body.recording_visible_to_parent !== 'boolean') {
    return NextResponse.json(
      { error: 'recording_visible_to_parent (boolean) required.' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Verify staff is a host on this appointment.
  const access = await callerCanAccess(supabase, id, auth.schoolId, auth.role, auth.userId);
  if (!access) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: updated, error } = await supabase
    .from('montree_appointment_recordings')
    .update({ recording_visible_to_parent: body.recording_visible_to_parent })
    .eq('appointment_id', id)
    .eq('school_id', auth.schoolId)
    .select('id, recording_visible_to_parent')
    .maybeSingle();

  if (error) {
    console.error('[recording PATCH] error', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'No recording found.' }, { status: 404 });
  }

  return NextResponse.json({ recording: updated });
}

async function callerCanAccess(
  supabase: ReturnType<typeof getSupabase>,
  appointmentId: string,
  schoolId: string,
  callerRole: 'parent' | 'teacher' | 'principal',
  callerId: string
): Promise<boolean> {
  if (callerRole === 'parent') {
    const { data } = await supabase
      .from('montree_appointments')
      .select('parent_id')
      .eq('id', appointmentId)
      .eq('school_id', schoolId)
      .maybeSingle();
    return (data as { parent_id?: string } | null)?.parent_id === callerId;
  }
  // Principal sees everything in their school.
  if (callerRole === 'principal') {
    const { data } = await supabase
      .from('montree_appointments')
      .select('id')
      .eq('id', appointmentId)
      .eq('school_id', schoolId)
      .maybeSingle();
    return !!data;
  }
  // Teacher must be a host.
  const { data } = await supabase
    .from('montree_appointment_hosts')
    .select('appointment_id, montree_appointments!inner(school_id)')
    .eq('appointment_id', appointmentId)
    .eq('host_role', 'teacher')
    .eq('host_id', callerId)
    .eq('montree_appointments.school_id', schoolId)
    .maybeSingle();
  return !!data;
}
