/**
 * /api/montree/appointments/[id]/recap
 *
 * POST — staff-only. Called by the teacher's "End Class" button. Writes the
 *        parent-facing recap for a finished Dark Phonics Live class.
 * GET  — parent-auth gated (staff also allowed). Feeds
 *        `app/montree/parent/recap/[appointmentId]/page.tsx`.
 *
 * Both handlers are gated on the `dark_phonics_live` feature flag (404 when off).
 *
 * Reads/writes `montree_class_recaps`, defined in
 * migrations/334_dark_phonics_live.sql (section 5b) alongside the credits
 * ledger and the whiteboard room column this feature also needs.
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { DARK_PHONICS_LESSON_COUNT, rawLessonNumber } from '@/lib/montree/dark-phonics/live-lesson';
import { RAW } from '@/lib/montree/dark-phonics/lessons';

export const dynamic = 'force-dynamic';

const FEATURE_KEY = 'dark_phonics_live';
const RECAPS_TABLE = 'montree_class_recaps';

interface AppointmentRow {
  id: string;
  school_id: string | null;
  parent_id: string | null;
  child_id: string | null;
  status: string | null;
  scheduled_start: string | null;
}

async function loadAppointment(
  supabase: SupabaseClient,
  appointmentId: string
): Promise<AppointmentRow | null> {
  const { data } = await supabase
    .from('montree_appointments')
    .select('id, school_id, parent_id, child_id, status, scheduled_start')
    .eq('id', appointmentId)
    .maybeSingle();
  return (data as AppointmentRow) ?? null;
}

/** Display lesson number (1..49) → the `sound` field off the RAW curriculum list. */
function soundForLessonNumber(lessonNumber: number): string {
  return RAW.find((l) => l.n === rawLessonNumber(lessonNumber))?.sound ?? '';
}

/** Null-safe montree_children.name lookup, for the recap's `childName`. */
async function childNameFor(
  supabase: SupabaseClient,
  childId: string | null
): Promise<string | null> {
  if (!childId) return null;
  const { data } = await supabase
    .from('montree_children')
    .select('name')
    .eq('id', childId)
    .maybeSingle();
  return (data as { name: string | null } | null)?.name ?? null;
}

/** Shared enrichment: adds `sound`, `scheduledStart`, `childName` to a recap row for both GET and POST. */
async function enrichRecap<T extends { lesson_number: number }>(
  supabase: SupabaseClient,
  recap: T,
  appointment: AppointmentRow
): Promise<T & { sound: string; scheduledStart: string | null; childName: string | null }> {
  const childName = await childNameFor(supabase, appointment.child_id);
  return {
    ...recap,
    sound: soundForLessonNumber(recap.lesson_number),
    scheduledStart: appointment.scheduled_start,
    childName,
  };
}

interface RecapBody {
  lessonNumber?: number;
  wordsDrilled?: string[];
  /** Contract spells this all-lowercase; accepted as an alias. */
  wordsdrilled?: string[];
  starsEarned?: number;
  teacherNote?: string;
}

function validateBody(body: RecapBody): { ok: true; value: Required<Omit<RecapBody, 'wordsdrilled'>> } | { ok: false; error: string } {
  const lessonNumber = Number(body.lessonNumber);
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > DARK_PHONICS_LESSON_COUNT) {
    return { ok: false, error: `lessonNumber must be an integer 1..${DARK_PHONICS_LESSON_COUNT}` };
  }

  const rawWords = body.wordsDrilled ?? body.wordsdrilled ?? [];
  if (!Array.isArray(rawWords) || rawWords.some((w) => typeof w !== 'string')) {
    return { ok: false, error: 'wordsDrilled must be an array of strings' };
  }
  const wordsDrilled = rawWords.map((w) => w.trim()).filter(Boolean).slice(0, 200);

  const starsEarned = Number(body.starsEarned ?? 0);
  if (!Number.isInteger(starsEarned) || starsEarned < 0 || starsEarned > 100) {
    return { ok: false, error: 'starsEarned must be an integer 0..100' };
  }

  const teacherNote = typeof body.teacherNote === 'string' ? body.teacherNote.trim().slice(0, 2000) : '';

  return { ok: true, value: { lessonNumber, wordsDrilled, starsEarned, teacherNote } };
}

/* -------------------------------------------------------------------------- */
/* POST — staff only                                                          */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await context.params;

  try {
    const supabase = getSupabase();

    // Staff auth only — no `?as=` disambiguation here, parents cannot write
    // recaps. verifySchoolRequest() returns the resolved staff identity or an
    // already-built NextResponse (401/403) — same discriminated-union shape
    // used across every sibling route, read directly from agora-token/route.ts.
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

    let body: RecapBody;
    try {
      body = (await request.json()) as RecapBody;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const parsed = validateBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: 'invalid_body', message: parsed.error }, { status: 400 });
    }

    const { lessonNumber, wordsDrilled, starsEarned, teacherNote } = parsed.value;

    // Upsert on appointment_id so a teacher re-submitting "End Class" corrects
    // the recap instead of creating a duplicate. Requires the unique index noted
    // in the migration block above.
    const { data: recap, error: writeError } = await supabase
      .from(RECAPS_TABLE)
      .upsert(
        {
          appointment_id: appointmentId,
          lesson_number: lessonNumber,
          words_drilled: wordsDrilled,
          stars_earned: starsEarned,
          teacher_note: teacherNote,
          created_by: staff.userId,
        },
        { onConflict: 'appointment_id' }
      )
      .select()
      .single();

    if (writeError) {
      console.error('[recap:POST] write failed', writeError);
      return NextResponse.json(
        { error: 'recap_write_failed', message: writeError.message },
        { status: 500 }
      );
    }

    const enriched = await enrichRecap(
      supabase,
      recap as { lesson_number: number },
      appointment
    );

    return NextResponse.json(
      { recap: { ...enriched, lessonTotal: DARK_PHONICS_LESSON_COUNT } },
      { status: 201 }
    );
  } catch (err) {
    console.error('[recap:POST] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/* GET — parent (or staff) reads the recap for the shareable card              */
/* -------------------------------------------------------------------------- */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await context.params;

  try {
    const supabase = getSupabase();

    const appointment = await loadAppointment(supabase, appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Parent-first (this endpoint exists for the parent recap page); staff may
    // also read it for QA via `?as=teacher`.
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
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const enabled = await isFeatureEnabled(supabase, schoolId, FEATURE_KEY);
    if (!enabled) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const { data: recap, error: readError } = await supabase
      .from(RECAPS_TABLE)
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();

    if (readError) {
      console.error('[recap:GET] read failed', readError);
      return NextResponse.json(
        { error: 'recap_read_failed', message: readError.message },
        { status: 500 }
      );
    }
    if (!recap) {
      return NextResponse.json({ error: 'recap_not_ready' }, { status: 404 });
    }

    const enriched = await enrichRecap(
      supabase,
      recap as { lesson_number: number },
      appointment
    );

    return NextResponse.json({
      recap: { ...enriched, lessonTotal: DARK_PHONICS_LESSON_COUNT },
    });
  } catch (err) {
    console.error('[recap:GET] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
