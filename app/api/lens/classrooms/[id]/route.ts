// GET    /api/lens/classrooms/[id] — the room, its staff, and its open follow-ups.
// PATCH  /api/lens/classrooms/[id]
// DELETE /api/lens/classrooms/[id] — soft, same reasoning as a school.
//
// The open follow-ups come back on GET because this is the screen she opens
// before a visit, and "what did I ask for last time" is the first thing she
// needs — the same list /lens/visits/new surfaces.

import { NextRequest, NextResponse } from 'next/server';
import {
  CLASSROOM_COLUMNS,
  lensDb,
  listOpenActionItemsForClassroom,
  listStaff,
  loadOwnedClassroom,
} from '@/lib/lens/db';
import {
  badRequest,
  intOrNull,
  lensError,
  notFound,
  readJson,
  requireObserver,
  text,
} from '@/lib/lens/route-helpers';
import { isClassroomLevel } from '@/lib/lens/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  try {
    const supabase = lensDb();
    const owned = await loadOwnedClassroom(supabase, session.observerId, id);
    if (!owned) return notFound('That classroom isn’t on your list.');
    const [staff, openActions] = await Promise.all([
      listStaff(supabase, owned.classroom.id),
      listOpenActionItemsForClassroom(supabase, owned.classroom.id),
    ]);
    return NextResponse.json({
      classroom: owned.classroom,
      school: owned.school,
      staff,
      openActions,
    });
  } catch (error) {
    return lensError('classroom:get', error);
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
    const owned = await loadOwnedClassroom(supabase, session.observerId, id);
    if (!owned) return notFound('That classroom isn’t on your list.');

    const updates: Record<string, unknown> = {};
    if ('name' in body) {
      const name = text(body.name, 200);
      if (!name) return badRequest('A classroom needs a name.');
      updates.name = name;
    }
    if ('level' in body) {
      if (!isClassroomLevel(body.level)) return badRequest('That isn’t a level I know.');
      updates.level = body.level;
    }
    if ('age_range' in body) updates.age_range = text(body.age_range, 60);
    if ('child_count' in body) updates.child_count = intOrNull(body.child_count, 0, 400);
    if ('ratio' in body) updates.ratio = text(body.ratio, 40);
    if ('room_notes' in body) updates.room_notes = text(body.room_notes, 4000);
    if (Object.keys(updates).length === 0) return badRequest('Nothing to update.');

    const { data, error } = await supabase
      .from('lens_classrooms')
      .update(updates)
      .eq('id', owned.classroom.id)
      .select(CLASSROOM_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, classroom: data });
  } catch (error) {
    return lensError('classroom:patch', error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  try {
    const supabase = lensDb();
    const owned = await loadOwnedClassroom(supabase, session.observerId, id);
    if (!owned) return notFound('That classroom isn’t on your list.');
    const { error } = await supabase
      .from('lens_classrooms')
      .update({ is_active: false })
      .eq('id', owned.classroom.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return lensError('classroom:delete', error);
  }
}
