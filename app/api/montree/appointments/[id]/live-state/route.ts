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
 * PATCH — staff: any subset of the five mutable fields (+ classPhase).
 *         Upserts on appointment_id and always stamps updated_at.
 *         STUDENT (the appointment's parent device): a single, deliberately
 *         tiny exception for the Lesson 1 book activity — see
 *         validateStudentPatch() below. Nothing else on this route is
 *         writable by a family.
 *
 * Both handlers are gated on the `dark_phonics_live` feature flag (404 when off).
 *
 * Reads/writes `montree_class_live_state`, defined in
 * migrations/334_dark_phonics_live.sql (section 5d) and extended by
 * migrations/341_writing_shelf_live_activities.sql (activity_type +
 * activity_state — the digitised Writing Shelf trays). Its column defaults and
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
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { DARK_PHONICS_LESSON_COUNT } from '@/lib/montree/dark-phonics/live-lesson';
import {
  ACTIVITY_ARRAY_MAX,
  ACTIVITY_ID_MAX,
  ACTIVITY_TEXT_MAX,
  ACTIVITY_TYPES,
  DEFAULT_ACTIVITY_STATE,
  parseActivityState,
  parseActivityType,
  type ActivityType,
  type LiveActivityState,
} from '@/lib/montree/dark-phonics/live-activities';
import { BOOK_WORKS_CARD_IDS } from '@/lib/montree/dark-phonics/book-works';
import {
  resolveDplParent,
  withDplCors,
  dplOptionsHandler,
} from '@/lib/montree/dark-phonics-live/app-auth';

export const dynamic = 'force-dynamic';

/** Standalone-app preflight. No-op for the website (which never preflights this). */
export const OPTIONS = dplOptionsHandler;

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
  activityType: ActivityType;
  activityState: LiveActivityState;
  updatedAt: string | null;
}

/** Mirrors the column defaults in migration 334 section 5d + migration 341. */
const DEFAULT_STATE: LiveState = {
  activeSceneIndex: 0,
  activeWordIndex: -1,
  tracingStepActive: false,
  tracingCompleted: 0,
  starsEarned: 0,
  classPhase: 'live',
  activityType: 'none',
  activityState: { ...DEFAULT_ACTIVITY_STATE },
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
  /** Missing until migration 341 is applied — parse helpers default them. */
  activity_type?: string | null;
  activity_state?: unknown;
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
    activityType: parseActivityType(row.activity_type),
    activityState: parseActivityState(row.activity_state),
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
    // Bearer (app) or cookie (website) — same return shape either way.
    const parentResult = await resolveDplParent(request, supabase);
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
  // withDplCors is a no-op unless the caller is an allow-listed app origin, so
  // every browser response is byte-identical to before.
  return withDplCors(await handleGET(request, context), request);
}

async function handleGET(
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
  activityType?: unknown;
  activityState?: unknown;
}

/** snake_case column patch, built from whichever camelCase keys were sent. */
type StatePatch = Partial<{
  active_scene_index: number;
  active_word_index: number;
  tracing_step_active: boolean;
  tracing_completed: number;
  stars_earned: number;
  class_phase: ClassPhase;
  activity_type: ActivityType;
  activity_state: LiveActivityState;
}>;

/* -------------------------------------------------------------------------- */
/* book-works: the ONE student-writable surface on this route                  */
/* -------------------------------------------------------------------------- */

/**
 * 🚨 THE ONLY THING A PARENT DEVICE MAY WRITE ANYWHERE IN THIS ROUTE.
 *
 * The Lesson 1 book activity has the CHILD dragging pictures on the family's
 * own screen — so the two fields that record what the child did have to be
 * written by that device. Everything else about the class stays teacher-driven,
 * and this branch is deliberately as narrow as it can be made:
 *
 *   - only when the row's CURRENT activity_type is already 'book-works'
 *     (the teacher must have put the activity on the stage first),
 *   - only the body key `activityState`, and inside it only `matched`/`drop`,
 *   - every value must be a known card id from the book-works content module,
 *   - the write is a read-merge-write of exactly those two keys — a student
 *     can never move the step, the round, the stars, or end the class.
 *
 * Anything else in a parent body is a 403, not a silent ignore.
 */
const STUDENT_MATCHED_MAX = 6;

const isCardId = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= ACTIVITY_ID_MAX && BOOK_WORKS_CARD_IDS.includes(v);

type StudentPatch = { matched?: string[]; drop?: string };

