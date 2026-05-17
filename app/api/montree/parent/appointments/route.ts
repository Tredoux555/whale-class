// app/api/montree/parent/appointments/route.ts
//
// Parent-facing appointment CRUD root.
//   GET  — list the parent's own appointments (upcoming + recent past).
//   POST — book a new appointment.
//
// AUTH: parent (full account; invite-only sessions get 403). Gated on
// the `appointments` feature flag for the parent's school.
//
// CROSS-POLLINATION:
//   - parent_id = parent.parentId on every read/write.
//   - hosts MUST belong to parent.schoolId (verified per host).
//   - child_id (when provided) MUST be in parent.childIds.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import { shareAppointmentToThread } from '@/lib/montree/appointments/share-to-thread';
import { computeOpenSlots } from '@/lib/montree/appointments/slot-computer';
import { generateJitsiUrl } from '@/lib/montree/appointments/video';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import type {
  AvailabilityRule,
  AvailabilityBlackout,
  EventKind,
  StaffRole,
} from '@/lib/montree/appointments/types';
import { randomBytes } from 'node:crypto';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// APPT_COLS covers everything we want to surface on parent appointments
// pages. New optional columns (added by 222 + 223):
//   - video_url (222) — Jitsi room URL, null on Agora and on pre-222
//   - provider (223) — 'jitsi' | 'agora', defaults 'jitsi' for pre-223
//   - recording_enabled (223) — whether recording was enabled at booking,
//     defaults false pre-223
// All three are gracefully omitted via the LEGACY fallback below when
// the relevant migration hasn't been run.
const APPT_COLS =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, shared_to_thread_at, ical_token, video_url, provider, recording_enabled, created_at, updated_at';
// Migration-pending fallback. Strips ALL optional columns added by 222 +
// 223. Without this, every parent's appointments page would 500 in the
// window between code deploy and migration run.
const APPT_COLS_LEGACY =
  'id, school_id, classroom_id, child_id, parent_id, event_kind, scheduled_start, scheduled_end, duration_minutes, status, cancelled_reason, cancelled_by_role, cancelled_at, intake_subject, intake_body, location, thread_id, shared_to_thread_at, ical_token, created_at, updated_at';

/**
 * Detect the column-pending case for any of the optional columns added
 * by migrations 222 / 223. The retry path falls back to APPT_COLS_LEGACY
 * which omits all three.
 */
function isOptionalColumnMissing(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return err.code === '42703' && /video_url|provider|recording_enabled/i.test(err.message || '');
}

// Back-compat alias — older code paths reference this name.
const isVideoUrlColumnMissing = isOptionalColumnMissing;

