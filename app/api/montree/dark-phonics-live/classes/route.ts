/**
 * GET /api/montree/dark-phonics-live/classes
 *
 * The Online Classes list. Parent by default (their own children's classes);
 * staff school-wide via `?as=teacher`.
 *
 * "A Dark Phonics Live class" is not a column on montree_appointments — the
 * defining fact is that a credit was burned for it, i.e. the appointment has a
 * `class_booked` row in montree_class_credits_ledger. That ledger row IS the
 * filter (the partial unique index in migration 334 guarantees at most one per
 * appointment), which keeps ordinary parent-teacher appointments out of this
 * list without needing a new column.
 *
 * Gated on the `dark_phonics_live` feature flag (404 when off).
 *
 * 200 → { upcoming: Appointment[], past: Array<Appointment & {hasRecap:boolean}> }
 *       Appointment = {id, childId, childName, scheduledStart, scheduledEnd,
 *                      durationMinutes, status}
 *       upcoming = scheduled_start >= now AND status in ('pending','confirmed'),
 *       newest-last (soonest first); past = everything else, newest first.
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export const dynamic = 'force-dynamic';

const FEATURE_KEY = 'dark_phonics_live';
const LEDGER_TABLE = 'montree_class_credits_ledger';
const RECAPS_TABLE = 'montree_class_recaps';
/** Ceiling on the school-wide staff sweep before the ledger filter narrows it. */
const STAFF_SCAN_LIMIT = 500;

interface AppointmentDto {
  id: string;
  childId: string | null;
  childName: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  durationMinutes: number | null;
  status: string | null;
}

interface AppointmentRow {
  id: string;
  child_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  duration_minutes: number | null;
  status: string | null;
}

const APPOINTMENT_COLUMNS =
  'id, child_id, scheduled_start, scheduled_end, duration_minutes, status';

/** Statuses that keep a future-dated class in the "upcoming" bucket. */
const UPCOMING_STATUSES = new Set(['pending', 'confirmed']);

