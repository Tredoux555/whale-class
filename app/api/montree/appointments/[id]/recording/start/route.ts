// app/api/montree/appointments/[id]/recording/start/route.ts
//
// Kick off Cloud Recording for an appointment. STAFF-INITIATED only —
// parents can't start recording (they couldn't trust a parent-controlled
// recording switch for child-safety reasons anyway).
//
// FLOW:
//   1. Verify staff is a host on this appointment + flags are on
//   2. Acquire an Agora recording resource
//   3. Build a recording-bot token + start recording
//   4. Insert a recording row with status='recording' + agora ids
//   5. Return identifiers so the client can call /stop later
//
// CONSENT: the caller (staff) must include `consent_acknowledged: true`
// in the body — confirming the parent has been informed. The timestamp
// is recorded on the row for legal review.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { getAgoraRecordingConfig } from '@/lib/montree/appointments/agora/config';
import {
  channelForAppointment,
  buildRecordingToken,
  deriveAgoraUid,
} from '@/lib/montree/appointments/agora/token-builder';
import { acquireRecording, startRecording } from '@/lib/montree/appointments/agora/recording';

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

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  let body: { consent_acknowledged?: boolean };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (!body.consent_acknowledged) {
    return NextResponse.json(
      { error: 'consent_acknowledged required — confirm the parent has been informed.' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();

  // Both flags must be ON: agora_video_calls AND video_recording.
  const [agoraOn, recordingOn] = await Promise.all([
    isFeatureEnabled(supabase, auth.schoolId, 'agora_video_calls'),
    isFeatureEnabled(supabase, auth.schoolId, 'video_recording'),
  ]);
  if (!agoraOn || !recordingOn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const cfg = getAgoraRecordingConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: 'Recording not configured on this server.' },
      { status: 503 }
    );
  }

  // Verify staff is a host on this appointment + pull what we need.
  const hostRes = await supabase
    .from('montree_appointment_hosts')
    .select('appointment_id, montree_appointments!inner(id, status, provider, ical_token, school_id, recording_enabled)')
    .eq('appointment_id', id)
    .eq('host_role', auth.role)
    .eq('host_id', auth.userId)
    .eq('montree_appointments.school_id', auth.schoolId)
    .maybeSingle();

  const hostJoin = hostRes.data as
    | { montree_appointments: { id: string; status: string; provider: string; ical_token: string | null; school_id: string; recording_enabled: boolean | null } | null }
    | null;

  if (!hostJoin?.montree_appointments) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const appt = hostJoin.montree_appointments;
  if (appt.provider !== 'agora') {
    return NextResponse.json({ error: 'Not an Agora appointment.' }, { status: 409 });
  }
  if (!appt.recording_enabled) {
    return NextResponse.json(
      { error: 'Recording was not enabled for this appointment.' },
      { status: 409 }
    );
  }
  if (appt.status !== 'confirmed') {
    return NextResponse.json(
      { error: `Cannot record a ${appt.status} appointment.` },
      { status: 409 }
    );
  }

  // ── Idempotency guard ──────────────────────────────────────────────
  // If a recording is already running for this appointment, return that
  // row instead of starting another. Prevents the "double-click Record →
  // two parallel Agora recordings + 2x billing" failure mode.
  //
  // We check both 'recording' AND 'pending' states. 'pending' is unused
  // by the current pipeline but reserved for future async-start flows;
  // belt-and-braces against future regressions.
  const { data: existing } = await supabase
    .from('montree_appointment_recordings')
    .select('id, agora_resource_id, agora_sid, recording_status, started_at')
    .eq('appointment_id', id)
    .eq('school_id', auth.schoolId)
    .in('recording_status', ['recording', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        recording: existing,
        already_running: true,
      },
      { status: 200 }
    );
  }

  const channel = channelForAppointment(appt.ical_token);
  if (!channel) {
    return NextResponse.json({ error: 'No video room for this appointment.' }, { status: 500 });
  }

  // Recording-bot UID + token.
  const recordingBotUid = deriveAgoraUid('recording-bot', channel);
  const recordingBotToken = buildRecordingToken(channel);
  if (!recordingBotToken) {
    return NextResponse.json({ error: 'Could not mint recording token.' }, { status: 500 });
  }

  // Step 1 — acquire.
  const acquired = await acquireRecording({ channel, recordingBotUid });
  if (!acquired.ok || !acquired.data) {
    return NextResponse.json(
      { error: `Agora acquire failed: ${acquired.error || 'unknown'}` },
      { status: 502 }
    );
  }

  // Storage S3 credentials. These are SEPARATE from Agora customer keys.
  // They're the Supabase Storage project's S3-compatible credentials.
  const storageAccessKey = process.env.SUPABASE_S3_ACCESS_KEY;
  const storageSecretKey = process.env.SUPABASE_S3_SECRET_KEY;
  const storageEndpoint = process.env.SUPABASE_S3_ENDPOINT;
  const storageRegion = process.env.SUPABASE_S3_REGION || 'us-east-1';
  if (!storageAccessKey || !storageSecretKey || !storageEndpoint) {
    return NextResponse.json(
      { error: 'Recording storage not configured (SUPABASE_S3_* env vars missing).' },
      { status: 503 }
    );
  }

  const started = await startRecording({
    channel,
    channelToken: recordingBotToken.token,
    recordingBotUid,
    resourceId: acquired.data.resourceId,
    storageBucket: cfg.recordingBucket,
    storagePathPrefix: `recordings/${id}`,
    storageAccessKey,
    storageSecretKey,
    storageRegion,
    storageEndpoint,
  });
  if (!started.ok || !started.data) {
    return NextResponse.json(
      { error: `Agora start failed: ${started.error || 'unknown'}` },
      { status: 502 }
    );
  }

  // Persist the recording row.
  const { data: row, error: insertErr } = await supabase
    .from('montree_appointment_recordings')
    .insert({
      appointment_id: id,
      school_id: auth.schoolId,
      recording_provider: 'agora',
      agora_channel_name: channel,
      agora_resource_id: started.data.resourceId,
      agora_sid: started.data.sid,
      agora_uid: String(recordingBotUid),
      recording_status: 'recording',
      started_at: new Date().toISOString(),
      consent_acknowledged_at: new Date().toISOString(),
    })
    .select('id, agora_resource_id, agora_sid, recording_status, started_at')
    .single();

  if (insertErr) {
    // Recording IS running on Agora's side now. Log loudly so ops can
    // manually stop it via the REST API. We don't auto-stop because the
    // user may want to keep the meeting going even if our row insert failed.
    console.error('[recording/start] insert failed but Agora started:', insertErr);
    return NextResponse.json(
      { error: 'Recording started on Agora but DB persist failed. Contact support.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ recording: row });
}
