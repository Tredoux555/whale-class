// GET   /api/lens/visits/[id] — everything the capture screen and the visit
//       overview need in one round trip: the visit, its school, its rooms, the
//       staff in those rooms, its reports, and (on request) its moments.
// PATCH /api/lens/visits/[id] — purpose, status, end time, add a room.

import { NextRequest, NextResponse } from 'next/server';
import {
  lensDb,
  listMoments,
  listReportsForVisit,
  listStaffForClassrooms,
  loadClassroomsByIds,
  loadOwnedSchool,
  loadOwnedVisit,
  VISIT_COLUMNS,
  visitClassroomIds,
} from '@/lib/lens/db';
import {
  badRequest,
  lensError,
  notFound,
  readJson,
  requireObserver,
  text,
} from '@/lib/lens/route-helpers';
import { isVisitStatus } from '@/lib/lens/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  // The capture screen wants the moments; the visit list does not. Defaults to
  // including them — the screens that need them are the ones people wait on.
  const withMoments = request.nextUrl.searchParams.get('moments') !== '0';

  try {
    const supabase = lensDb();
    const visit = await loadOwnedVisit(supabase, session.observerId, id);
    if (!visit) return notFound('That visit isn’t yours.');

    const [school, roomIds, reports] = await Promise.all([
      loadOwnedSchool(supabase, session.observerId, visit.school_id),
      visitClassroomIds(supabase, visit.id),
      listReportsForVisit(supabase, visit.id),
    ]);
    const classrooms = await loadClassroomsByIds(supabase, roomIds);
    const [staff, moments] = await Promise.all([
      listStaffForClassrooms(supabase, roomIds),
      withMoments ? listMoments(supabase, visit.id) : Promise.resolve([]),
    ]);

    return NextResponse.json({ visit, school, classrooms, staff, reports, moments });
  } catch (error) {
    return lensError('visit:get', error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  try {
    const supabase = lensDb();
    const visit = await loadOwnedVisit(supabase, session.observerId, id);
    if (!visit) return notFound('That visit isn’t yours.');

    const updates: Record<string, unknown> = {};
    if ('purpose' in body) updates.purpose = text(body.purpose, 2000);
    if ('status' in body) {
      if (!isVisitStatus(body.status)) return badRequest('That isn’t a status I know.');
      updates.status = body.status;
    }
    if ('ended_at' in body) {
      // "Finish observing" sends `true`; an explicit ISO string is also accepted
      // so a client that recorded the real end time can send it.
      updates.ended_at =
        body.ended_at === true ? new Date().toISOString() : text(body.ended_at, 40);
    }

    // Adding a room mid-visit: prove it belongs to this visit's school, then
    // create the room's report if it does not already have one.
    const addRoom = text(body.add_classroom_id, 64);
    if (addRoom) {
      const { data, error } = await supabase
        .from('lens_classrooms')
        .select('id, school_id')
        .eq('id', addRoom)
        .maybeSingle();
      if (error) throw error;
      const room = data as { id: string; school_id: string } | null;
      if (!room || room.school_id !== visit.school_id) {
        return badRequest('That classroom isn’t in this school.');
      }
      // Both inserts are idempotent by index: the junction has a composite PK
      // and lens_reports has uq_lens_reports_visit_classroom, so re-adding a
      // room she already added is a no-op rather than a duplicate.
      const { error: junctionError } = await supabase
        .from('lens_visit_classrooms')
        .upsert({ visit_id: visit.id, classroom_id: room.id }, { onConflict: 'visit_id,classroom_id' });
      if (junctionError) throw junctionError;
      const { error: reportError } = await supabase
        .from('lens_reports')
        .upsert(
          { visit_id: visit.id, classroom_id: room.id },
          { onConflict: 'visit_id,classroom_id', ignoreDuplicates: true },
        );
      if (reportError) throw reportError;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('lens_visits')
        .update(updates)
        .eq('id', visit.id)
        .eq('observer_id', session.observerId);
      if (error) throw error;
    }

    const fresh = await supabase
      .from('lens_visits')
      .select(VISIT_COLUMNS)
      .eq('id', visit.id)
      .maybeSingle();
    return NextResponse.json({ ok: true, visit: fresh.data });
  } catch (error) {
    return lensError('visit:patch', error);
  }
}