// ── GET — parent's appointments ──────────────────────────────────────
export async function GET() {
  const supabase = getSupabase();
  const parent = await resolveAppointmentsParent(supabase);
  if (parent instanceof NextResponse) return parent;

  // Echo BOTH video flags so the parent UI can decide:
  //   - video_calls (Jitsi legacy) — checkbox visible, books with Jitsi
  //   - agora_video_calls (premium) — checkbox visible, books with Agora
  //   - video_recording — adds "record this meeting" sub-option (Agora only)
  // Computed up-front; reused both in the response echo AND inside the POST
  // for provider selection. Single source of truth.
  const [videoCallsEnabledFlag, agoraEnabledFlag, recordingEnabledFlag] = await Promise.all([
    isFeatureEnabled(supabase, parent.schoolId, 'video_calls'),
    isFeatureEnabled(supabase, parent.schoolId, 'agora_video_calls'),
    isFeatureEnabled(supabase, parent.schoolId, 'video_recording'),
  ]);

  // Pull upcoming + recent past (last 30 days). Hosts hydrated via a
  // second query.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const buildApptsQuery = (cols: string) =>
    supabase
      .from('montree_appointments')
      .select(cols)
      .eq('parent_id', parent.parentId)
      .eq('school_id', parent.schoolId)
      .gte('scheduled_start', cutoff)
      .order('scheduled_start', { ascending: true })
      .limit(200);

  let { data: appts, error } = await buildApptsQuery(APPT_COLS);
  if (isVideoUrlColumnMissing(error)) {
    // Migration 222 hasn't been run yet. Retry without video_url so the
    // appointments page keeps working in the deploy → migration window.
    console.warn('[parent/appointments GET] video_url column missing — migration 222 pending');
    ({ data: appts, error } = await buildApptsQuery(APPT_COLS_LEGACY));
  }

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({
        appointments: [],
        migration_pending: true,
        message: 'Migration 216 not yet run.',
      });
    }
    console.error('[parent/appointments GET] error', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }

  const ids = (appts || []).map((a: { id: string }) => a.id);
  let hostsByAppt: Map<string, Array<{ role: StaffRole; id: string; name: string | null; is_primary: boolean }>> = new Map();
  if (ids.length > 0) {
    const { data: hostRows } = await supabase
      .from('montree_appointment_hosts')
      .select('appointment_id, host_role, host_id, is_primary')
      .in('appointment_id', ids);
    type HostRow = { appointment_id: string; host_role: StaffRole; host_id: string; is_primary: boolean };
    const rows = (hostRows || []) as HostRow[];

    // Hydrate names in batch.
    const teacherIds = new Set<string>();
    const principalIds = new Set<string>();
    for (const r of rows) {
      if (r.host_role === 'teacher') teacherIds.add(r.host_id);
      else principalIds.add(r.host_id);
    }
    const [teachersRes, principalsRes] = await Promise.all([
      teacherIds.size
        ? supabase
            .from('montree_teachers')
            .select('id, name')
            .in('id', Array.from(teacherIds))
        : Promise.resolve({ data: [] }),
      principalIds.size
        ? supabase
            .from('montree_school_admins')
            .select('id, name')
            .in('id', Array.from(principalIds))
        : Promise.resolve({ data: [] }),
    ]);
    const nameBy = new Map<string, string | null>();
    for (const t of (teachersRes.data || []) as Array<{ id: string; name: string | null }>)
      nameBy.set(`teacher:${t.id}`, t.name);
    for (const p of (principalsRes.data || []) as Array<{ id: string; name: string | null }>)
      nameBy.set(`principal:${p.id}`, p.name);

    hostsByAppt = new Map();
    for (const r of rows) {
      const arr = hostsByAppt.get(r.appointment_id) || [];
      arr.push({
        role: r.host_role,
        id: r.host_id,
        name: nameBy.get(`${r.host_role}:${r.host_id}`) ?? null,
        is_primary: r.is_primary,
      });
      hostsByAppt.set(r.appointment_id, arr);
    }
  }

  const enriched = (appts || []).map((a: { id: string }) => ({
    ...a,
    hosts: hostsByAppt.get(a.id) || [],
  }));

  return NextResponse.json({
    appointments: enriched,
    feature_flags: {
      video_calls: videoCallsEnabledFlag,
      // Phase 116.3 — when ON, parent UI books with Agora provider instead
      // of Jitsi. Both flags can coexist (Agora takes priority server-side).
      agora_video_calls: agoraEnabledFlag,
      // When BOTH agora_video_calls AND video_recording are ON, the booking
      // UI surfaces a "record this meeting" sub-checkbox.
      video_recording: recordingEnabledFlag,
    },
  });
}