function validateStudentPatch(
  body: Record<string, unknown>
): { ok: true; value: StudentPatch } | { ok: false; error: string } {
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'activityState') {
    return { ok: false, error: 'a student may only send activityState' };
  }
  const a = body.activityState;
  if (typeof a !== 'object' || a === null || Array.isArray(a)) {
    return { ok: false, error: 'activityState must be an object' };
  }
  const inner = a as Record<string, unknown>;
  const innerKeys = Object.keys(inner);
  if (innerKeys.length === 0 || innerKeys.some((k) => k !== 'matched' && k !== 'drop')) {
    return { ok: false, error: 'a student may only send activityState.matched and activityState.drop' };
  }

  const value: StudentPatch = {};
  if (inner.matched !== undefined) {
    if (!Array.isArray(inner.matched) || inner.matched.length > STUDENT_MATCHED_MAX) {
      return { ok: false, error: `matched must be an array of at most ${STUDENT_MATCHED_MAX} card ids` };
    }
    if (!inner.matched.every(isCardId)) {
      return { ok: false, error: 'matched must contain known card ids only' };
    }
    // De-dupe: the same card can only be matched once.
    value.matched = Array.from(new Set(inner.matched as string[]));
  }
  if (inner.drop !== undefined) {
    if (!(inner.drop === '' || isCardId(inner.drop))) {
      return { ok: false, error: 'drop must be a known card id or an empty string' };
    }
    value.drop = inner.drop as string;
  }
  return { ok: true, value };
}

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

  if (body.activityType !== undefined) {
    // Mirrors the migration-343 CHECK constraint exactly (ACTIVITY_TYPES + 'none').
    const t = body.activityType;
    if (t !== 'none' && !(ACTIVITY_TYPES as readonly string[]).includes(t as string)) {
      return { ok: false, error: `activityType must be one of none|${ACTIVITY_TYPES.join('|')}` };
    }
    patch.activity_type = t as ActivityType;
  }

  if (body.activityState !== undefined) {
    if (typeof body.activityState !== 'object' || body.activityState === null || Array.isArray(body.activityState)) {
      return { ok: false, error: 'activityState must be an object' };
    }
    const a = body.activityState as Record<string, unknown>;
    for (const key of ['wordIndex', 'step', 'sayNonce', 'punct', 'round', 'qIndex'] as const) {
      if (a[key] !== undefined) {
        const r = intAtLeast(a[key], 0, 9999, `activityState.${key}`);
        if (!r.ok) return r;
      }
    }
    if (a.revealed !== undefined && typeof a.revealed !== 'boolean') {
      return { ok: false, error: 'activityState.revealed must be a boolean' };
    }
    for (const key of ['laid', 'order', 'marks'] as const) {
      const arr = a[key];
      if (arr === undefined) continue;
      if (!Array.isArray(arr) || arr.length > ACTIVITY_ARRAY_MAX) {
        return { ok: false, error: `activityState.${key} must be an array of at most ${ACTIVITY_ARRAY_MAX} integers` };
      }
      for (const x of arr) {
        const r = intAtLeast(x, 0, 9999, `activityState.${key}[]`);
        if (!r.ok) return r;
      }
    }
    if (a.text !== undefined) {
      if (typeof a.text !== 'string' || a.text.length > ACTIVITY_TEXT_MAX) {
        return { ok: false, error: `activityState.text must be a string of at most ${ACTIVITY_TEXT_MAX} characters` };
      }
    }
    // book-works: the two card-id fields. Even on the STAFF path these are
    // restricted to known card ids — the teacher's only legitimate write here
    // is the Reset control (matched: [], drop: '').
    if (a.matched !== undefined) {
      const bad = !Array.isArray(a.matched) || a.matched.length > STUDENT_MATCHED_MAX;
      if (bad || !(a.matched as unknown[]).every(isCardId)) {
        return { ok: false, error: `activityState.matched must be an array of at most ${STUDENT_MATCHED_MAX} known card ids` };
      }
    }
    if (a.drop !== undefined && !(a.drop === '' || isCardId(a.drop))) {
      return { ok: false, error: 'activityState.drop must be a known card id or an empty string' };
    }
    // Store the normalised full cursor — the jsonb column is replaced wholesale.
    patch.activity_state = parseActivityState(a);
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
  // Staff-only handler (unchanged); CORS is stamped for a packaged teacher
  // shell and stays a no-op for the browser.
  return withDplCors(await handlePATCH(request, context), request);
}

