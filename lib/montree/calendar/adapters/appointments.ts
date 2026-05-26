// lib/montree/calendar/adapters/appointments.ts
// Calendar Plan §4 — adapter for `montree_appointments` (Sessions 117–120).
//
// Reads scheduled appointments inside the requested window, scopes by role
// (parent → only their own appointments, teacher → their classroom, principal
// → school-wide). Maps to the normalized CalendarEvent shape.
//
// Honest scope: we treat each appointment as a SPAN event from
// `scheduled_start` to `scheduled_end`. We do NOT pull the host roster here
// (the calendar surface doesn't need every host name — it just needs to know
// the event exists and where to deep-link to).

import { getSupabase } from '@/lib/supabase-client';
import type { CalendarAdapter, CalendarEvent, CalendarStatus } from '../types';

interface ApptRow {
  id: string;
  school_id: string;
  classroom_id: string | null;
  child_id: string | null;
  parent_id: string;
  scheduled_start: string;
  scheduled_end: string | null;
  duration_minutes: number | null;
  status: string;
  intake_subject: string | null;
  intake_body: string | null;
  location: string | null;
  event_kind: string | null;
  video_url?: string | null;
  provider?: string | null;
}

function mapStatus(s: string): CalendarStatus {
  switch (s) {
    case 'confirmed':
    case 'pending':
      return 'planned';
    case 'completed':
      return 'done';
    case 'cancelled':
    case 'declined':
      return 'cancelled';
    case 'no_show':
    case 'missed':
      return 'missed';
    default:
      return 'planned';
  }
}

function kindToTitle(kind: string | null, subject: string | null): string {
  if (subject && subject.trim()) return subject.trim().slice(0, 80);
  switch (kind) {
    case 'video_call':
      return 'Video call';
    case 'parent_meeting':
      return 'Parent meeting';
    case 'in_person':
      return 'In-person meeting';
    default:
      return 'Appointment';
  }
}

function iconFor(kind: string | null, video: boolean): string {
  if (video || kind === 'video_call') return '🎥';
  if (kind === 'parent_meeting') return '👨‍👩‍👧';
  return '🗓️';
}

