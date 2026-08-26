// GET  /api/lens/schools/[id]/classrooms
// POST /api/lens/schools/[id]/classrooms — add a room to a school she owns.
//
// The school id comes from the PATH and is re-proved against the session before
// anything is written; the body may not name a school.

import { NextRequest, NextResponse } from 'next/server';
import { CLASSROOM_COLUMNS, lensDb, listClassrooms, loadOwnedSchool } from '@/lib/lens/db';
import {
  badRequest,
  intOrNull,
  lensError,
  notFound,
  readJson,
  requireObserver,
  requiredText,
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
    const school = await loadOwnedSchool(supabase, session.observerId, id);
    if (!school) return notFound('That school isn’t on your list.');
    return NextResponse.json({ classrooms: await listClassrooms(supabase, school.id) });
  } catch (error) {
    return lensError('classrooms:get', error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  const name = requiredText(body.name, 200);
  if (!name) return badRequest('A classroom needs a name.');
  const level = isClassroomLevel(body.level) ? body.level : null;
  if (!level) return badRequest('Pick a level for this classroom.');

  try {
    const supabase = lensDb();
    const school = await loadOwnedSchool(supabase, session.observerId, id);
    if (!school) return notFound('That school isn’t on your list.');

    const { data, error } = await supabase
      .from('lens_classrooms')
      .insert({
        school_id: school.id,
        name,
        level,
        age_range: text(body.age_range, 60),
        // A room with 400 children is a typo, not a room.
        child_count: intOrNull(body.child_count, 0, 400),
        ratio: text(body.ratio, 40),
        room_notes: text(body.room_notes, 4000),
      })
      .select(CLASSROOM_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, classroom: data }, { status: 201 });
  } catch (error) {
    return lensError('classrooms:post', error);
  }
}
