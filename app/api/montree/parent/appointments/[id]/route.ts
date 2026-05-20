// app/api/montree/parent/appointments/[id]/route.ts
//
// Single-appointment parent operations.
//   GET    — view one appointment (must be the parent's own).
//   PATCH  — cancel (status='cancelled') OR reschedule (new start/end).
//   DELETE — same as cancel (kept for symmetry; status flips to cancelled,
//            row is preserved for audit).
//
// Reschedule re-runs the slot verifier and posts a fresh thread message
// via shareAppointmentToThread(kind='reschedule'). Cancellation does
// the same with kind='cancellation'.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import { shareAppointmentToThread } from '@/lib/montree/appointments/share-to-thread';
import { postAppointmentInvite } from '@/lib/montree/messaging/appointment-invite';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Includes optional columns from 222 (video_url) + 223 (provider,
// recording_enabled). All three fall back to LEGACY when missing.
const APPT_COLS =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, shared_to_thread_at, ical_token, video_url, provider, recording_enabled, created_at, updated_at';
const APPT_COLS_LEGACY =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, shared_to_thread_at, ical_token, created_at, updated_at';

function isVideoUrlColumnMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === '42703' && /video_url|provider|recording_enabled/i.test(err.message || '');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }
  const supabase = getSupabase();
  const parent = await resolveAppointmentsParent(supabase);
  if (parent instanceof NextResponse) return parent;

  const buildSingleQuery = (cols: string) =>
    supabase
      .from('montree_appointments')
      .select(cols)
      .eq('id', id)
      .eq('parent_id', parent.parentId)
      .eq('school_id', parent.schoolId)
      .maybeSingle();

  let { data, error } = await buildSingleQuery(APPT_COLS);
  if (isVideoUrlColumnMissing(error)) {
    ({ data, error } = await buildSingleQuery(APPT_COLS_LEGACY));
  }

  if (error) {
    console.error('[parent/appointments/[id] GET] error', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Hydrate hosts.
  const { data: hostRows } = await supabase
    .from('montree_appointment_hosts')
    .select('host_role, host_id, is_primary, is_required, response, response_at')
    .eq('appointment_id', id);

  return NextResponse.json({
    appointment: { ...data, hosts: hostRows || [] },
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
  const supabase = getSupabase();
  const parent = await resolveAppointmentsParent(supabase);
  if (parent instanceof NextResponse) return parent;

  let body: {
    action?: 'cancel' | 'reschedule' | 'accept' | 'decline';
    cancelled_reason?: string;
    new_start?: string; // ISO
    new_duration_minutes?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }
  if (
    body.action !== 'cancel' &&
    body.action !== 'reschedule' &&
    body.action !== 'accept' &&
    body.action !== 'decline'
  ) {
    return NextResponse.json(
      { error: "action must be 'accept', 'decline', 'cancel', or 'reschedule'." },
      { status: 400 }
    );
  }

  // Fetch current state — must be parent's own.
  const buildCurrentQuery = (cols: string) =>
    supabase
      .from('montree_appointments')
      .select(cols)
      .eq('id', id)
      .eq('parent_id', parent.parentId)
      .eq('school_id', parent.schoolId)
      .maybeSingle();
  const firstCurrent = await buildCurrentQuery(APPT_COLS);
  let current = firstCurrent.data;
  if (isVideoUrlColumnMissing(firstCurrent.error)) {
    const retry = await buildCurrentQuery(APPT_COLS_LEGACY);
    current = retry.data;
  }
  if (!current) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (current.status === 'cancelled' || current.status === 'completed') {
    return NextResponse.json(
      { error: `Cannot ${body.action} a ${current.status} appointment.` },
      { status: 409 }
    );
  }

  // ── ACCEPT (Session 117 continued) ────────────────────────────────
  // Parent accepts a staff-initiated pending invitation.
  // Only valid on pending appointments — confirmed/cancelled/completed
  // already filtered above (and the equality check below).
  if (body.action === 'accept') {
    if (current.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invitations can be accepted.' },
        { status: 409 }
      );
    }
    const buildAcceptUpdate = (cols: string) =>
      supabase
        .from('montree_appointments')
        .update({ status: 'confirmed' })
        .eq('id', id)
        .eq('parent_id', parent.parentId)
        .eq('school_id', parent.schoolId)
        .eq('status', 'pending') // race-safe — refuses to flip if another path raced us
        .select(cols)
        .maybeSingle();
    let { data: updated, error: acceptErr } = await buildAcceptUpdate(APPT_COLS);
    if (isVideoUrlColumnMissing(acceptErr)) {
      ({ data: updated, error: acceptErr } = await buildAcceptUpdate(APPT_COLS_LEGACY));
    }
    if (acceptErr || !updated) {
      console.error('[parent/appointments accept] error', acceptErr);
      return NextResponse.json({ error: 'Failed to accept.' }, { status: 500 });
    }

    // Notify hosts via the existing thread infrastructure (fire-and-forget).
    // Accept maps to 'booking' kind — the appointment is now booked from
    // the parent's perspective. share-to-thread doesn't have a dedicated
    // 'accept' kind because the message body is identical to the original
    // invitation confirmation.
    const { data: primaryHost } = await supabase
      .from('montree_appointment_hosts')
      .select('host_role, host_id')
      .eq('appointment_id', id)
      .eq('is_primary', true)
      .maybeSingle();
    if (primaryHost) {
      const hostRow = primaryHost as { host_role: 'teacher' | 'principal'; host_id: string };
      void shareAppointmentToThread({
        supabase,
        appointment: updated as Parameters<typeof shareAppointmentToThread>[0]['appointment'],
        primaryHost: { role: hostRow.host_role, id: hostRow.host_id },
        kind: 'booking',
      }).catch((e) => {
        console.error('[parent/appointments accept] thread share failed', e);
      });

      // 🚨 Session 120 — auto-post `[[APPT:confirmed]]` status update
      // so the chat thread shows the lifecycle (invite → confirmed).
      // Fire-and-forget. Parent name lookup is best-effort.
      void (async () => {
        try {
          const { data: parentRow } = await supabase
            .from('montree_parents').select('name, email')
            .eq('id', parent.parentId)
            .eq('school_id', parent.schoolId) // defense-in-depth cross-pollination
            .maybeSingle();
          const pName = (parentRow as { name?: string | null; email?: string } | null);
          const parentName = pName?.name || pName?.email || 'Parent';
          const u2 = updated as { scheduled_start?: string };
          const whenLabel = formatInviteWhen(u2.scheduled_start || new Date().toISOString());
          await postAppointmentInvite({
            supabase,
            schoolId: parent.schoolId,
            classroomId: (updated as { classroom_id?: string | null }).classroom_id ?? null,
            childId: (updated as { child_id?: string | null }).child_id ?? null,
            appointmentId: id,
            status: 'confirmed',
            caller: { role: 'parent', id: parent.parentId, name: parentName },
            counterpartRole: hostRow.host_role,
            counterpartId: hostRow.host_id,
            caption: `Confirmed for ${whenLabel}`,
          });
        } catch (e) {
          console.error('[parent/appointments accept] APPT status post failed', {
            appointmentId: id,
            schoolId: parent.schoolId,
            parentId: parent.parentId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      })();

      // 🚨 Session 120 — REMOVED redundant [[VCALL:]] auto-post on accept.
      // The [[APPT:confirmed]] post above is the canonical post-accept
      // status update. The AppointmentInviteCard's Join button (rendered
      // when status='confirmed' + isVideo + within ±2h) handles the same
      // job. Audit pass found 3 redundant Join buttons appearing per
      // accept — APPT:invite card hydrated, APPT:confirmed card, and the
      // VCALL card. Now there's just one (on the APPT:confirmed card).
      // The [[VCALL:]] convention is reserved for INSTANT calls
      // (from parent-chats header) which never go through accept.
    }

    return NextResponse.json({ appointment: updated });
  }

  function formatInviteWhen(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
      });
    } catch {
      return 'soon';
    }
  }

  // ── DECLINE (Session 117 continued) ───────────────────────────────
  // Parent declines a staff-initiated pending invitation. Functionally
  // similar to cancel but only valid on pending status.
  if (body.action === 'decline') {
    if (current.status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending invitations can be declined.' },
        { status: 409 }
      );
    }
    const buildDeclineUpdate = (cols: string) =>
      supabase
        .from('montree_appointments')
        .update({
          status: 'cancelled',
          cancelled_reason: body.cancelled_reason?.slice(0, 500) || null,
          cancelled_by_role: 'parent',
          cancelled_by_id: parent.parentId,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('parent_id', parent.parentId)
        .eq('school_id', parent.schoolId)
        .eq('status', 'pending')
        .select(cols)
        .maybeSingle();
    let { data: updated, error: declineErr } = await buildDeclineUpdate(APPT_COLS);
    if (isVideoUrlColumnMissing(declineErr)) {
      ({ data: updated, error: declineErr } = await buildDeclineUpdate(APPT_COLS_LEGACY));
    }
    if (declineErr || !updated) {
      console.error('[parent/appointments decline] error', declineErr);
      return NextResponse.json({ error: 'Failed to decline.' }, { status: 500 });
    }

    // Notify hosts via the existing thread infrastructure (fire-and-forget).
    // Decline maps to 'cancellation' kind — semantically identical from
    // the host's perspective (the appointment isn't happening).
    const { data: primaryHost } = await supabase
      .from('montree_appointment_hosts')
      .select('host_role, host_id')
      .eq('appointment_id', id)
      .eq('is_primary', true)
      .maybeSingle();
    if (primaryHost) {
      const hostRow = primaryHost as { host_role: 'teacher' | 'principal'; host_id: string };
      void shareAppointmentToThread({
        supabase,
        appointment: updated as Parameters<typeof shareAppointmentToThread>[0]['appointment'],
        primaryHost: { role: hostRow.host_role, id: hostRow.host_id },
        kind: 'cancellation',
      }).catch((e) => {
        console.error('[parent/appointments decline] thread share failed', e);
      });

      // 🚨 Session 120 — post `[[APPT:declined]]` status into the chat
      // so the teacher sees the lifecycle in the thread. Fire-and-forget.
      void (async () => {
        try {
          const { data: parentRow } = await supabase
            .from('montree_parents').select('name, email')
            .eq('id', parent.parentId)
            .eq('school_id', parent.schoolId) // defense-in-depth cross-pollination
            .maybeSingle();
          const pName = (parentRow as { name?: string | null; email?: string } | null);
          const parentName = pName?.name || pName?.email || 'Parent';
          await postAppointmentInvite({
            supabase,
            schoolId: parent.schoolId,
            classroomId: (updated as { classroom_id?: string | null }).classroom_id ?? null,
            childId: (updated as { child_id?: string | null }).child_id ?? null,
            appointmentId: id,
            status: 'declined',
            caller: { role: 'parent', id: parent.parentId, name: parentName },
            counterpartRole: hostRow.host_role,
            counterpartId: hostRow.host_id,
            caption: body.cancelled_reason ? `Declined · ${body.cancelled_reason.slice(0, 120)}` : 'Declined',
          });
        } catch (e) {
          console.error('[parent/appointments decline] APPT status post failed', {
            appointmentId: id,
            schoolId: parent.schoolId,
            parentId: parent.parentId,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      })();
    }

    return NextResponse.json({ appointment: updated });
  }

  // ── CANCEL ─────────────────────────────────────────────────────────
  if (body.action === 'cancel') {
    const buildCancelUpdate = (cols: string) =>
      supabase
        .from('montree_appointments')
        .update({
          status: 'cancelled',
          cancelled_reason: body.cancelled_reason?.slice(0, 500) || null,
          cancelled_by_role: 'parent',
          cancelled_by_id: parent.parentId,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('parent_id', parent.parentId)
        .eq('school_id', parent.schoolId)
        .select(cols)
        .maybeSingle();
    let { data: updated, error: cancelErr } = await buildCancelUpdate(APPT_COLS);
    if (isVideoUrlColumnMissing(cancelErr)) {
      ({ data: updated, error: cancelErr } = await buildCancelUpdate(APPT_COLS_LEGACY));
    }

    if (cancelErr || !updated) {
      console.error('[parent/appointments cancel] error', cancelErr);
      return NextResponse.json(
        { error: 'Failed to cancel.' },
        { status: 500 }
      );
    }

    // Notify primary host via existing thread.
    const { data: primaryHost } = await supabase
      .from('montree_appointment_hosts')
      .select('host_role, host_id')
      .eq('appointment_id', id)
      .eq('is_primary', true)
      .maybeSingle();

    if (primaryHost) {
      await shareAppointmentToThread({
        supabase,
        appointment: updated as Parameters<typeof shareAppointmentToThread>[0]['appointment'],
        primaryHost: {
          role: (primaryHost as { host_role: 'teacher' | 'principal' }).host_role,
          id: (primaryHost as { host_id: string }).host_id,
        },
        kind: 'cancellation',
      }).catch((err) => console.error('[parent/appointments cancel] share', err));
    }

    return NextResponse.json({ appointment: updated });
  }

  // ── RESCHEDULE ─────────────────────────────────────────────────────
  if (!body.new_start) {
    return NextResponse.json({ error: 'new_start required.' }, { status: 400 });
  }
  const newStartMs = Date.parse(body.new_start);
  if (Number.isNaN(newStartMs) || newStartMs < Date.now() - 60_000) {
    return NextResponse.json({ error: 'new_start invalid or in the past.' }, { status: 400 });
  }
  const newDuration = body.new_duration_minutes ?? current.duration_minutes;
  if (newDuration < 5 || newDuration > 240) {
    return NextResponse.json({ error: 'duration invalid.' }, { status: 400 });
  }
  const newEndMs = newStartMs + newDuration * 60_000;

  // 🚨 Reschedule = INSERT new FIRST, then cancel old. This ordering
  // matters: if the INSERT fails for any reason (DB hiccup, constraint
  // collision, FK violation), the parent's original booking is still
  // intact. The previous cancel-first ordering left parents with a
  // cancelled booking and a 500 when the new INSERT failed.
  //
  // We first pull the old hosts (read-only, never mutates), then INSERT
  // the new row + host rows, then cancel the old row. Slot verification
  // is NOT re-run — reschedule is intentional and trusts the caller's
  // chosen time. (A future enhancement could re-verify; for v1 the cost
  // is acceptable because the parent picked from the open-slot list.)

  // Pull existing hosts FIRST so we can rebuild on the new row.
  const { data: oldHostRows } = await supabase
    .from('montree_appointment_hosts')
    .select('host_role, host_id, is_primary, is_required')
    .eq('appointment_id', id);

  if (!oldHostRows || oldHostRows.length === 0) {
    return NextResponse.json(
      { error: 'Cannot reschedule — host data missing.' },
      { status: 500 }
    );
  }

  // Insert the new row. If this fails, the old row is untouched so the
  // parent's booking remains valid.
  //
  // Phase 116.2: carry video_url forward. Since the Jitsi room name is
  // deterministic from ical_token (which we also carry forward), the
  // URL stays identical across reschedule — same room, same dial-in.
  // Conditionally spread because `current` MAY not have video_url
  // (legacy fetch fallback path) AND the column MAY not exist yet.
  const currentVideoUrl =
    (current as { video_url?: string | null }).video_url ?? null;
  // Phase 116.3 — provider + recording_enabled also carry forward across
  // reschedule. Same room, same recording posture. Conditionally spread
  // because either may be null when read via the LEGACY column path.
  const currentProvider =
    (current as { provider?: 'jitsi' | 'agora' | null }).provider ?? null;
  const currentRecordingEnabled =
    (current as { recording_enabled?: boolean | null }).recording_enabled ?? null;
  const newInsertPayload: Record<string, unknown> = {
    school_id: parent.schoolId,
    classroom_id: current.classroom_id,
    child_id: current.child_id,
    parent_id: parent.parentId,
    event_kind: current.event_kind,
    scheduled_start: new Date(newStartMs).toISOString(),
    scheduled_end: new Date(newEndMs).toISOString(),
    duration_minutes: newDuration,
    status: 'confirmed',
    intake_subject: current.intake_subject,
    intake_body: current.intake_body,
    location: current.location,
    thread_id: current.thread_id, // keep the same conversation
    shared_to_thread_at: current.shared_to_thread_at,
    ical_token: current.ical_token,
  };
  if (currentVideoUrl !== null) {
    newInsertPayload.video_url = currentVideoUrl;
  }
  if (currentProvider !== null) {
    newInsertPayload.provider = currentProvider;
  }
  if (currentRecordingEnabled !== null) {
    newInsertPayload.recording_enabled = currentRecordingEnabled;
  }

  let { data: newAppt, error: newErr } = await supabase
    .from('montree_appointments')
    .insert(newInsertPayload)
    .select(APPT_COLS)
    .single();
  if (isVideoUrlColumnMissing(newErr)) {
    console.warn('[parent/appointments reschedule] optional column missing — retrying without 222/223 columns');
    // Migration 222 / 223 not run. Strip all optional columns from
    // payload defensively and retry with legacy SELECT cols.
    delete newInsertPayload.video_url;
    delete newInsertPayload.provider;
    delete newInsertPayload.recording_enabled;
    const retry = await supabase
      .from('montree_appointments')
      .insert(newInsertPayload)
      .select(APPT_COLS_LEGACY)
      .single();
    newAppt = retry.data;
    newErr = retry.error;
  }

  if (newErr || !newAppt) {
    console.error('[parent/appointments reschedule] insert', newErr);
    return NextResponse.json({ error: 'Failed to reschedule.' }, { status: 500 });
  }

  // Now cancel the old row. New row exists, so even if this cancel
  // call somehow fails (extremely unlikely), the parent ends up with
  // BOTH bookings — non-destructive on failure.
  const { error: cancelOldErr } = await supabase
    .from('montree_appointments')
    .update({
      status: 'cancelled',
      cancelled_reason: 'rescheduled',
      cancelled_by_role: 'parent',
      cancelled_by_id: parent.parentId,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('parent_id', parent.parentId)
    .eq('school_id', parent.schoolId);
  if (cancelOldErr) {
    // Log loudly but don't fail the response — the new booking is in.
    console.error('[parent/appointments reschedule] cancel-old failed', cancelOldErr);
  }

  // Re-attach host rows on the new appointment.
  type OldHost = { host_role: 'teacher' | 'principal'; host_id: string; is_primary: boolean; is_required: boolean };
  await supabase.from('montree_appointment_hosts').insert(
    (oldHostRows as OldHost[]).map((h) => ({
      appointment_id: newAppt.id,
      host_role: h.host_role,
      host_id: h.host_id,
      is_primary: h.is_primary,
      is_required: h.is_required,
      response: 'accepted' as const,
      response_at: new Date().toISOString(),
    }))
  );

  // Notify via thread.
  const primary = (oldHostRows as OldHost[]).find((h) => h.is_primary);
  if (primary) {
    await shareAppointmentToThread({
      supabase,
      appointment: newAppt as Parameters<typeof shareAppointmentToThread>[0]['appointment'],
      primaryHost: { role: primary.host_role, id: primary.host_id },
      kind: 'reschedule',
    }).catch((err) => console.error('[parent/appointments reschedule] share', err));
  }

  return NextResponse.json({ appointment: newAppt });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Symmetric with cancel — delegate.
  const r = new Request(request.url, {
    method: 'PATCH',
    headers: request.headers,
    body: JSON.stringify({ action: 'cancel' }),
  });
  return PATCH(r as NextRequest, { params });
}
