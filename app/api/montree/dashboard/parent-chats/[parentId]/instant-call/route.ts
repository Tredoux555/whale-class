// app/api/montree/dashboard/parent-chats/[parentId]/instant-call/route.ts
//
// 🚨 Session 119 Task 3 — INSTANT CALL.
//
// A teacher (or principal) on the parent-chats stream taps "Call now" and:
//   1. Server creates an Agora appointment scheduled for RIGHT NOW
//      (status=confirmed, provider=agora, 30-min duration).
//   2. Posts a video-call invite message into the parent_teacher thread
//      so the parent sees it in their chat with a Join button.
//   3. Returns the appointment_id so the caller can redirect themselves
//      straight into the call (no calendar bounce).
//
// Voice-only flag: ?audio=1 — the AgoraVideoCall component reads
// audioOnly=true from the call-page URL and skips the camera track.
// Same Agora SDK, same channel, same App ID — no new provider.
//
// Auth: teacher or principal. Cross-pollination: parent must be in
// caller.schoolId. Appointment is school-scoped and ical_token-anchored
// so the existing Agora token route works without any new wiring.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { postVideoCallInvite } from '@/lib/montree/messaging/video-call-invite';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { isAgoraConfigured } from '@/lib/montree/appointments/agora/config';
import { randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INSTANT_DURATION_MIN = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ parentId: string }> },
) {
  const { parentId } = await params;
  if (!UUID_RE.test(parentId)) {
    return NextResponse.json({ error: 'Invalid parent id' }, { status: 400 });
  }

  if (!isAgoraConfigured()) {
    return NextResponse.json(
      { error: 'Video calls are not configured yet.' },
      { status: 503 }
    );
  }

  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Optional body — ?audio=1 also works for the GET-style preference.
  const url = new URL(request.url);
  const audioOnly = url.searchParams.get('audio') === '1';

  const supabase = getSupabase();

  // Feature flag — same gate the scheduled appointments path uses.
  const flagOn = await isFeatureEnabled(supabase, auth.schoolId, 'agora_video_calls');
  if (!flagOn) {
    return NextResponse.json(
      { error: 'Video calls are not enabled for this school yet.' },
      { status: 404 }
    );
  }

  // Verify parent + same school
  const { data: parentRaw } = await supabase
    .from('montree_parents')
    .select('id, name, email, school_id')
    .eq('id', parentId)
    .maybeSingle();
  const parent = parentRaw as {
    id: string;
    name: string | null;
    email: string | null;
    school_id: string;
  } | null;
  if (!parent) {
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
  }
  if (parent.school_id !== auth.schoolId) {
    return NextResponse.json({ error: 'Parent not in your school' }, { status: 403 });
  }

  // Pick a child anchor for the appointment. We just need ANY child in
  // the parent_children junction so the appointment row passes its NOT-NULL
  // FK contract. Instant calls aren't really "about" one child; the chat
  // surface that triggers the call is parent-scoped, not child-scoped.
  const { data: childLinks } = await supabase
    .from('montree_parent_children')
    .select('child_id')
    .eq('parent_id', parentId)
    .limit(1);
  const childIdLink = ((childLinks || []) as Array<{ child_id: string }>)[0]?.child_id;
  if (!childIdLink) {
    return NextResponse.json(
      { error: 'This parent has no linked children — cannot start a call.' },
      { status: 409 }
    );
  }

  // Fetch classroom_id from that child
  const { data: childRow } = await supabase
    .from('montree_children')
    .select('classroom_id')
    .eq('id', childIdLink)
    .maybeSingle();
  const classroomId = (childRow as { classroom_id: string } | null)?.classroom_id ?? null;

  // ── Create the instant appointment ──────────────────────────────────
  // ical_token is the entropy source for the Agora channel name. 24
  // bytes of base64url = ~32 chars; channel uses first 20 chars.
  const icalToken = randomBytes(24).toString('base64url');
  const now = new Date();
  const end = new Date(now.getTime() + INSTANT_DURATION_MIN * 60_000);

  const { data: apptRaw, error: insertErr } = await supabase
    .from('montree_appointments')
    .insert({
      school_id: auth.schoolId,
      classroom_id: classroomId,
      child_id: childIdLink,
      parent_id: parentId,
      event_kind: 'single_host',
      scheduled_start: now.toISOString(),
      scheduled_end: end.toISOString(),
      duration_minutes: INSTANT_DURATION_MIN,
      status: 'confirmed', // skip pending — instant calls are self-confirmed
      intake_subject: audioOnly ? 'Voice call' : 'Video call',
      intake_body: null,
      ical_token: icalToken,
      provider: 'agora',
      recording_enabled: false,
    })
    .select('id')
    .single();

  if (insertErr || !apptRaw) {
    console.error('[instant-call POST] appointment insert failed', insertErr);
    return NextResponse.json(
      { error: 'Could not start the call', detail: insertErr?.message },
      { status: 500 }
    );
  }
  const appointmentId = (apptRaw as { id: string }).id;

  // Add caller as primary host
  const { error: hostErr } = await supabase
    .from('montree_appointment_hosts')
    .insert({
      appointment_id: appointmentId,
      host_role: auth.role,
      host_id: auth.userId,
      is_primary: true,
      is_required: true,
      response: 'accepted',
    });
  if (hostErr) {
    console.error('[instant-call POST] host insert failed', hostErr);
    await supabase.from('montree_appointments').delete().eq('id', appointmentId);
    return NextResponse.json({ error: 'Could not attach host' }, { status: 500 });
  }

  // ── Look up caller name (denormalised for the invite message) ───────
  let callerName: string = auth.role === 'principal' ? 'Principal' : 'Teacher';
  if (auth.role === 'teacher') {
    const { data: row } = await supabase
      .from('montree_teachers').select('name').eq('id', auth.userId).maybeSingle();
    const n = (row as { name?: string | null } | null)?.name;
    if (n) callerName = n;
  } else {
    const { data: row } = await supabase
      .from('montree_school_admins').select('name').eq('id', auth.userId).maybeSingle();
    const n = (row as { name?: string | null } | null)?.name;
    if (n) callerName = n;
  }

  // ── Post the invite message into the parent_teacher thread ──────────
  const callerFirstName = callerName.split(/\s+/)[0] || callerName;
  const caption = audioOnly
    ? `${callerFirstName} is calling you — voice call · tap Join`
    : `${callerFirstName} is calling you — video call · tap Join`;

  // Fire-and-forget so the response time stays snappy. If the post fails,
  // the caller still gets the appointmentId + join URL — the parent just
  // won't see the chat invite (which is graceful).
  void postVideoCallInvite({
    supabase,
    schoolId: auth.schoolId,
    classroomId,
    childId: null, // instant calls aren't child-anchored
    appointmentId,
    caller: { role: auth.role, id: auth.userId, name: callerName },
    parentId,
    caption,
  }).catch((err) => {
    console.error('[instant-call POST] invite post failed (non-fatal):', err);
  });

  return NextResponse.json({
    appointment_id: appointmentId,
    join_url: `/montree/dashboard/calls/${appointmentId}${audioOnly ? '?audio=1' : ''}`,
    parent_join_url: `/montree/parent/calls/${appointmentId}${audioOnly ? '?audio=1' : ''}`,
  });
}
