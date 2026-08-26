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
//
// 🚨 THE WINDOW IS DERIVED FROM THE DATE, NEVER DEFAULTED TO AUTUMN. It used to
// fall back to 'autumn' whatever the month, which quietly filed a May sitting as
// an autumn one and made the whole longitudinal picture untrue. It is now
// windowForDate() — the same Sep–Dec / Jan–Mar / Apr–Aug mapping Montree uses —
// and the observer confirms or overrides it on the setup screen.
//
// 🚨 THE OBSERVATION MODULE NEEDS SOMEBODY WHO KNOWS THE CHILD. M-OBS asks an
// adult to rate what they have already seen over weeks. A visiting observer has
// not seen it, so unless she says at setup that she is rating alongside the
// child's own teacher, that module is stripped here — once, on the server, so
// the bank projection, the runner, the paper grid and the scorer all inherit it.
// See lib/lens/assessment/session-facts.ts.

import { NextResponse, type NextRequest } from 'next/server';
import { ageBandFromMonths, defaultFormForWindow, getBankIndex } from '@/lib/montree/evaluation/bank';
import {
  AGE_MONTHS_MAX, AGE_MONTHS_MIN, ALL_MODULE_IDS, CORE_MODULE_IDS,
  isAgeBand, isDeliveryMode, isWindowCode,
} from '@/lib/montree/evaluation/constants';
import { schoolYearForDate, windowForDate } from '@/lib/montree/evaluation/runner-engine';
import type { AgeBand, DeliveryMode, FormCode, WindowCode } from '@/lib/montree/evaluation/types';
import { lensDb, listSchools, loadOwnedSchool } from '@/lib/lens/db';
import {
  badRequest, intOrNull, lensError, notFound, readJson, requireObserver, requiredText, text,
} from '@/lib/lens/route-helpers';
import { assertAssessmentSchemaReady, assessmentDb } from '@/lib/lens/assessment/bridge';
import {
  allowedModules, buildSessionFacts, comparabilityFlags, readSessionFacts,
} from '@/lib/lens/assessment/session-facts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * The columns the list screen needs. Deliberately not `*` — a list is not a
 * detail. `summary_json` is read for one boolean (co_rated) and dropped again
 * before the response; see the GET handler.
 */
