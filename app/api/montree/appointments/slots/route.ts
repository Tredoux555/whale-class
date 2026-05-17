// app/api/montree/appointments/slots/route.ts
//
// Parent-facing slot-availability endpoint. Returns OPEN slots for a
// staff member (or set of staff for Collective bookings) over a date
// range.
//
// AUTH: parent — must be a logged-in full account in the same school as
// the requested staff. Invite-only sessions get 403. The `appointments`
// feature flag must be ON for the school (404 otherwise).
//
// QUERY PARAMS:
//   event_kind = 'single_host' | 'collective' | 'round_robin'
//   hosts      = comma-separated 'role:id' pairs (e.g. 'teacher:UUID')
//                For single_host: one entry.
//                For collective: 2+ entries — ALL must be free.
//                For round_robin: 2+ entries — caller will pick later.
//   from       = ISO timestamp (inclusive). Defaults to now.
//   to         = ISO timestamp (exclusive). Defaults to from + 30 days.
//   slot_minutes = override slot length. Optional.
//
// CROSS-POLLINATION:
//   - Parent's school = staff member's school. Verified per host.
//   - rules + blackouts + booked ranges filtered by (staff_role, staff_id).
//   - Hosts of type 'teacher' AND in the same school. 'principal' likewise.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import {
  computeOpenSlots,
  intersectSlots,
} from '@/lib/montree/appointments/slot-computer';
import type {
  AvailabilityRule,
  AvailabilityBlackout,
  EventKind,
  OpenSlot,
  StaffRole,
} from '@/lib/montree/appointments/types';

export const maxDuration = 30;

const MAX_RANGE_DAYS = 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface HostKey {
  role: StaffRole;
  id: string;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const parent = await resolveAppointmentsParent(supabase);
  if (parent instanceof NextResponse) return parent;

  const { searchParams } = new URL(request.url);
  const eventKindRaw = (searchParams.get('event_kind') || 'single_host') as EventKind;
  if (!['single_host', 'collective', 'round_robin'].includes(eventKindRaw)) {
    return NextResponse.json({ error: 'Invalid event_kind.' }, { status: 400 });
  }
  const eventKind = eventKindRaw;

  const hostsRaw = searchParams.get('hosts');
  if (!hostsRaw) {
    return NextResponse.json({ error: 'hosts parameter required.' }, { status: 400 });
  }
  const hosts = parseHosts(hostsRaw);
  if (hosts.length === 0) {
    return NextResponse.json({ error: 'Invalid hosts parameter.' }, { status: 400 });
  }
  if (eventKind === 'single_host' && hosts.length !== 1) {
    return NextResponse.json(
      { error: 'single_host requires exactly one host.' },
      { status: 400 }
    );
  }
  if ((eventKind === 'collective' || eventKind === 'round_robin') && hosts.length < 2) {
    return NextResponse.json(
      { error: `${eventKind} requires 2+ hosts.` },
      { status: 400 }
    );
  }

  // Date range.
  const now = Date.now();
  const fromMs = searchParams.get('from')
    ? Date.parse(searchParams.get('from')!)
    : now;
  let toMs = searchParams.get('to')
    ? Date.parse(searchParams.get('to')!)
    : fromMs + 30 * 24 * 60 * 60 * 1000;
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    return NextResponse.json({ error: 'Invalid from/to.' }, { status: 400 });
  }
  if (toMs <= fromMs) {
    return NextResponse.json({ error: 'to must be after from.' }, { status: 400 });
  }
  const maxToMs = fromMs + MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;
  if (toMs > maxToMs) toMs = maxToMs;

  const slotMinutesParam = searchParams.get('slot_minutes');
  const slotMinutes = slotMinutesParam ? parseInt(slotMinutesParam, 10) : undefined;
  if (slotMinutes !== undefined && (!Number.isFinite(slotMinutes) || slotMinutes < 5 || slotMinutes > 240)) {
    return NextResponse.json({ error: 'slot_minutes must be 5-240.' }, { status: 400 });
  }

  // ── Verify every host is in this parent's school ───────────────────
  for (const h of hosts) {
    const ok = await hostInSchool(supabase, h, parent.schoolId);
    if (!ok) {
      return NextResponse.json(
        { error: `Host ${h.role}:${h.id.slice(0, 8)}… is not in your school.` },
        { status: 403 }
      );
    }
  }

  // ── Fetch availability data per host, then compute slots ───────────
  const slotsPerHost: OpenSlot[][] = [];
  for (const h of hosts) {
    const [rulesRes, blackoutsRes, bookingsRes] = await Promise.all([
      supabase
        .from('montree_availability_rules')
        .select('*')
        .eq('staff_role', h.role)
        .eq('staff_id', h.id)
        .eq('school_id', parent.schoolId),
      supabase
        .from('montree_availability_blackouts')
        .select('*')
        .eq('staff_role', h.role)
        .eq('staff_id', h.id)
        .eq('school_id', parent.schoolId)
        .gte('end_at', new Date(fromMs).toISOString())
        .lte('start_at', new Date(toMs).toISOString()),
      // Bookings: pull appointment_hosts joined to montree_appointments
      // where the host matches and the booking is not cancelled.
      supabase
        .from('montree_appointment_hosts')
        .select('appointment_id, montree_appointments!inner(scheduled_start, scheduled_end, status, school_id)')
        .eq('host_role', h.role)
        .eq('host_id', h.id)
        .eq('montree_appointments.school_id', parent.schoolId)
        .in('montree_appointments.status', ['pending', 'confirmed'])
        .gte('montree_appointments.scheduled_end', new Date(fromMs).toISOString())
        .lte('montree_appointments.scheduled_start', new Date(toMs).toISOString()),
    ]);

    if (rulesRes.error && rulesRes.error.code === '42P01') {
      return NextResponse.json(
        { error: 'Migration 216 not yet run.', migration_pending: true, slots: [] },
        { status: 503 }
      );
    }
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
      if (appt) {
        bookedRanges.push({ start: appt.scheduled_start, end: appt.scheduled_end });
      }
    }

    const open = computeOpenSlots({
      staffRole: h.role,
      staffId: h.id,
      rangeStart: new Date(fromMs).toISOString(),
      rangeEnd: new Date(toMs).toISOString(),
      slotDurationMinutes: slotMinutes,
      rules,
      blackouts,
      bookedRanges,
    });
    slotsPerHost.push(open);
  }

  // ── Combine per event_kind ─────────────────────────────────────────
  let combined: OpenSlot[];
  if (eventKind === 'collective') {
    // Every host must be free at the same time.
    combined = intersectSlots(slotsPerHost);
  } else if (eventKind === 'round_robin') {
    // ANY host being free works. Union of slot lists, dedup on start.
    const seen = new Set<string>();
    combined = [];
    for (const list of slotsPerHost) {
      for (const s of list) {
        if (!seen.has(s.start)) {
          seen.add(s.start);
          combined.push(s);
        }
      }
    }
    combined.sort((a, b) => a.start.localeCompare(b.start));
  } else {
    combined = slotsPerHost[0];
  }

  return NextResponse.json({ slots: combined, event_kind: eventKind, hosts });
}

// ── Helpers ───────────────────────────────────────────────────────────
function parseHosts(raw: string): HostKey[] {
  const out: HostKey[] = [];
  for (const piece of raw.split(',')) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const [role, id] = trimmed.split(':');
    if (role !== 'teacher' && role !== 'principal') continue;
    if (!id || !UUID_RE.test(id)) continue;
    out.push({ role, id });
  }
  return out;
}

async function hostInSchool(
  supabase: ReturnType<typeof getSupabase>,
  host: HostKey,
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