async function handlePATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await context.params;
  if (!UUID_RE.test(appointmentId)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // Staff drive the class. The ONE exception is the book-works student
    // branch below — see validateStudentPatch()'s header for why it exists and
    // how narrow it is.
    const staffResult = await verifySchoolRequest(request);
    const isStaff = !(staffResult instanceof NextResponse);

    const appointment = await loadAppointment(supabase, appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let schoolId: string;
    if (isStaff) {
      if (appointment.school_id && appointment.school_id !== staffResult.schoolId) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      schoolId = appointment.school_id ?? staffResult.schoolId;
    } else {
      // Resolved EXACTLY the way GET resolves a parent (same helper, same
      // appointment.parent_id check) — a device that cannot read this class
      // can never write to it.
      const parentResult = await resolveDplParent(request, supabase);
      if (parentResult instanceof NextResponse) {
        // Neither a staff session nor this appointment's parent.
        return staffResult as NextResponse;
      }
      if (appointment.parent_id && appointment.parent_id !== parentResult.parentId) {
        console.warn('[live-state:PATCH][SECURITY] parent tried to write another family\'s class');
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      schoolId = appointment.school_id ?? parentResult.schoolId ?? '';
    }

    const enabled = await isFeatureEnabled(supabase, schoolId, FEATURE_KEY);
    if (!enabled) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    let body: PatchBody;
    try {
      body = (await request.json()) as PatchBody;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    /* -------------------------------------------------- student branch -- */
    if (!isStaff) {
      const student = validateStudentPatch(body as Record<string, unknown>);
      if (!student.ok) {
        console.warn('[live-state:PATCH][SECURITY] refused student write:', student.error);
        return NextResponse.json({ error: 'forbidden', message: student.error }, { status: 403 });
      }

      const { data: liveRow } = await supabase
        .from(LIVE_STATE_TABLE)
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();
      const currentRow = (liveRow as LiveStateRow) ?? null;
      const current = toLiveState(currentRow);

      // The teacher must have put the book activity on the stage, and the
      // class must still be running. Otherwise there is nothing to write to.
      if (!currentRow || current.activityType !== 'book-works' || current.classPhase !== 'live') {
        return NextResponse.json({ error: 'forbidden', message: 'no book activity on the stage' }, { status: 403 });
      }

      // Read-merge-write of exactly matched/drop — every other cursor field
      // keeps whatever the teacher last set.
      const mergedState: LiveActivityState = { ...current.activityState, ...student.value };

      const { data: studentRow, error: studentWriteError } = await supabase
        .from(LIVE_STATE_TABLE)
        .update({ activity_state: mergedState, updated_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId)
        .select()
        .single();

      if (studentWriteError) {
        console.error('[live-state:PATCH] student write failed', studentWriteError);
        return NextResponse.json(
          { error: 'live_state_write_failed', message: studentWriteError.message },
          { status: 500 }
        );
      }

      const studentState = toLiveState((studentRow as LiveStateRow) ?? null);
      const studentLessonNumber = await resolveLessonNumber(supabase, appointmentId, appointment.child_id);
      return NextResponse.json({
        state: { ...studentState, lessonNumber: studentLessonNumber, lessonTotal: DARK_PHONICS_LESSON_COUNT },
      });
    }

    /* ---------------------------------------------------- staff branch -- */
    const parsed = validatePatch(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'invalid_body', message: parsed.error }, { status: 400 });
    }

    // 🚨 book-works is the one activity whose cursor has TWO writers, so its
    // activity_state is read-merge-written instead of replaced wholesale: a
    // teacher click must never clobber a match the child landed 200ms ago.
    // Every other tray keeps the original replace semantics byte-for-byte.
    if (parsed.value.activity_state !== undefined) {
      const switchingAway =
        body.activityType !== undefined && body.activityType !== 'book-works';
      if (!switchingAway) {
        const { data: liveRow } = await supabase
          .from(LIVE_STATE_TABLE)
          .select('activity_type, activity_state')
          .eq('appointment_id', appointmentId)
          .maybeSingle();
        const prior = (liveRow as Pick<LiveStateRow, 'activity_type' | 'activity_state'>) ?? null;
        if (prior && parseActivityType(prior.activity_type) === 'book-works') {
          parsed.value.activity_state = {
            ...parseActivityState(prior.activity_state),
            ...parsed.value.activity_state,
          };
        }
      }
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
