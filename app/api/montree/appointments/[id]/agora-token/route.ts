// app/api/montree/appointments/[id]/agora-token/route.ts
//
// Mint an Agora publish-side join token for a participant. Called by both:
//   - The parent (when they tap Join on their appointment detail)
//   - The staff host (when they tap Join from AppointmentsCalendar's
//     day-detail panel — the calendar-first UI from Session 117)
//
// AUTH: parent OR staff. We verify the caller is actually a participant
// on this appointment before minting a token — parents must be the
// appointment's parent_id, staff must be in montree_appointment_hosts.
//
// CROSS-POLLINATION: every query filters by school_id AND the caller's
// identity. A staff member at school A cannot mint a token for an
// appointment at school B even if they pass the right id.
//
// FEATURE FLAGS: 'agora_video_calls' must be on for the school AND the
// appointment must have provider='agora'. Else 404 — feature shouldn't
// appear to exist.
//
// MIGRATION-PENDING: if migration 223 hasn't been run (no provider column),
// we treat every appointment as Jitsi and return 404 cleanly.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import {
  channelForAppointment,
  buildJoinToken,
} from '@/lib/montree/appointments/agora/token-builder';
import { isAgoraConfigured } from '@/lib/montree/appointments/agora/config';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
  }

  if (!isAgoraConfigured()) {
    return NextResponse.json(
      { error: 'Video calls are not configured for this server yet.' },
      { status: 503 }
    );
  }

  // Caller can be either parent or staff. Try parent first (cookie-based);
  // if that fails (no parent session), fall through to staff auth.
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
    // Staff path.
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

  // Feature flag check FIRST — return 404 (not 403) when disabled so the
  // feature truly appears not to exist.
  const flagOn = await isFeatureEnabled(supabase, schoolId, 'agora_video_calls');
  if (!flagOn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Pull the appointment — we need ical_token (for channel name) + provider
  // (to verify it's an Agora call, not Jitsi).
  const appt = await fetchAppointmentForCaller(
    supabase,
    id,
    callerRole,
    callerId,
    schoolId
  );
  if (!appt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (appt.provider !== 'agora') {
    return NextResponse.json(
      { error: 'This appointment is not an Agora call.' },
      { status: 404 }
    );
  }
  if (appt.status !== 'confirmed') {
    return NextResponse.json(
      { error: `Cannot join a ${appt.status} appointment.` },
      { status: 409 }
    );
  }

  const channel = channelForAppointment(appt.ical_token);
  if (!channel) {
    return NextResponse.json(
      { error: 'This appointment has no video room.' },
      { status: 500 }
    );
  }

  const token = buildJoinToken({
    channel,
    role: callerRole,
    identityId: callerId,
  });
  if (!token) {
    return NextResponse.json(
      { error: 'Could not mint a token.' },
      { status: 500 }
    );
  }

  // 🚨 Session 120 follow-up — server-side diagnostic log so we can grep
  // Railway logs by appointmentId and see EXACTLY what channel each device
  // resolved. If teacher's log shows channel X but parent's log shows channel
  // Y for the same appointment_id, we have evidence of channel mismatch.
  console.log('[agora-token]', {
    appointmentId: id,
    schoolId,
    callerRole,
    callerId,
    channel: token.channel,
    uid: token.uid,
    icalTokenPrefix: (appt.ical_token || '').slice(0, 8),
  });

  return NextResponse.json({
    appId: token.appId,
    channel: token.channel,
    uid: token.uid,
    token: token.token,
    expiresAt: token.expiresAt,
    recordingEnabled: !!appt.recording_enabled,
  });
}

// ── Helper: pull the appointment scoped to the caller's identity ────
type ApptForToken = {
  id: string;
  status: string;
  provider: string;
  ical_token: string | null;
  recording_enabled: boolean | null;
};

async function fetchAppointmentForCaller(
  supabase: ReturnType<typeof getSupabase>,
  apptId: string,
  callerRole: 'parent' | 'teacher' | 'principal',
  callerId: string,
  schoolId: string
): Promise<ApptForToken | null> {
  // Migration-pending fallback: provider + recording_enabled live on the
  // new 223 columns. If 223 hasn't been run, 42703 surfaces — treat as
  // Jitsi (provider='jitsi') and bail.
  const buildQuery = (cols: string) =>
    supabase
      .from('montree_appointments')
      .select(cols)
      .eq('id', apptId)
      .eq('school_id', schoolId)
      .maybeSingle();

  const res = await buildQuery('id, status, provider, ical_token, recording_enabled');
  if (res.error?.code === '42703' && /provider|recording_enabled/i.test(res.error.message || '')) {
    // Migration 223 pending — appointment can only be Jitsi.
    return null;
  }
  if (res.error || !res.data) return null;

  // Now verify the caller is a legitimate participant.
  if (callerRole === 'parent') {
    // The parent must own the appointment.
    const ownerRes = await supabase
      .from('montree_appointments')
      .select('parent_id')
      .eq('id', apptId)
      .maybeSingle();
    const ownerRow = ownerRes.data as { parent_id: string } | null;
    if (!ownerRow || ownerRow.parent_id !== callerId) return null;
  } else {
    // Staff must be in the hosts junction.
    const hostRes = await supabase
      .from('montree_appointment_hosts')
      .select('appointment_id')
      .eq('appointment_id', apptId)
      .eq('host_role', callerRole)
      .eq('host_id', callerId)
      .maybeSingle();
    if (!hostRes.data) return null;
  }

  return res.data as ApptForToken;
}
