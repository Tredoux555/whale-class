// POST /api/lens/assessment/sessions — start a check-in
// GET  /api/lens/assessment/sessions — her check-ins, newest first
//
// 🚨 THE CHILD IS A NAME SHE TYPES. Lens has no roster, so `child_alias` is
// free text and is stored exactly as given. That is a deliberate limitation of
// this product, not an oversight: a visiting consultant has no enrolment data
// and no business building a shadow copy of somebody else's.
//
// 🚨 NO RESUME-BY-CHILD. The Montree copy of this route resumes an existing
// sitting when the same child/year/window/mode is started twice, because there
// a child id is an identity. Here the same alias may be two different children,
// so starting a check-in ALWAYS creates a new row and resuming is done by
// session id from the list screen.

import { NextResponse, type NextRequest } from 'next/server';
import { ageBandFromMonths, defaultFormForWindow, getBankIndex } from '@/lib/montree/evaluation/bank';
import {
  AGE_MONTHS_MAX, AGE_MONTHS_MIN, ALL_MODULE_IDS, CORE_MODULE_IDS,
  isAgeBand, isDeliveryMode, isWindowCode, schoolYearFor,
} from '@/lib/montree/evaluation/constants';
import type { AgeBand, DeliveryMode, FormCode, WindowCode } from '@/lib/montree/evaluation/types';
import { lensDb, listSchools, loadOwnedSchool } from '@/lib/lens/db';
import {
  badRequest, intOrNull, lensError, notFound, readJson, requireObserver, requiredText, text,
} from '@/lib/lens/route-helpers';
import { assertAssessmentSchemaReady, assessmentDb } from '@/lib/lens/assessment/bridge';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** The columns the list screen needs. Deliberately not `*` — a list is not a detail. */
const LIST_COLUMNS =
  'id, observer_id, school_id, classroom_id, child_alias, child_age_months, school_year, ' +
  'window_code, age_band, form_code, modules, delivery_mode, source, status, started_at, ' +
  'completed_at, map_percent, map_denominator, map_suppressed, milestones_secure, ' +
  'milestones_developing, milestones_emerging, milestones_unassessed, bank_version';

export async function GET(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  try {
    const supabase = lensDb();
    const { data, error } = await supabase
      .from('lens_assessment_sessions')
      .select(LIST_COLUMNS)
      // Every read is scoped to the signed-in observer. There is no code path in
      // this feature that lists a session without this line.
      .eq('observer_id', session.observerId)
      .order('started_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    const schools = await listSchools(supabase, session.observerId);
    const schoolName = new Map(schools.map((s) => [s.id, s.name]));
    const rows = (data ?? []) as unknown as Array<{ school_id: string }>;
    return NextResponse.json({
      sessions: rows.map((s) => ({
        ...s,
        school_name: schoolName.get(s.school_id) ?? 'Unknown school',
      })),
      schools,
    });
  } catch (error) {
    return lensError('assessment:sessions:get', error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  const schoolId = requiredText(body.school_id, 64);
  if (!schoolId) return badRequest('Pick a school.');

  const childAlias = requiredText(body.child_alias, 120);
  if (!childAlias) return badRequest('Type a name or alias for the child.');

  const ageMonths = intOrNull(body.child_age_months, AGE_MONTHS_MIN, AGE_MONTHS_MAX);
  if (body.child_age_months !== undefined && body.child_age_months !== null && ageMonths === null) {
    return badRequest(`This check-in covers ${AGE_MONTHS_MIN}–${AGE_MONTHS_MAX} months (2–7 years).`);
  }

  // Band from the age when she gave one, or her explicit choice. One of the two
  // is required — a band cannot be guessed and must never be defaulted, because
  // the whole instrument is calibrated against it.
  let ageBand: AgeBand;
  if (body.age_band !== undefined && body.age_band !== null) {
    if (!isAgeBand(body.age_band)) return badRequest('Pick an age band (A3, A4, A5 or G1).');
    ageBand = body.age_band;
  } else if (ageMonths !== null) {
    ageBand = ageBandFromMonths(ageMonths);
  } else {
    return badRequest('Give the child’s age in months, or pick an age band.');
  }

  const windowCode: WindowCode = isWindowCode(body.window_code) ? body.window_code : 'autumn';
  const formCode: FormCode = body.form_code === 'B' ? 'B' : (body.form_code === 'A' ? 'A' : defaultFormForWindow(windowCode));
  const deliveryMode: DeliveryMode = isDeliveryMode(body.delivery_mode) ? body.delivery_mode : 'tablet';
  const schoolYear = text(body.school_year, 20) ?? schoolYearFor();

  const requested = Array.isArray(body.modules) && body.modules.length
    ? (body.modules.filter((m: unknown) => typeof m === 'string') as string[])
    : [...CORE_MODULE_IDS];
  const unknownModules = requested.filter((m) => !(ALL_MODULE_IDS as readonly string[]).includes(m));
  if (unknownModules.length) return badRequest(`I don’t know these modules: ${unknownModules.join(', ')}.`);

  try {
    const supabase = assessmentDb();

    const school = await loadOwnedSchool(supabase, session.observerId, schoolId);
    if (!school) return notFound('That school isn’t on your list.');

    // A room is optional, but a room that is named must actually be in that
    // school — refused, never silently dropped, so a mis-paste cannot produce a
    // check-in filed against a room she never entered.
    let classroomId: string | null = null;
    const requestedRoom = text(body.classroom_id, 64);
    if (requestedRoom) {
      const { data, error } = await supabase
        .from('lens_classrooms')
        .select('id, school_id')
        .eq('id', requestedRoom)
        .maybeSingle();
      if (error) throw error;
      const room = data as { id: string; school_id: string } | null;
      if (!room || room.school_id !== school.id) {
        return badRequest('That classroom isn’t in that school.');
      }
      classroomId = room.id;
    }

    const schemaProblem = await assertAssessmentSchemaReady(supabase);
    if (schemaProblem) return schemaProblem;

    const { bank } = getBankIndex();

    const { data, error } = await supabase
      .from('lens_assessment_sessions')
      .insert({
        observer_id: session.observerId,
        school_id: school.id,
        classroom_id: classroomId,
        child_alias: childAlias,
        child_age_months: ageMonths,
        school_year: schoolYear,
        window_code: windowCode,
        age_band: ageBand,
        form_code: formCode,
        modules: requested,
        delivery_mode: deliveryMode,
        source: deliveryMode === 'paper' ? 'paper_entry' : 'lens_ui',
        assessment_locale: 'en',
        bank_version: bank.bankVersion,
        bank_checksum: bank.bankChecksum,
        status: 'in_progress',
        notes: text(body.notes, 2000),
      })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json(
      { ok: true, session: data, bankVersion: bank.bankVersion, bankChecksum: bank.bankChecksum },
      { status: 201 },
    );
  } catch (error) {
    return lensError('assessment:sessions:post', error);
  }
}