/** Appointment ids that had a credit burned for them (= real DPL classes). */
async function bookedAppointmentIds(
  supabase: SupabaseClient,
  filter: { parentId?: string; appointmentIds?: string[] }
): Promise<string[]> {
  let query = supabase
    .from(LEDGER_TABLE)
    .select('appointment_id')
    .eq('reason', 'class_booked')
    .not('appointment_id', 'is', null);

  if (filter.parentId) query = query.eq('parent_id', filter.parentId);
  if (filter.appointmentIds) query = query.in('appointment_id', filter.appointmentIds);

  const { data, error } = await query;
  if (error) {
    console.error('[dark-phonics-live/classes] ledger read failed', error);
    return [];
  }

  const ids = ((data ?? []) as Array<{ appointment_id: string | null }>)
    .map((r) => r.appointment_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  return Array.from(new Set(ids));
}

/** One query for every child name on the page, stitched in TS. */
async function childNames(
  supabase: SupabaseClient,
  childIds: string[]
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (childIds.length === 0) return names;

  const { data } = await supabase
    .from('montree_children')
    .select('id, name')
    .in('id', childIds);

  for (const row of (data ?? []) as Array<{ id: string; name: string | null }>) {
    names.set(row.id, row.name ?? '');
  }
  return names;
}

/** One query for "which of these past classes already have a recap". */
async function recappedAppointmentIds(
  supabase: SupabaseClient,
  appointmentIds: string[]
): Promise<Set<string>> {
  if (appointmentIds.length === 0) return new Set();

  const { data } = await supabase
    .from(RECAPS_TABLE)
    .select('appointment_id')
    .in('appointment_id', appointmentIds);

  return new Set(
    ((data ?? []) as Array<{ appointment_id: string }>).map((r) => r.appointment_id)
  );
}

function toDto(row: AppointmentRow, names: Map<string, string>): AppointmentDto {
  return {
    id: row.id,
    childId: row.child_id,
    childName: row.child_id ? names.get(row.child_id) ?? '' : '',
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    durationMinutes: row.duration_minutes,
    status: row.status,
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const asTeacher = ['teacher', 'staff'].includes(
      request.nextUrl.searchParams.get('as') ?? ''
    );

    let rows: AppointmentRow[] = [];

    if (asTeacher) {
      // --- staff: school-wide -------------------------------------------------
      const staffResult = await verifySchoolRequest(request);
      if (staffResult instanceof NextResponse) return staffResult;
      const staff = staffResult;

      const enabled = await isFeatureEnabled(supabase, staff.schoolId, FEATURE_KEY);
      if (!enabled) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }

      // The ledger has no school_id, so the school scope has to come from the
      // appointments side first; the ledger then narrows it to real DPL rows.
      // provider='agora' is set on every DPL booking (see the book route) and
      // cheaply removes the bulk of ordinary appointments before the ledger hop.
      const { data, error } = await supabase
        .from('montree_appointments')
        .select(APPOINTMENT_COLUMNS)
        .eq('school_id', staff.schoolId)
        .eq('provider', 'agora')
        .order('scheduled_start', { ascending: false })
        .limit(STAFF_SCAN_LIMIT);

      if (error) {
        console.error('[dark-phonics-live/classes] staff appointment read failed', error);
        return NextResponse.json({ error: 'classes_read_failed' }, { status: 500 });
      }

      const candidates = (data ?? []) as AppointmentRow[];
      const booked = new Set(
        await bookedAppointmentIds(supabase, {
          appointmentIds: candidates.map((a) => a.id),
        })
      );
      rows = candidates.filter((a) => booked.has(a.id));
    } else {
      // --- parent: their own classes -------------------------------------------
      const parentResult = await resolveAppointmentsParent(supabase);
      if (parentResult instanceof NextResponse) return parentResult;
      const parent = parentResult;

      const enabled = await isFeatureEnabled(supabase, parent.schoolId, FEATURE_KEY);
      if (!enabled) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }

      // Ledger first: the parent's own class_booked rows name exactly the
      // appointments that are DPL classes they paid for.
      const ids = await bookedAppointmentIds(supabase, { parentId: parent.parentId });
      if (ids.length === 0) {
        return NextResponse.json({ upcoming: [], past: [] });
      }

      const { data, error } = await supabase
        .from('montree_appointments')
        .select(APPOINTMENT_COLUMNS)
        .in('id', ids)
        // Belt and braces: the ledger rows are already this parent's, but the
        // appointment read is re-scoped so a mis-attributed ledger row can
        // never leak another family's class.
        .eq('parent_id', parent.parentId);

      if (error) {
        console.error('[dark-phonics-live/classes] parent appointment read failed', error);
        return NextResponse.json({ error: 'classes_read_failed' }, { status: 500 });
      }
      rows = (data ?? []) as AppointmentRow[];
    }

    if (rows.length === 0) {
      return NextResponse.json({ upcoming: [], past: [] });
    }

    // --- split into upcoming / past -------------------------------------------
    const now = Date.now();
    const upcomingRows: AppointmentRow[] = [];
    const pastRows: AppointmentRow[] = [];

    for (const row of rows) {
      const startMs = row.scheduled_start ? new Date(row.scheduled_start).getTime() : NaN;
      const isUpcoming =
        !Number.isNaN(startMs) &&
        startMs >= now &&
        UPCOMING_STATUSES.has(row.status ?? '');
      (isUpcoming ? upcomingRows : pastRows).push(row);
    }

    const startMsOf = (row: AppointmentRow): number => {
      const ms = row.scheduled_start ? new Date(row.scheduled_start).getTime() : NaN;
      return Number.isNaN(ms) ? 0 : ms;
    };
    upcomingRows.sort((a, b) => startMsOf(a) - startMsOf(b)); // soonest first
    pastRows.sort((a, b) => startMsOf(b) - startMsOf(a)); // most recent first

    // --- stitch child names + recap flags ---------------------------------------
    const names = await childNames(
      supabase,
      Array.from(
        new Set(
          rows
            .map((r) => r.child_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      )
    );
    const recapped = await recappedAppointmentIds(
      supabase,
      pastRows.map((r) => r.id)
    );

    return NextResponse.json({
      upcoming: upcomingRows.map((row) => toDto(row, names)),
      past: pastRows.map((row) => ({
        ...toDto(row, names),
        hasRecap: recapped.has(row.id),
      })),
    });
  } catch (err) {
    console.error('[dark-phonics-live/classes:GET] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