// ── POST — book ──────────────────────────────────────────────────────
//
// Body: {
//   event_kind: 'single_host' | 'collective' | 'round_robin',
//   hosts: [{ role: 'teacher'|'principal', id: UUID }, ...],
//   scheduled_start: ISO,
//   duration_minutes: number,
//   child_id?: UUID (must be in parent's child list),
//   intake_subject?: string (200 chars),
//   intake_body?: string (2000 chars),
//   location?: string (500 chars),
// }
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const parent = await resolveAppointmentsParent(supabase);
  if (parent instanceof NextResponse) return parent;

  let body: {
    event_kind?: EventKind;
    hosts?: Array<{ role: StaffRole; id: string }>;
    scheduled_start?: string;
    duration_minutes?: number;
    child_id?: string | null;
    intake_subject?: string;
    intake_body?: string;
    location?: string;
    locale?: string;
    // Phase 116.2 — parent ticks the "Video call" checkbox at booking.
    // Only honoured when the `video_calls` feature flag is ON for the
    // school. If the flag is off, this field is silently ignored
    // (booking still succeeds, just no video URL).
    video_call?: boolean;
    // Phase 116.3 — parent ticks "Record this meeting" sub-option (Agora
    // only). Requires BOTH agora_video_calls AND video_recording flags.
    // Server stores on the appointment row as recording_enabled.
    record_meeting?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const eventKind = body.event_kind || 'single_host';
  if (!['single_host', 'collective', 'round_robin'].includes(eventKind)) {
    return NextResponse.json({ error: 'Invalid event_kind.' }, { status: 400 });
  }
  if (!Array.isArray(body.hosts) || body.hosts.length === 0) {
    return NextResponse.json({ error: 'hosts required.' }, { status: 400 });
  }
  if (eventKind === 'single_host' && body.hosts.length !== 1) {
    return NextResponse.json(
      { error: 'single_host needs exactly one host.' },
      { status: 400 }
    );
  }
  for (const h of body.hosts) {
    if ((h.role !== 'teacher' && h.role !== 'principal') || !h.id || !UUID_RE.test(h.id)) {
      return NextResponse.json({ error: 'Invalid host entry.' }, { status: 400 });
    }
  }
  const startMs = body.scheduled_start ? Date.parse(body.scheduled_start) : NaN;
  if (Number.isNaN(startMs)) {
    return NextResponse.json({ error: 'scheduled_start invalid.' }, { status: 400 });
  }
  if (startMs < Date.now() - 60_000) {
    return NextResponse.json({ error: 'Cannot book in the past.' }, { status: 400 });
  }
  const duration = body.duration_minutes ?? 30;
  if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
    return NextResponse.json(
      { error: 'duration_minutes must be 5-240.' },
      { status: 400 }
    );
  }
  const endMs = startMs + duration * 60_000;

  // Child verification.
  let childId: string | null = null;
  if (body.child_id) {
    if (!UUID_RE.test(body.child_id) || !parent.childIds.includes(body.child_id)) {
      return NextResponse.json(
        { error: 'child_id must be one of your children.' },
        { status: 403 }
      );
    }
    childId = body.child_id;
  }

  // ── Verify hosts are in parent's school + still available at the
  // requested time. Race-safety: re-compute open slots and check the
  // requested start is in the open set.
  const hostsBySchoolOk: Array<{ role: StaffRole; id: string }> = [];
  for (const h of body.hosts) {
    const inSchool = await hostInSchool(supabase, h, parent.schoolId);
    if (!inSchool) {
      return NextResponse.json(
        { error: 'Host not in your school.' },
        { status: 403 }
      );
    }
    hostsBySchoolOk.push(h);
  }

  // Slot recheck — defensive against UI lag / concurrent booking.
  const slotOk = await verifySlotAvailable({
    supabase,
    schoolId: parent.schoolId,
    eventKind,
    hosts: hostsBySchoolOk,
    startMs,
    endMs,
    durationMinutes: duration,
  });
  if (!slotOk.ok) {
    return NextResponse.json(
      { error: slotOk.reason || 'That slot is no longer available.' },
      { status: 409 }
    );
  }

  // Resolve primary host. For single_host + collective, the first host
  // is primary. For round_robin, slotOk.chosenHost identifies who got
  // assigned at the slot-resolution step.
  let primaryHost = hostsBySchoolOk[0];
  if (eventKind === 'round_robin' && slotOk.chosenHost) {
    primaryHost = slotOk.chosenHost;
  }

  // ── Determine classroom_id from child or host ──────────────────────
  let classroomId: string | null = null;
  if (childId) {
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .maybeSingle();
    classroomId = (child as { classroom_id: string | null } | null)?.classroom_id ?? null;
  } else if (primaryHost.role === 'teacher') {
    const { data: t } = await supabase
      .from('montree_teachers')
      .select('classroom_id')
      .eq('id', primaryHost.id)
      .maybeSingle();
    classroomId = (t as { classroom_id: string | null } | null)?.classroom_id ?? null;
  }

  // ── Phase 116.2/116.3 — Video provider selection ────────────────────
  // Token is generated regardless; both Jitsi URL and Agora channel name
  // derive deterministically from it.
  //
  // PROVIDER PRECEDENCE:
  //   1. Parent didn't tick video_call → no provider, no video.
  //   2. agora_video_calls flag ON → provider='agora'. Channel name is
  //      derived from ical_token at join time via /agora-token. We don't
  //      store a video_url because the URL is implicit (Montree-internal
  //      route, not a hosted page).
  //   3. agora_video_calls flag OFF + video_calls flag ON → provider='jitsi'.
  //      Generate the Jitsi URL up-front and store in video_url.
  //   4. Both flags OFF → silently ignore video_call (no provider).
  //
  // RECORDING:
  //   record_meeting=true is only honoured when BOTH agora_video_calls
  //   AND video_recording are ON. Stored as appointment.recording_enabled
  //   which the recording/start route checks at recording time.
  //
  // We use the upfront flag checks (videoCallsEnabledFlag etc.) computed
  // in the GET section — they're a single source of truth across both
  // verbs of this route.
  const icalToken = randomBytes(18).toString('base64url');
  let videoUrl: string | null = null;
  let provider: 'jitsi' | 'agora' = 'jitsi';
  let recordingEnabled = false;
  if (body.video_call === true) {
    if (agoraEnabledFlag) {
      provider = 'agora';
      // No video_url for Agora — UI computes from /agora-token endpoint.
      if (body.record_meeting === true && recordingEnabledFlag) {
        recordingEnabled = true;
      }
    } else if (videoCallsEnabledFlag) {
      provider = 'jitsi';
      videoUrl = generateJitsiUrl(icalToken);
    }
    // Both flags OFF → provider stays 'jitsi' default, no video_url. The
    // checkbox shouldn't have surfaced on the UI; defense in depth.
  }

  // ── Insert the appointment ─────────────────────────────────────────
  // video_url is conditionally spread so the insert payload doesn't
  // reference the column when it isn't needed. Important for the
  // migration-pending case: if migration 222 hasn't been run yet, the
  // `video_url` column doesn't exist and any reference to it (even
  // null) would 42703-error the booking. By construction the flag
  // can't be ON without migration 222 already in place (the flag is
  // registered IN that migration), so `videoUrl !== null` implies
  // the column exists.
  const insertPayload: Record<string, unknown> = {
    school_id: parent.schoolId,
    classroom_id: classroomId,
    child_id: childId,
    parent_id: parent.parentId,
    event_kind: eventKind,
    scheduled_start: new Date(startMs).toISOString(),
    scheduled_end: new Date(endMs).toISOString(),
    duration_minutes: duration,
    status: 'confirmed',
    intake_subject: body.intake_subject?.slice(0, 200) || null,
    intake_body: body.intake_body?.slice(0, 2000) || null,
    location: body.location?.slice(0, 500) || null,
    ical_token: icalToken,
  };
  if (videoUrl !== null) {
    insertPayload.video_url = videoUrl;
  }
  // Phase 116.3 — provider + recording_enabled are stamped from migration
  // 223 columns. Conditionally spread: when 223 hasn't been run, the
  // INSERT would 42703 on these column references. The two flag checks
  // above already gate that recordingEnabled stays false in that case;
  // we additionally skip spreading them when provider stayed at the
  // 'jitsi' default + no recording (the pre-223 default behaviour).
  if (provider !== 'jitsi' || recordingEnabled) {
    insertPayload.provider = provider;
    insertPayload.recording_enabled = recordingEnabled;
  }

  let { data: appt, error: insertErr } = await supabase
    .from('montree_appointments')
    .insert(insertPayload)
    .select(APPT_COLS)
    .single();
  if (isVideoUrlColumnMissing(insertErr)) {
    // Migration 222 pending — retry the SELECT-after-INSERT without
    // video_url. The INSERT itself already succeeded (the conditional
    // spread skipped video_url when null), so we just need a clean
    // re-read.
    console.warn('[parent/appointments POST] video_url column missing — migration 222 pending');
    const retry = await supabase
      .from('montree_appointments')
      .insert(insertPayload)
      .select(APPT_COLS_LEGACY)
      .single();
    appt = retry.data;
    insertErr = retry.error;
  }

  if (insertErr || !appt) {
    console.error('[parent/appointments POST] insert', insertErr);
    return NextResponse.json({ error: 'Failed to create appointment.' }, { status: 500 });
  }

  // Insert host rows. Primary is the chosen host (round_robin) or first
  // (others). For collective + round_robin we mark non-primary hosts:
  //   - collective: all required, all in junction
  //   - round_robin: only chosen host is_required=true; others recorded
  //                  for posterity as is_required=false
  const hostRows = hostsBySchoolOk.map((h) => {
    const isPrimary = h.role === primaryHost.role && h.id === primaryHost.id;
    const isRequired =
      eventKind === 'round_robin' ? isPrimary : true; // collective + single_host: all required
    return {
      appointment_id: appt.id,
      host_role: h.role,
      host_id: h.id,
      is_primary: isPrimary,
      is_required: isRequired,
      response: 'accepted' as const, // confirmed booking — host accepted by default
      response_at: new Date().toISOString(),
    };
  });
  await supabase.from('montree_appointment_hosts').insert(hostRows);

  // ── Fire share-to-thread (fire-and-forget; failure non-blocking) ───
  let shareResult: Awaited<ReturnType<typeof shareAppointmentToThread>> | null = null;
  try {
    shareResult = await shareAppointmentToThread({
      supabase,
      appointment: appt as Parameters<typeof shareAppointmentToThread>[0]['appointment'],
      primaryHost,
      kind: 'booking',
      locale: body.locale || 'en',
    });
    if (shareResult.threadId) {
      await supabase
        .from('montree_appointments')
        .update({
          thread_id: shareResult.threadId,
          shared_to_thread_at: new Date().toISOString(),
        })
        .eq('id', appt.id)
        .eq('parent_id', parent.parentId)
        .eq('school_id', parent.schoolId);
    }
  } catch (err) {
    console.error('[parent/appointments POST] share failed', err);
  }

  return NextResponse.json({
    appointment: {
      ...appt,
      thread_id: shareResult?.threadId || appt.thread_id,
      hosts: hostRows.map(({ host_role, host_id, is_primary }) => ({
        role: host_role,
        id: host_id,
        is_primary,
      })),
    },
    share: shareResult,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────

async function hostInSchool(
  supabase: ReturnType<typeof getSupabase>,
  host: { role: StaffRole; id: string },
  schoolId: string
): Promise<boolean> {
  if (host.role === 'teacher') {
    const { data } = await supabase
      .from('montree_teachers')
      .select('id')
      .eq('id', host.id)
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .maybeSingle();
    return !!data;
  }
  const { data } = await supabase
    .from('montree_school_admins')
    .select('id')
    .eq('id', host.id)
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}

interface SlotVerifyArgs {
  supabase: ReturnType<typeof getSupabase>;
  schoolId: string;
  eventKind: EventKind;
  hosts: Array<{ role: StaffRole; id: string }>;
  startMs: number;
  endMs: number;
  durationMinutes: number;
}

async function verifySlotAvailable(args: SlotVerifyArgs): Promise<
  | { ok: true; chosenHost?: { role: StaffRole; id: string } }
  | { ok: false; reason: string }
> {
  const { supabase, schoolId, eventKind, hosts, startMs, endMs, durationMinutes } = args;

  // For each host, fetch rules + blackouts + bookings, compute slots,
  // and check whether startMs is in the open set.
  const slotsPerHost: Array<{ host: { role: StaffRole; id: string }; openStarts: Set<number> }> = [];

  const padMs = 5 * 60_000;
  const rangeStartIso = new Date(startMs - padMs).toISOString();
  const rangeEndIso = new Date(endMs + padMs).toISOString();

  for (const h of hosts) {
    const [rulesRes, blackoutsRes, bookingsRes] = await Promise.all([
      supabase
        .from('montree_availability_rules')
        .select('*')
        .eq('staff_role', h.role)
        .eq('staff_id', h.id)
        .eq('school_id', schoolId),
      supabase
        .from('montree_availability_blackouts')
        .select('*')
        .eq('staff_role', h.role)
        .eq('staff_id', h.id)
        .eq('school_id', schoolId)
        .gte('end_at', rangeStartIso)
        .lte('start_at', rangeEndIso),
      supabase
        .from('montree_appointment_hosts')
        .select('montree_appointments!inner(scheduled_start, scheduled_end, status, school_id)')
        .eq('host_role', h.role)
        .eq('host_id', h.id)
        .eq('montree_appointments.school_id', schoolId)
        .in('montree_appointments.status', ['pending', 'confirmed'])
        .gte('montree_appointments.scheduled_end', rangeStartIso)
        .lte('montree_appointments.scheduled_start', rangeEndIso),
    ]);

    const rules = (rulesRes.data || []) as AvailabilityRule[];
    const blackouts = (blackoutsRes.data || []) as AvailabilityBlackout[];
    type BookingJoin = {
      montree_appointments:
        | { scheduled_start: string; scheduled_end: string; status: string; school_id: string }
        | { scheduled_start: string; scheduled_end: string; status: string; school_id: string }[]
        | null;
    };
    const bookedRanges: Array<{ start: string; end: string }> = [];
    for (const row of (bookingsRes.data || []) as BookingJoin[]) {
      const appt = Array.isArray(row.montree_appointments)
        ? row.montree_appointments[0]
        : row.montree_appointments;
      if (appt) bookedRanges.push({ start: appt.scheduled_start, end: appt.scheduled_end });
    }

    const slots = computeOpenSlots({
      staffRole: h.role,
      staffId: h.id,
      rangeStart: rangeStartIso,
      rangeEnd: rangeEndIso,
      slotDurationMinutes: durationMinutes,
      rules,
      blackouts,
      bookedRanges,
    });
    const starts = new Set(slots.map((s) => Date.parse(s.start)));
    slotsPerHost.push({ host: h, openStarts: starts });
  }

  if (eventKind === 'single_host') {
    if (slotsPerHost[0].openStarts.has(startMs)) return { ok: true };
    return { ok: false, reason: 'That slot is no longer available.' };
  }
  if (eventKind === 'collective') {
    for (const sp of slotsPerHost) {
      if (!sp.openStarts.has(startMs)) {
        return { ok: false, reason: 'One of the hosts is no longer free at that time.' };
      }
    }
    return { ok: true };
  }
  // round_robin — first host with the slot wins
  for (const sp of slotsPerHost) {
    if (sp.openStarts.has(startMs)) {
      return { ok: true, chosenHost: sp.host };
    }
  }
  return { ok: false, reason: 'No host is available at that time.' };
}
