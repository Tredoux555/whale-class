/**
 * /api/montree/appointments/[id]/live-state
 *
 * The teacher→parent synchronisation channel for a Dark Phonics Live class.
 * Deliberately boring: no websockets, no realtime subscription. The teacher
 * PATCHes one row per interaction; the parent's classroom GETs it every ~2s.
 *
 * GET   — parent-of-this-appointment OR staff (`?as=` hint like the recap
 *         sibling). Returns the DEFAULT state when no row exists yet — a class
 *         that hasn't started is not a 404.
 * PATCH — staff only. Any subset of the five mutable fields (+ classPhase).
 *         Upserts on appointment_id and always stamps updated_at.
 *
 * Both handlers are gated on the `dark_phonics_live` feature flag (404 when off).
 *
 * Reads/writes `montree_class_live_state`, defined in
 * migrations/334_dark_phonics_live.sql (section 5d). Its column defaults and
 * DEFAULT_STATE below must stay in sync.
 *
 * GET also returns a computed, read-only `lessonNumber` (display 1..49) — the
 * appointment row does not carry which lesson is being taught, so it is derived
 * (recap row if one exists, else the child's next lesson in sequence). See
 * resolveLessonNumber() below.
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { DARK_PHONICS_LESSON_COUNT } from '@/lib/montree/dark-phonics/live-lesson';

export const dynamic = 'force-dynamic';

const FEATURE_KEY = 'dark_phonics_live';
const LIVE_STATE_TABLE = 'montree_class_live_state';
const RECAPS_TABLE = 'montree_class_recaps';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ClassPhase = 'live' | 'ended';

interface LiveState {
  activeSceneIndex: number;
  activeWordIndex: number;
  tracingStepActive: boolean;
  tracingCompleted: number;
  starsEarned: number;
  classPhase: ClassPhase;
  updatedAt: string | null;
}

/** Mirrors the column defaults in migration 334 section 5d. */
const DEFAULT_STATE: LiveState = {
  activeSceneIndex: 0,
  activeWordIndex: -1,
  tracingStepActive: false,
  tracingCompleted: 0,
  starsEarned: 0,
  classPhase: 'live',
  updatedAt: null,
};

interface LiveStateRow {
  appointment_id: string;
  active_scene_index: number | null;
  active_word_index: number | null;
  tracing_step_active: boolean | null;
  tracing_completed: number | null;
  stars_earned: number | null;
  class_phase: string | null;
  updated_at: string | null;
}

function toLiveState(row: LiveStateRow | null): LiveState {
  if (!row) return { ...DEFAULT_STATE };
  return {
    activeSceneIndex: row.active_scene_index ?? DEFAULT_STATE.activeSceneIndex,
    activeWordIndex: row.active_word_index ?? DEFAULT_STATE.activeWordIndex,
    tracingStepActive: row.tracing_step_active ?? DEFAULT_STATE.tracingStepActive,
    tracingCompleted: row.tracing_completed ?? DEFAULT_STATE.tracingCompleted,
    starsEarned: row.stars_earned ?? DEFAULT_STATE.starsEarned,
    classPhase: row.class_phase === 'ended' ? 'ended' : 'live',
    updatedAt: row.updated_at ?? null,
  };
}

interface AppointmentRow {
  id: string;
  school_id: string | null;
  parent_id: string | null;
  child_id: string | null;
  status: string | null;
}