export const appointmentsAdapter: CalendarAdapter = async (window, scope) => {
  const supabase = getSupabase();

  // SELECT — try the modern column set; fall back if columns 222/223 missing.
  const COLS_MODERN =
    'id, school_id, classroom_id, child_id, parent_id, scheduled_start, scheduled_end, duration_minutes, status, intake_subject, intake_body, location, event_kind, video_url, provider';
  const COLS_LEGACY =
    'id, school_id, classroom_id, child_id, parent_id, scheduled_start, scheduled_end, duration_minutes, status, intake_subject, intake_body, location, event_kind';

  const fromIso = window.fromInstant.toISOString();
  const toIso = window.toInstant.toISOString();

  // Cross-pollination contract: every query scopes by school_id.
  let q = supabase
    .from('montree_appointments')
    .select(COLS_MODERN)
    .eq('school_id', scope.schoolId)
    .gte('scheduled_start', fromIso)
    .lt('scheduled_start', toIso)
    .order('scheduled_start', { ascending: true })
    .limit(500);

  // Role narrowing — parent sees only their own children's appointments.
  // Teachers see their classroom + school-wide; principals see everything in
  // their school.
  if (scope.role === 'parent') {
    if (scope.childIds.length === 0) return [];
    q = q.in('child_id', scope.childIds);
  } else if (scope.role === 'teacher' && scope.classroomId) {
    // Teacher in a classroom — show appointments scoped to that classroom OR
    // school-wide (classroom_id NULL).
    q = q.or(`classroom_id.eq.${scope.classroomId},classroom_id.is.null`);
  }

  const attempt = await q;
  let rows: ApptRow[] = [];
  if (attempt.error) {
    // Column missing OR table missing — degrade silently.
    if (attempt.error.code === '42P01') return [];
    if (attempt.error.code === '42703') {
      const fallback = await supabase
        .from('montree_appointments')
        .select(COLS_LEGACY)
        .eq('school_id', scope.schoolId)
        .gte('scheduled_start', fromIso)
        .lt('scheduled_start', toIso)
        .order('scheduled_start', { ascending: true })
        .limit(500);
      if (fallback.error) {
        console.error('[CalendarAppointments] legacy fallback error', fallback.error);
        return [];
      }
      rows = (fallback.data || []) as ApptRow[];
    } else {
      console.error('[CalendarAppointments] error', attempt.error);
      return [];
    }
  } else {
    rows = (attempt.data || []) as ApptRow[];
  }

  // Resolve primary host role for each appointment — Session 129 follow-up
  // for the colored-dot system. parent↔teacher = emerald dot, parent↔principal
  // = red dot. We only need is_primary=true rows; non-primary hosts (e.g.
  // co-host teachers) don't change the dot color.
  const hostRoleByApptId = new Map<string, 'teacher' | 'principal'>();
  if (rows.length > 0) {
    const apptIds = rows.map(r => r.id);
    const { data: hostRows, error: hostsErr } = await supabase
      .from('montree_appointment_hosts')
      .select('appointment_id, host_role, is_primary')
      .in('appointment_id', apptIds)
      .eq('is_primary', true);
    if (hostsErr && hostsErr.code !== '42P01') {
      // Soft-degrade: if the hosts table query fails for any reason other
      // than "table missing", log and fall back to no host_role (dot defaults
      // to the teacher/parent-teacher color via the resolver).
      console.warn('[CalendarAppointments] hosts lookup failed', hostsErr);
    } else if (hostRows) {
      for (const h of hostRows as Array<{
        appointment_id: string;
        host_role: string;
        is_primary: boolean;
      }>) {
        if (h.host_role === 'teacher' || h.host_role === 'principal') {
          hostRoleByApptId.set(h.appointment_id, h.host_role);
        }
      }
    }
  }

  const events: CalendarEvent[] = rows.map((r) => {
    const isVideo = Boolean(r.video_url || r.provider === 'agora' || r.event_kind === 'video_call');
    const end = r.scheduled_end
      ? r.scheduled_end
      : r.duration_minutes
        ? new Date(new Date(r.scheduled_start).getTime() + r.duration_minutes * 60_000).toISOString()
        : null;
    const hostRole = hostRoleByApptId.get(r.id) || null;
    // Accent color tracks the dot color so anywhere downstream that reads
    // `accent` (not just the calendar surface) sees the new palette.
    // Principal-hosted = red, teacher-hosted = emerald.
    const accent = hostRole === 'principal' ? '#f87171' : '#34d399';
    return {
      id: `appt:${r.id}`,
      source: 'appointment',
      kind: 'span',
      start: r.scheduled_start,
      end,
      all_day: false,
      title: kindToTitle(r.event_kind, r.intake_subject),
      detail: r.location || r.intake_body || null,
      status: mapStatus(r.status),
      // Parents deep-link to their appointment list; staff to the
      // appointments calendar.
      //
      // Session 129 follow-up: REMOVED the auto-launch-into-Agora-call link
      // for video appointments. Previously isVideo → /montree/dashboard/calls/${r.id}
      // which booted straight into the call. Web-Claude audit accidentally
      // triggered a live call by scrolling through the day-detail panel.
      // The /dashboard/appointments calendar page has a deliberate Join
      // button that opens within the ±2h window per Session 117/120 design —
      // that's the correct path to a call. Tapping a card on a calendar
      // surface should never auto-page another human.
      link:
        scope.role === 'parent'
          ? `/montree/parent/appointments`
          : `/montree/dashboard/appointments`,
      icon: iconFor(r.event_kind, isVideo),
      accent,
      host_role: hostRole,
      school_id: r.school_id,
      classroom_id: r.classroom_id,
      child_id: r.child_id,
      visibility: r.classroom_id ? 'classroom' : 'school',
    };
  });

  return events;
};