const LIST_COLUMNS =
  'id, observer_id, school_id, classroom_id, child_alias, child_age_months, school_year, ' +
  'window_code, age_band, form_code, modules, delivery_mode, source, status, started_at, ' +
  'completed_at, map_percent, map_denominator, map_suppressed, milestones_secure, ' +
  'milestones_developing, milestones_emerging, milestones_unassessed, bank_version, summary_json';

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
    const rows = (data ?? []) as unknown as Array<{
      id: string; school_id: string; child_alias: string; age_band: string; form_code: string;
      school_year: string; window_code: string; status: string; completed_at: string | null;
      summary_json: unknown;
    }>;

    // 🚨 SAME NAME IS NOT SAME CHILD. Sessions filed under an identical alias at
    // the same school are returned as UNCONFIRMED possibilities under their own
    // key, never merged into the row itself and never differenced. A UI may show
    // them as "possible earlier check-ins"; it may not draw a comparison until a
    // person has said, for that pair, that it is the same person.
    // See lib/lens/assessment/session-facts.ts and listPossibleAliasMatches().
    const possibleMatches: Record<string, Array<{
      id: string; school_year: string; window_code: string; age_band: string;
      form_code: string; completed_at: string | null; comparabilityFlags: string[];
      confirmedSameChild: false;
    }>> = {};
    const finished = rows.filter((r) => r.status === 'completed');
    for (const row of rows) {
      const siblings = finished.filter(
        (o) => o.id !== row.id
          && o.school_id === row.school_id
          && (o.child_alias ?? '').trim() === (row.child_alias ?? '').trim(),
      );
      if (!siblings.length) continue;
      possibleMatches[row.id] = siblings.map((o) => ({
        id: o.id,
        school_year: o.school_year,
        window_code: o.window_code,
        age_band: o.age_band,
        form_code: o.form_code,
        completed_at: o.completed_at,
        comparabilityFlags: comparabilityFlags(row, o),
        confirmedSameChild: false as const,
      }));
    }

    return NextResponse.json({
      sessions: rows.map(({ summary_json, ...s }) => ({
        ...s,
        school_name: schoolName.get(s.school_id) ?? 'Unknown school',
        // Flattened to the one fact a list row needs. The blob itself is read
        // here and dropped: a finished summary carries every domain and strand,
        // and shipping two hundred of them to a list screen would be a payload
        // the size of the bank for a single boolean.
        co_rated: readSessionFacts(summary_json).coRated,
      })),
      schools,
      possibleMatches,
      possibleMatchesNote:
        'Unconfirmed. Grouped only by an identical name at the same school — Lens keeps no roster, '
        + 'so these may be different children. Never compare two of them without an explicit confirmation.',
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

  // The window is a fact about WHEN the sitting happened, so it is derived from
  // today's date and only overridden by a deliberate, valid choice. A bad value
  // is refused rather than silently corrected — a check-in filed in the wrong
  // window is invisible damage that only shows up a year later, in a comparison
  // that reads as a child going backwards.
  const startedOn = new Date();
  if (body.window_code !== undefined && body.window_code !== null && !isWindowCode(body.window_code)) {
    return badRequest('Pick a check-in window: autumn, winter or spring.');
  }
  const windowCode: WindowCode = isWindowCode(body.window_code) ? body.window_code : windowForDate(startedOn);
  const formCode: FormCode = body.form_code === 'B' ? 'B' : (body.form_code === 'A' ? 'A' : defaultFormForWindow(windowCode));
  const deliveryMode: DeliveryMode = isDeliveryMode(body.delivery_mode) ? body.delivery_mode : 'tablet';

  // `2026-2027`, the September-start year Montree writes, so the two products'
  // rows stay comparable. A supplied value must be in that shape or it is refused.
  const requestedYear = text(body.school_year, 20);
  if (requestedYear && !/^\d{4}-\d{4}$/.test(requestedYear)) {
    return badRequest('A school year looks like 2026-2027.');
  }
  const schoolYear = requestedYear ?? schoolYearForDate(startedOn);

  // Co-rating: is an adult who actually knows this child rating alongside her?
  const coRated = body.co_rated === true;
  const coRater = coRated ? text(body.co_rater, 200) : null;

  const requested = Array.isArray(body.modules) && body.modules.length
    ? (body.modules.filter((m: unknown) => typeof m === 'string') as string[])
    : [...CORE_MODULE_IDS];
  const unknownModules = requested.filter((m) => !(ALL_MODULE_IDS as readonly string[]).includes(m));
  if (unknownModules.length) return badRequest(`I don’t know these modules: ${unknownModules.join(', ')}.`);

  // One place, on the server. M-OBS asked of a stranger is a guess wearing a
  // rating's clothes; dropped here, those milestones are simply reported as not
  // looked at this time — the same honest outcome as any module she left out.
  const modules = allowedModules(requested, coRated);
  if (!modules.length) {
    return badRequest(
      'Observations need an adult who knows this child sitting with you. Tick that, or pick another section too.',
    );
  }

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
        modules,
        delivery_mode: deliveryMode,
        source: deliveryMode === 'paper' ? 'paper_entry' : 'lens_ui',
        assessment_locale: 'en',
        bank_version: bank.bankVersion,
        bank_checksum: bank.bankChecksum,
        status: 'in_progress',
        // The session facts live here from the moment the check-in is created,
        // and finalizeSession merges them back over the scorer's summary on every
        // re-score. There is no column for them and none is needed.
        summary_json: buildSessionFacts(coRated, coRater),
        notes: text(body.notes, 2000),
      })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json(
      {
        ok: true,
        session: data,
        windowCode,
        schoolYear,
        coRated,
        // Said out loud so a client cannot quietly believe it asked for M-OBS
        // and got it.
        modulesDropped: requested.filter((m) => !modules.includes(m)),
        bankVersion: bank.bankVersion,
        bankChecksum: bank.bankChecksum,
      },
      { status: 201 },
    );
  } catch (error) {
    return lensError('assessment:sessions:post', error);
  }
}
