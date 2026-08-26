// GET  /api/lens/classrooms/[id]/staff
// POST /api/lens/classrooms/[id]/staff — add a guide, assistant or trainee.

import { NextRequest, NextResponse } from 'next/server';
import { lensDb, listStaff, loadOwnedClassroom, STAFF_COLUMNS } from '@/lib/lens/db';
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
import { isStaffRole } from '@/lib/lens/types';

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
    return NextResponse.json({ staff: await listStaff(supabase, owned.classroom.id) });
  } catch (error) {
    return lensError('staff:get', error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  const name = requiredText(body.name, 200);
  if (!name) return badRequest('A staff member needs a name.');
  const role = isStaffRole(body.role) ? body.role : 'lead_guide';

  try {
    const supabase = lensDb();
    const owned = await loadOwnedClassroom(supabase, session.observerId, id);
    if (!owned) return notFound('That classroom isn’t on your list.');

    const { data, error } = await supabase
      .from('lens_staff')
      .insert({
        classroom_id: owned.classroom.id,
        name,
        role,
        training: text(body.training, 80),
        training_level: text(body.training_level, 80),
        years_experience: intOrNull(body.years_experience, 0, 70),
        notes: text(body.notes, 4000),
      })
      .select(STAFF_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, staff: data }, { status: 201 });
  } catch (error) {
    return lensError('staff:post', error);
  }
}
