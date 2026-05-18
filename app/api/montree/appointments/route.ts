// app/api/montree/appointments/route.ts
//
// Staff-side appointment endpoints. Scope depends on auth.role:
//   teacher   — sees / creates appointments where THEY are a host.
//   principal — sees every appointment in their school (transparency rule);
//               creates with self as primary host + optional additional teachers.
//
// GET  — list appointments (scope by role; see above)
// POST — Session 117 (continued) — staff-initiated invitation. Creates an
//        appointment with status='pending'. The parent (and any additional
//        invited teachers) accept or decline via their own surfaces.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { generateJitsiUrl } from '@/lib/montree/appointments/video';
import { randomBytes } from 'node:crypto';
import type { StaffRole } from '@/lib/montree/appointments/types';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Includes optional columns from 222 (video_url) + 223 (provider,
// recording_enabled). LEGACY fallback strips all three.
const APPT_COLS =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, video_url, provider, recording_enabled, created_at, updated_at';
const APPT_COLS_LEGACY =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, created_at, updated_at';

function isVideoUrlColumnMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === '42703' && /video_url|provider|recording_enabled/i.test(err.message || '');
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'appointments');
  if (!enabled) {
    return NextResponse.json({ appointments: [], feature_disabled: true });
  }

  const { searchParams } = new URL(request.url);
  const includePast = searchParams.get('include_past') === '1';
  const cutoffIso = includePast
    ? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // ── Pull the appointment IDs the caller can see ────────────────────
  let apptIds: string[] = [];
  if (auth.role === 'principal') {
    // Principal sees every appointment in their school.
    const { data, error } = await supabase
      .from('montree_appointments')
      .select('id')
      .eq('school_id', auth.schoolId)
      .gte('scheduled_start', cutoffIso)
      .order('scheduled_start', { ascending: true })
      .limit(500);
    if (error && error.code === '42P01') {
      return NextResponse.json({
        appointments: [],
        migration_pending: true,
      });
    }
    if (error) {
      console.error('[appointments GET principal] error', error);
      return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
    apptIds = (data || []).map((r: { id: string }) => r.id);
  } else {
    // Teacher — appointments where they're a host.
    const { data: hostRows, error } = await supabase
      .from('montree_appointment_hosts')
      .select('appointment_id')
      .eq('host_role', auth.role)
      .eq('host_id', auth.userId);
    if (error && error.code === '42P01') {
      return NextResponse.json({
        appointments: [],
        migration_pending: true,
      });
    }
    if (error) {
      console.error('[appointments GET teacher] hosts query', error);
      return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
    apptIds = (hostRows || []).map((r: { appointment_id: string }) => r.appointment_id);
  }

  if (apptIds.length === 0) {
    return NextResponse.json({ appointments: [] });
  }

  // ── Hydrate appointment rows + hosts + parent names ────────────────
  const buildApptsHydrate = (cols: string) =>
    supabase
      .from('montree_appointments')
      .select(cols)
      .in('id', apptIds)
      .eq('school_id', auth.schoolId)
      .gte('scheduled_start', cutoffIso)
      .order('scheduled_start', { ascending: true });

  const [apptsResAttempt, hostsRes] = await Promise.all([
    buildApptsHydrate(APPT_COLS),
    supabase
      .from('montree_appointment_hosts')
      .select('appointment_id, host_role, host_id, is_primary, is_required, response')
      .in('appointment_id', apptIds),
  ]);
  let apptsRes = apptsResAttempt;
  if (isVideoUrlColumnMissing(apptsRes.error)) {
    console.warn('[appointments GET] video_url column missing — migration 222 pending');
    apptsRes = await buildApptsHydrate(APPT_COLS_LEGACY);
  }
  if (apptsRes.error) {
    console.error('[appointments GET] hydrate error', apptsRes.error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
  const appts = apptsRes.data || [];

  // Hydrate parent + child + host names.
  const parentIds = new Set<string>();
  const childIds = new Set<string>();
  type ApptRow = { id: string; parent_id: string; child_id: string | null };
  for (const a of appts as ApptRow[]) {
    parentIds.add(a.parent_id);
    if (a.child_id) childIds.add(a.child_id);
  }
  const teacherIds = new Set<string>();
  const principalIds = new Set<string>();
  type HostRow = { appointment_id: string; host_role: StaffRole; host_id: string; is_primary: boolean; is_required: boolean; response: string | null };
  for (const h of (hostsRes.data || []) as HostRow[]) {
    if (h.host_role === 'teacher') teacherIds.add(h.host_id);
    else principalIds.add(h.host_id);
  }

  const [parentsRes, childrenRes, teachersRes, principalsRes] = await Promise.all([
    parentIds.size
      ? supabase.from('montree_parents').select('id, name, email').in('id', Array.from(parentIds))
      : Promise.resolve({ data: [] }),
    childIds.size
      ? supabase.from('montree_children').select('id, name').in('id', Array.from(childIds))
      : Promise.resolve({ data: [] }),
    teacherIds.size
      ? supabase.from('montree_teachers').select('id, name').in('id', Array.from(teacherIds))
      : Promise.resolve({ data: [] }),
    principalIds.size
      ? supabase.from('montree_school_admins').select('id, name').in('id', Array.from(principalIds))
      : Promise.resolve({ data: [] }),
  ]);

  const parentName = new Map<string, string>();
  for (const p of (parentsRes.data || []) as Array<{ id: string; name: string | null; email: string }>)
    parentName.set(p.id, p.name || p.email);
  const childName = new Map<string, string>();
  for (const c of (childrenRes.data || []) as Array<{ id: string; name: string }>)
    childName.set(c.id, c.name);
  const hostName = new Map<string, string | null>();
  for (const t of (teachersRes.data || []) as Array<{ id: string; name: string | null }>)
    hostName.set(`teacher:${t.id}`, t.name);
  for (const p of (principalsRes.data || []) as Array<{ id: string; name: string | null }>)
    hostName.set(`principal:${p.id}`, p.name);

  const hostsByAppt = new Map<string, Array<{ role: StaffRole; id: string; name: string | null; is_primary: boolean; is_required: boolean; response: string | null }>>();
  for (const h of (hostsRes.data || []) as HostRow[]) {
    const arr = hostsByAppt.get(h.appointment_id) || [];
    arr.push({
      role: h.host_role,
      id: h.host_id,
      name: hostName.get(`${h.host_role}:${h.host_id}`) ?? null,
      is_primary: h.is_primary,
      is_required: h.is_required,
      response: h.response,
    });
    hostsByAppt.set(h.appointment_id, arr);
  }

  type ApptOut = ApptRow & { parent_name: string | null; child_name: string | null; hosts: Array<{ role: StaffRole; id: string; name: string | null; is_primary: boolean; is_required: boolean; response: string | null }> };
  const enriched: ApptOut[] = (appts as ApptRow[]).map((a) => ({
    ...a,
    parent_name: parentName.get(a.parent_id) ?? null,
    child_name: a.child_id ? (childName.get(a.child_id) ?? null) : null,
    hosts: hostsByAppt.get(a.id) || [],
  }));

  return NextResponse.json({ appointments: enriched });
}

// ─────────────────────────────────────────────────────────────────────
// POST — staff-initiated invitation (Session 117 continued)
// ─────────────────────────────────────────────────────────────────────
//
// Body:
//   parent_id          : UUID — REQUIRED. The parent being invited.
//   child_id           : UUID — REQUIRED. Must belong to the parent (via
//                                montree_parent_children junction).
//   scheduled_start    : ISO string — REQUIRED. Must be in the future.
//   duration_minutes   : number   — default 30. 5-240.
//   kind               : 'parent_meeting' | 'video_call' — default 'parent_meeting'.
//                        Drives event_kind on the row (currently both store
//                        as 'single_host' since the participant model is the
//                        same; the visual modality is captured by the
//                        provider field: 'video_call' tries to attach video).
//   subject            : optional string ≤200 chars.
//   note               : optional string ≤2000 chars.
//   additional_host_ids: principal-only optional UUID[]. Each is a teacher
//                        in the same school. They become non-primary hosts.
//
// CROSS-POLLINATION CONTRACT:
//   - parent_id exists and is linked to child_id via montree_parent_children
//   - child_id is in caller's school
//   - additional_host_ids (if any) are teachers in caller's school
//   - The caller is added as PRIMARY host
//
// VIDEO PROVIDER:
//   Same precedence as the parent POST flow:
//     - kind='video_call' + agora_video_calls flag → provider='agora'
//     - kind='video_call' + video_calls flag      → provider='jitsi' (URL stamped)
//     - kind='parent_meeting' OR both flags off  → no provider (in-person)
//
// STATUS:
//   Always 'pending'. The parent flips it to 'confirmed' (accept) or
//   'cancelled' (decline) via PATCH on /api/montree/parent/appointments/[id].
export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'teacher' && auth.role !== 'principal') {
    return NextResponse.json({ error: 'Staff-only route.' }, { status: 403 });
  }

  const supabase = getSupabase();
  const enabled = await isFeatureEnabled(supabase, auth.schoolId, 'appointments');
  if (!enabled) {
    return NextResponse.json(
      { error: 'Appointments feature is not enabled for this school.' },
      { status: 403 }
    );
  }

  let body: {
    parent_id?: string;
    child_id?: string;
    scheduled_start?: string;
    duration_minutes?: number;
    kind?: 'parent_meeting' | 'video_call';
    subject?: string;
    note?: string;
    additional_host_ids?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // ── Field validation ──────────────────────────────────────────────
  if (!body.parent_id || !UUID_RE.test(body.parent_id)) {
    return NextResponse.json({ error: 'parent_id (UUID) required.' }, { status: 400 });
  }
  if (!body.child_id || !UUID_RE.test(body.child_id)) {
    return NextResponse.json({ error: 'child_id (UUID) required.' }, { status: 400 });
  }
  const startMs = body.scheduled_start ? Date.parse(body.scheduled_start) : NaN;
  if (Number.isNaN(startMs)) {
    return NextResponse.json({ error: 'scheduled_start invalid (ISO).' }, { status: 400 });
  }
  if (startMs < Date.now() - 60_000) {
    return NextResponse.json({ error: 'Cannot invite into the past.' }, { status: 400 });
  }
  const duration = body.duration_minutes ?? 30;
  if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
    return NextResponse.json(
      { error: 'duration_minutes must be 5-240.' },
      { status: 400 }
    );
  }
  const endMs = startMs + duration * 60_000;
  const kind = body.kind === 'video_call' ? 'video_call' : 'parent_meeting';

  // ── Verify child belongs to caller's school ────────────────────────
  const { data: childRow } = await supabase
    .from('montree_children')
    .select('id, classroom_id, school_id, name')
    .eq('id', body.child_id)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  if (!childRow) {
    return NextResponse.json(
      { error: 'Child not found in your school.' },
      { status: 403 }
    );
  }
  const child = childRow as { id: string; classroom_id: string | null; school_id: string; name: string };

  // For teachers: child must be in their own classroom (transparency rule
  // is principal-only; teachers can't book parents from other classrooms).
  if (auth.role === 'teacher' && auth.classroomId && child.classroom_id !== auth.classroomId) {
    return NextResponse.json(
      { error: "That child isn't in your classroom." },
      { status: 403 }
    );
  }

  // ── Verify parent is linked to that child ─────────────────────────
  const { data: linkRow } = await supabase
    .from('montree_parent_children')
    .select('parent_id, child_id')
    .eq('parent_id', body.parent_id)
    .eq('child_id', body.child_id)
    .maybeSingle();
  if (!linkRow) {
    return NextResponse.json(
      { error: "That parent isn't linked to that child." },
      { status: 403 }
    );
  }

  // ── Verify parent is in the same school ───────────────────────────
  const { data: parentRow } = await supabase
    .from('montree_parents')
    .select('id, name, email, school_id, is_active')
    .eq('id', body.parent_id)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  if (!parentRow) {
    return NextResponse.json(
      { error: 'Parent not found in your school.' },
      { status: 403 }
    );
  }
  const parent = parentRow as { id: string; name: string | null; email: string; school_id: string; is_active: boolean };
  if (!parent.is_active) {
    return NextResponse.json(
      { error: 'That parent account is inactive.' },
      { status: 403 }
    );
  }

  // ── Validate additional_host_ids (principal only) ─────────────────
  const additionalHostIds = Array.isArray(body.additional_host_ids)
    ? body.additional_host_ids.filter((id) => typeof id === 'string' && UUID_RE.test(id))
    : [];
  if (additionalHostIds.length > 0 && auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only principals can invite additional hosts.' },
      { status: 403 }
    );
  }
  if (additionalHostIds.length > 0) {
    // Verify every additional host is a teacher in this school.
    const { data: teacherRows } = await supabase
      .from('montree_teachers')
      .select('id, school_id, is_active')
      .in('id', additionalHostIds)
      .eq('school_id', auth.schoolId)
      .eq('is_active', true);
    const validTeacherIds = new Set(
      ((teacherRows as Array<{ id: string }> | null) || []).map((t) => t.id)
    );
    const invalid = additionalHostIds.filter((id) => !validTeacherIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: 'One or more additional hosts are not teachers in your school.' },
        { status: 403 }
      );
    }
  }

  // ── Video provider selection (mirrors parent POST precedence) ─────
  const [videoCallsEnabledFlag, agoraEnabledFlag] = await Promise.all([
    isFeatureEnabled(supabase, auth.schoolId, 'video_calls'),
    isFeatureEnabled(supabase, auth.schoolId, 'agora_video_calls'),
  ]);
  const icalToken = randomBytes(18).toString('base64url');
  let videoUrl: string | null = null;
  let provider: 'jitsi' | 'agora' = 'jitsi';
  let recordingEnabled = false;
  // 🚨 Default to video when a video flag is on. Staff can pick 'parent_meeting'
  // explicitly for in-person; otherwise 'parent_meeting' falls through to video
  // when Agora/Jitsi is enabled. Matches the parent POST default — see comment
  // there for the full reasoning.
  const videoFlagOn = agoraEnabledFlag || videoCallsEnabledFlag;
  const provisionVideo = kind === 'video_call' || (kind !== 'parent_meeting' && videoFlagOn);
  if (provisionVideo) {
    if (agoraEnabledFlag) {
      provider = 'agora';
      // Recording defaults off on staff-initiated; the staff can flip it
      // later via the appointment detail surface.
      recordingEnabled = false;
    } else if (videoCallsEnabledFlag) {
      provider = 'jitsi';
      videoUrl = generateJitsiUrl(icalToken);
    }
    // else: kind=video_call but no flag → silently fall through (no
    // provider). UI shouldn't have offered the video option but defense
    // in depth.
  }

  // ── Insert appointment ────────────────────────────────────────────
  const insertPayload: Record<string, unknown> = {
    school_id: auth.schoolId,
    classroom_id: child.classroom_id,
    child_id: child.id,
    parent_id: parent.id,
    event_kind: 'single_host',
    scheduled_start: new Date(startMs).toISOString(),
    scheduled_end: new Date(endMs).toISOString(),
    duration_minutes: duration,
    status: 'pending',
    intake_subject: body.subject?.slice(0, 200) || null,
    intake_body: body.note?.slice(0, 2000) || null,
    location: null,
    ical_token: icalToken,
  };
  if (videoUrl !== null) insertPayload.video_url = videoUrl;
  if (provider !== 'jitsi' || recordingEnabled) {
    insertPayload.provider = provider;
    insertPayload.recording_enabled = recordingEnabled;
  }

  const { data: apptRaw, error: insertErr } = await supabase
    .from('montree_appointments')
    .insert(insertPayload)
    .select('id')
    .single();
  if (insertErr || !apptRaw) {
    console.error('[appointments POST] insert error', insertErr);
    return NextResponse.json(
      { error: 'Failed to create invitation.', detail: insertErr?.message },
      { status: 500 }
    );
  }
  const appointmentId = (apptRaw as { id: string }).id;

  // ── Add caller as primary host + any additional hosts ─────────────
  const hostRows = [
    {
      appointment_id: appointmentId,
      host_role: auth.role as StaffRole,
      host_id: auth.userId,
      is_primary: true,
      is_required: true,
      response: 'accepted', // the inviter is implicitly accepting
    },
    ...additionalHostIds.map((id) => ({
      appointment_id: appointmentId,
      host_role: 'teacher' as StaffRole,
      host_id: id,
      is_primary: false,
      is_required: false,
      response: 'pending',
    })),
  ];
  const { error: hostsErr } = await supabase
    .from('montree_appointment_hosts')
    .insert(hostRows);
  if (hostsErr) {
    console.error('[appointments POST] hosts insert error', hostsErr);
    // Rollback the appointment so we don't orphan it.
    await supabase.from('montree_appointments').delete().eq('id', appointmentId);
    return NextResponse.json(
      { error: 'Failed to attach hosts; invitation rolled back.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    appointment: {
      id: appointmentId,
      status: 'pending',
      kind,
      provider,
      scheduled_start: new Date(startMs).toISOString(),
      scheduled_end: new Date(endMs).toISOString(),
      duration_minutes: duration,
      parent: { id: parent.id, name: parent.name || parent.email, email: parent.email },
      child: { id: child.id, name: child.name },
      subject: body.subject?.slice(0, 200) || null,
      video_url: videoUrl,
      recording_enabled: recordingEnabled,
    },
  });
}
