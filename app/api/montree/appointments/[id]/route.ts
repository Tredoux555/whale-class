// app/api/montree/appointments/[id]/route.ts
//
// Staff-side single-appointment view + actions.
//   GET   — view (must be a host OR a principal in the same school).
//   PATCH — actions:
//             'respond' (host accepts / declines a pending invite)
//             'cancel'  (host or principal cancels — notifies parent)
//             'complete' (host marks the meeting done)
//
// CROSS-POLLINATION:
//   - Teachers can only see / act on appointments they host (junction
//     membership). Principal can see / act on any appointment in their
//     school (transparency rule).

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { shareAppointmentToThread } from '@/lib/montree/appointments/share-to-thread';
import type { StaffRole } from '@/lib/montree/appointments/types';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Includes optional columns from 222 (video_url) + 223 (provider,
// recording_enabled). LEGACY strips all three.
const APPT_COLS =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, shared_to_thread_at, video_url, provider, recording_enabled, created_at, updated_at';
const APPT_COLS_LEGACY =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, shared_to_thread_at, created_at, updated_at';

function isVideoUrlColumnMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === '42703' && /video_url|provider|recording_enabled/i.test(err.message || '');
}

function isStaff(role: string): role is 'teacher' | 'principal' {
  return role === 'teacher' || role === 'principal';
}

async function userCanAccess(
  supabase: ReturnType<typeof getSupabase>,
  apptId: string,
  auth: { role: 'teacher' | 'principal'; userId: string; schoolId: string }
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  // Principal sees everything in their school.
  if (auth.role === 'principal') {
    const { data } = await supabase
      .from('montree_appointments')
      .select('id')
      .eq('id', apptId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    if (!data) return { ok: false, status: 404, error: 'Not found' };
    return { ok: true };
  }
  // Teacher must be a host on this appointment.
  const { data } = await supabase
    .from('montree_appointment_hosts')
    .select('appointment_id, montree_appointments!inner(school_id)')
    .eq('appointment_id', apptId)
    .eq('host_role', 'teacher')
    .eq('host_id', auth.userId)
    .eq('montree_appointments.school_id', auth.schoolId)
    .maybeSingle();
  if (!data) return { ok: false, status: 403, error: 'Not authorized for this appointment.' };
  return { ok: true };
}

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
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const access = await userCanAccess(supabase, id, auth);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const buildApptSingle = (cols: string) =>
    supabase.from('montree_appointments').select(cols).eq('id', id).maybeSingle();
  const [apptResAttempt, hostsRes] = await Promise.all([
    buildApptSingle(APPT_COLS),
    supabase
      .from('montree_appointment_hosts')
      .select('host_role, host_id, is_primary, is_required, response, response_at')
      .eq('appointment_id', id),
  ]);
  let apptRes = apptResAttempt;
  if (isVideoUrlColumnMissing(apptRes.error)) {
    apptRes = await buildApptSingle(APPT_COLS_LEGACY);
  }

  if (!apptRes.data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    appointment: { ...apptRes.data, hosts: hostsRes.data || [] },
  });
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
  if (!isStaff(auth.role)) {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  let body: {
    action?: 'respond' | 'cancel' | 'complete';
    response?: 'accepted' | 'declined' | 'tentative';
    cancelled_reason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (!body.action) {
    return NextResponse.json({ error: 'action required.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const access = await userCanAccess(supabase, id, auth);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  // Fetch current state. Falls back to legacy cols when migration 222
  // hasn't run.
  const buildCurrentFetch = (cols: string) =>
    supabase
      .from('montree_appointments')
      .select(cols)
      .eq('id', id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
  const firstCurrent = await buildCurrentFetch(APPT_COLS);
  let current = firstCurrent.data;
  if (isVideoUrlColumnMissing(firstCurrent.error)) {
    const retry = await buildCurrentFetch(APPT_COLS_LEGACY);
    current = retry.data;
  }
  if (!current) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ── RESPOND ────────────────────────────────────────────────────────
  if (body.action === 'respond') {
    if (!body.response || !['accepted', 'declined', 'tentative'].includes(body.response)) {
      return NextResponse.json({ error: 'response invalid.' }, { status: 400 });
    }
    // A host can update their own row only.
    const { error } = await supabase
      .from('montree_appointment_hosts')
      .update({
        response: body.response,
        response_at: new Date().toISOString(),
      })
      .eq('appointment_id', id)
      .eq('host_role', auth.role)
      .eq('host_id', auth.userId);
    if (error) {
      console.error('[appointments respond] error', error);
      return NextResponse.json({ error: 'Failed to record response.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // ── CANCEL ─────────────────────────────────────────────────────────
  if (body.action === 'cancel') {
    if (current.status === 'cancelled' || current.status === 'completed') {
      return NextResponse.json(
        { error: `Already ${current.status}.` },
        { status: 409 }
      );
    }
    const buildStaffCancel = (cols: string) =>
      supabase
        .from('montree_appointments')
        .update({
          status: 'cancelled',
          cancelled_reason: body.cancelled_reason?.slice(0, 500) || null,
          cancelled_by_role: auth.role,
          cancelled_by_id: auth.userId,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('school_id', auth.schoolId)
        .select(cols)
        .maybeSingle();
    let { data: updated, error: cancelErr } = await buildStaffCancel(APPT_COLS);
    if (isVideoUrlColumnMissing(cancelErr)) {
      ({ data: updated, error: cancelErr } = await buildStaffCancel(APPT_COLS_LEGACY));
    }
    if (cancelErr || !updated) {
      console.error('[appointments cancel] error', cancelErr);
      return NextResponse.json({ error: 'Failed to cancel.' }, { status: 500 });
    }

    // Notify parent via thread.
    const { data: primary } = await supabase
      .from('montree_appointment_hosts')
      .select('host_role, host_id')
      .eq('appointment_id', id)
      .eq('is_primary', true)
      .maybeSingle();
    if (primary) {
      await shareAppointmentToThread({
        supabase,
        appointment: updated as Parameters<typeof shareAppointmentToThread>[0]['appointment'],
        primaryHost: {
          role: (primary as { host_role: StaffRole }).host_role,
          id: (primary as { host_id: string }).host_id,
        },
        kind: 'cancellation',
      }).catch((err) => console.error('[appointments cancel] share', err));
    }

    return NextResponse.json({ appointment: updated });
  }

  // ── COMPLETE ───────────────────────────────────────────────────────
  if (body.action === 'complete') {
    if (current.status === 'cancelled' || current.status === 'completed') {
      return NextResponse.json(
        { error: `Already ${current.status}.` },
        { status: 409 }
      );
    }
    const buildStaffComplete = (cols: string) =>
      supabase
        .from('montree_appointments')
        .update({ status: 'completed' })
        .eq('id', id)
        .eq('school_id', auth.schoolId)
        .select(cols)
        .maybeSingle();
    let { data: updated, error } = await buildStaffComplete(APPT_COLS);
    if (isVideoUrlColumnMissing(error)) {
      ({ data: updated, error } = await buildStaffComplete(APPT_COLS_LEGACY));
    }
    if (error || !updated) {
      console.error('[appointments complete] error', error);
      return NextResponse.json({ error: 'Failed to complete.' }, { status: 500 });
    }
    return NextResponse.json({ appointment: updated });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