async function loadAppointment(
  supabase: SupabaseClient,
  appointmentId: string
): Promise<AppointmentRow | null> {
  const { data } = await supabase
    .from('montree_appointments')
    .select('id, school_id, parent_id, child_id, status')
    .eq('id', appointmentId)
    .maybeSingle();
  return (data as AppointmentRow) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Lesson number — computed, read-only (contract: "lesson-number source of      */
/* truth"). The appointment row does not carry a lesson, so:                    */
/*   1. if this appointment already has a recap, that recap's lesson_number     */
/*      IS the lesson that was taught (the teacher recorded it);                */
/*   2. otherwise the class is the child's NEXT lesson in sequence =            */
/*      (count of that child's recaps) + 1, capped at 49.                       */
/* Supabase JS cannot express the join in one call, so this is two narrow       */
/* queries: the child's appointment ids, then a head-count of recaps against    */
/* them. Volume is tiny (a solo teacher, ≤49 classes per child ever).           */
/* -------------------------------------------------------------------------- */

async function resolveLessonNumber(
  supabase: SupabaseClient,
  appointmentId: string,
  childId: string | null
): Promise<number> {
  const { data: ownRecap } = await supabase
    .from(RECAPS_TABLE)
    .select('lesson_number')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  const recorded = (ownRecap as { lesson_number: number } | null)?.lesson_number;
  if (typeof recorded === 'number' && recorded >= 1) {
    return Math.min(recorded, DARK_PHONICS_LESSON_COUNT);
  }

  if (!childId) return 1;

  const { data: siblingAppointments } = await supabase
    .from('montree_appointments')
    .select('id')
    .eq('child_id', childId);

  const ids = ((siblingAppointments ?? []) as Array<{ id: string }>).map((a) => a.id);
  if (ids.length === 0) return 1;

  const { count } = await supabase
    .from(RECAPS_TABLE)
    .select('id', { count: 'exact', head: true })
    .in('appointment_id', ids);

  return Math.min((count ?? 0) + 1, DARK_PHONICS_LESSON_COUNT);
}

/* -------------------------------------------------------------------------- */
/* Shared auth — parent-of-this-appointment OR staff, `?as=` hint              */
/* -------------------------------------------------------------------------- */

type AuthOutcome =
  | { ok: true; schoolId: string }
  | { ok: false; response: NextResponse };

/**
 * Same shape as the recap sibling's GET: parent-first (this route exists for
 * the parent classroom's 2s poll), staff allowed via `?as=teacher`.
 */
async function authorizeRead(
  request: NextRequest,
  supabase: SupabaseClient,
  appointment: AppointmentRow
): Promise<AuthOutcome> {
  const hint = request.nextUrl.searchParams.get('as');
  let authorized = false;
  let schoolId = appointment.school_id ?? '';

  if (hint === 'teacher' || hint === 'staff') {
    const staffResult = await verifySchoolRequest(request);
    if (
      !(staffResult instanceof NextResponse) &&
      (!appointment.school_id || staffResult.schoolId === appointment.school_id)
    ) {
      authorized = true;
      schoolId = staffResult.schoolId;
    }
  } else {
    const parentResult = await resolveAppointmentsParent(supabase);
    if (
      !(parentResult instanceof NextResponse) &&
      (!appointment.parent_id || appointment.parent_id === parentResult.parentId)
    ) {
      authorized = true;
      schoolId = parentResult.schoolId ?? schoolId;
    }
  }

  if (!authorized) {
    return { ok: false, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  return { ok: true, schoolId };
}

/* -------------------------------------------------------------------------- */
/* GET — parent (polling every ~2s) or staff                                   */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await context.params;
  if (!UUID_RE.test(appointmentId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    const appointment = await loadAppointment(supabase, appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const auth = await authorizeRead(request, supabase, appointment);
    if (!auth.ok) return auth.response;

    const enabled = await isFeatureEnabled(supabase, auth.schoolId, FEATURE_KEY);
    if (!enabled) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const { data: row, error: readError } = await supabase
      .from(LIVE_STATE_TABLE)
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (readError) {
      console.error('[live-state:GET] read failed', readError);
      return NextResponse.json(
        { error: 'live_state_read_failed', message: readError.message },
        { status: 500 }
      );
    }

    // No row yet = class hasn't started. Serve the defaults, never a 404.
    const state = toLiveState((row as LiveStateRow) ?? null);
    const lessonNumber = await resolveLessonNumber(
      supabase,
      appointmentId,
      appointment.child_id
    );

    return NextResponse.json({
      state: { ...state, lessonNumber, lessonTotal: DARK_PHONICS_LESSON_COUNT },
    });
  } catch (err) {
    console.error('[live-state:GET] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/* PATCH — staff only. The teacher drives the class from here.                 */
/* -------------------------------------------------------------------------- */

interface PatchBody {
  activeSceneIndex?: unknown;
  activeWordIndex?: unknown;
  tracingStepActive?: unknown;
  tracingCompleted?: unknown;
  starsEarned?: unknown;
  classPhase?: unknown;
}

/** snake_case column patch, built from whichever camelCase keys were sent. */
type StatePatch = Partial<{
  active_scene_index: number;
  active_word_index: number;
  tracing_step_active: boolean;
  tracing_completed: number;
  stars_earned: number;
  class_phase: ClassPhase;
}>;

function validatePatch(
  body: PatchBody
): { ok: true; value: StatePatch } | { ok: false; error: string } {
  const patch: StatePatch = {};

  // -1 is the "nothing selected" sentinel for both index columns (see the
  // migration comment); anything below that is a client bug, not a state.
  const intAtLeast = (raw: unknown, min: number, max: number, label: string):
    | { ok: true; value: number }
    | { ok: false; error: string } => {
    if (typeof raw !== 'number' || !Number.isInteger(raw)) {
      return { ok: false, error: `${label} must be an integer` };
    }
    if (raw < min || raw > max) {
      return { ok: false, error: `${label} must be an integer ${min}..${max}` };
    }
    return { ok: true, value: raw };
  };

  if (body.activeSceneIndex !== undefined) {
    const r = intAtLeast(body.activeSceneIndex, -1, 999, 'activeSceneIndex');
    if (!r.ok) return r;
    patch.active_scene_index = r.value;
  }

  if (body.activeWordIndex !== undefined) {
    const r = intAtLeast(body.activeWordIndex, -1, 999, 'activeWordIndex');
    if (!r.ok) return r;
    patch.active_word_index = r.value;
  }

  if (body.tracingStepActive !== undefined) {
    if (typeof body.tracingStepActive !== 'boolean') {
      return { ok: false, error: 'tracingStepActive must be a boolean' };
    }
    patch.tracing_step_active = body.tracingStepActive;
  }

  if (body.tracingCompleted !== undefined) {
    const r = intAtLeast(body.tracingCompleted, 0, 999, 'tracingCompleted');
    if (!r.ok) return r;
    patch.tracing_completed = r.value;
  }

  if (body.starsEarned !== undefined) {
    // Same 0..100 bound the recap route enforces on its stars_earned.
    const r = intAtLeast(body.starsEarned, 0, 100, 'starsEarned');
    if (!r.ok) return r;
    patch.stars_earned = r.value;
  }

  if (body.classPhase !== undefined) {
    if (body.classPhase !== 'live' && body.classPhase !== 'ended') {
      return { ok: false, error: "classPhase must be 'live' or 'ended'" };
    }
    patch.class_phase = body.classPhase;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'no recognised fields to update' };
  }

  return { ok: true, value: patch };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await context.params;
  if (!UUID_RE.test(appointmentId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Staff auth only — parents observe, they never drive the class.
    const staffResult = await verifySchoolRequest(request);
    if (staffResult instanceof NextResponse) return staffResult;
    const staff = staffResult;

    const appointment = await loadAppointment(supabase, appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (appointment.school_id && appointment.school_id !== staff.schoolId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const enabled = await isFeatureEnabled(
      supabase,
      appointment.school_id ?? staff.schoolId,
      FEATURE_KEY
    );
    if (!enabled) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let body: PatchBody;
    try {
      body = (await request.json()) as PatchBody;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const parsed = validatePatch(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'invalid_body', message: parsed.error }, { status: 400 });
    }

    // appointment_id is the PRIMARY KEY, so onConflict on it is valid and this
    // is a true "create the row on first interaction, patch it thereafter".
    // Columns not named here keep their value (existing row) or take their
    // column default (first write) — which is exactly DEFAULT_STATE.
    const { data: row, error: writeError } = await supabase
      .from(LIVE_STATE_TABLE)
      .upsert(
        {
          appointment_id: appointmentId,
          ...parsed.value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'appointment_id' }
      )
      .select()
      .single();

    if (writeError) {
      console.error('[live-state:PATCH] write failed', writeError);
      return NextResponse.json(
        { error: 'live_state_write_failed', message: writeError.message },
        { status: 500 }
      );
    }

    const state = toLiveState((row as LiveStateRow) ?? null);
    const lessonNumber = await resolveLessonNumber(
      supabase,
      appointmentId,
      appointment.child_id
    );

    return NextResponse.json({
      state: { ...state, lessonNumber, lessonTotal: DARK_PHONICS_LESSON_COUNT },
    });
  } catch (err) {
    console.error('[live-state:PATCH] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
