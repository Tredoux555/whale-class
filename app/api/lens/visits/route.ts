// GET  /api/lens/visits — her visits, newest first, with school names attached.
// POST /api/lens/visits — start a visit.
//
// Creating a visit also creates its REPORTS: one per classroom, plus the
// level report (classroom_id NULL). They start empty and at status 'capturing'.
// Doing it here rather than at draft time means the report ids are stable from
// the first moment she captures, so the capture screen can already deep-link to
// the report and a half-finished visit is never in a state where the report
// "doesn't exist yet".

import { NextRequest, NextResponse } from 'next/server';
import {
  lensDb,
  listSchools,
  listVisits,
  loadOwnedSchool,
  VISIT_COLUMNS,
} from '@/lib/lens/db';
import {
  badRequest,
  dateOrNull,
  lensError,
  notFound,
  readJson,
  requireObserver,
  requiredText,
  text,
} from '@/lib/lens/route-helpers';
import { isEngagementType, type LensClassroom } from '@/lib/lens/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  try {
    const supabase = lensDb();
    const [visits, schools] = await Promise.all([
      listVisits(supabase, session.observerId),
      listSchools(supabase, session.observerId),
    ]);
    const schoolName = new Map(schools.map((s) => [s.id, s.name]));
    return NextResponse.json({
      visits: visits.map((v) => ({ ...v, school_name: schoolName.get(v.school_id) ?? 'Unknown school' })),
      schools,
    });
  } catch (error) {
    return lensError('visits:get', error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  const schoolId = requiredText(body.school_id, 64);
  if (!schoolId) return badRequest('Pick a school.');
  const visitDate = dateOrNull(body.visit_date);
  if (!visitDate) return badRequest('Pick a date (YYYY-MM-DD).');
  const engagement = isEngagementType(body.engagement_type) ? body.engagement_type : null;
  if (!engagement) return badRequest('Pick an engagement type.');

  const requestedRooms = Array.isArray(body.classroom_ids)
    ? (body.classroom_ids.filter((v: unknown) => typeof v === 'string') as string[]).slice(0, 30)
    : [];

  try {
    const supabase = lensDb();
    const school = await loadOwnedSchool(supabase, session.observerId, schoolId);
    if (!school) return notFound('That school isn’t on your list.');

    // 🚨 EVERY requested room is re-proved to belong to THIS school before the
    // visit is written. A body that names somebody else's classroom is refused,
    // not silently filtered — silently filtering would let a mis-paste produce a
    // visit that looks right and observes rooms she never set foot in.
    let rooms: LensClassroom[] = [];
    if (requestedRooms.length > 0) {
      const { data, error } = await supabase
        .from('lens_classrooms')
        .select('id, school_id')
        .in('id', requestedRooms);
      if (error) throw error;
      const found = (data ?? []) as { id: string; school_id: string }[];
      const mine = found.filter((c) => c.school_id === school.id).map((c) => c.id);
      if (mine.length !== requestedRooms.length) {
        return badRequest('One of those classrooms isn’t in that school.');
      }
      rooms = mine.map((id) => ({ id }) as LensClassroom);
    }

    const { data: visit, error: visitError } = await supabase
      .from('lens_visits')
      .insert({
        observer_id: session.observerId,
        school_id: school.id,
        visit_date: visitDate,
        engagement_type: engagement,
        purpose: text(body.purpose, 2000),
        started_at: new Date().toISOString(),
        status: 'capturing',
      })
      .select(VISIT_COLUMNS)
      .single();
    if (visitError) throw visitError;

    if (rooms.length > 0) {
      const { error } = await supabase
        .from('lens_visit_classrooms')
        .insert(rooms.map((c) => ({ visit_id: visit.id, classroom_id: c.id })));
      if (error) throw error;
    }

    // One report per room + the level report. `languages` follows her profile
    // default; she can change it per report in the editor.
    const { data: observerRow } = await supabase
      .from('lens_observers')
      .select('default_languages')
      .eq('id', session.observerId)
      .maybeSingle();
    const languages = Array.isArray(observerRow?.default_languages)
      ? (observerRow.default_languages as string[])
      : ['en'];

    const reportRows = [
      ...rooms.map((c) => ({ visit_id: visit.id, classroom_id: c.id, languages })),
      { visit_id: visit.id, classroom_id: null, languages },
    ];
    const { error: reportError } = await supabase.from('lens_reports').insert(reportRows);
    if (reportError) throw reportError;

    return NextResponse.json({ ok: true, visit }, { status: 201 });
  } catch (error) {
    return lensError('visits:post', error);
  }
}
