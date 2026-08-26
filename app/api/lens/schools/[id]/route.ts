// GET    /api/lens/schools/[id] — the school plus its classrooms.
// PATCH  /api/lens/schools/[id]
// DELETE /api/lens/schools/[id] — SOFT. A school with a year of visits behind
//        it must never be removable by a mis-tap; is_active=false takes it off
//        the list and leaves every report intact.

import { NextRequest, NextResponse } from 'next/server';
import { lensDb, listClassrooms, loadOwnedSchool, SCHOOL_COLUMNS } from '@/lib/lens/db';
import {
  badRequest,
  lensError,
  notFound,
  readJson,
  requireObserver,
  stringArray,
  text,
} from '@/lib/lens/route-helpers';

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
    const classrooms = await listClassrooms(supabase, school.id);
    return NextResponse.json({ school, classrooms });
  } catch (error) {
    return lensError('school:get', error);
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
    const school = await loadOwnedSchool(supabase, session.observerId, id);
    if (!school) return notFound('That school isn’t on your list.');

    const updates: Record<string, unknown> = {};
    if ('name' in body) {
      const name = text(body.name, 200);
      if (!name) return badRequest('A school needs a name.');
      updates.name = name;
    }
    if ('city' in body) updates.city = text(body.city, 120);
    if ('country' in body) updates.country = text(body.country, 120);
    if ('contact_name' in body) updates.contact_name = text(body.contact_name, 200);
    if ('contact_email' in body) updates.contact_email = text(body.contact_email, 200);
    if ('affiliation' in body) updates.affiliation = text(body.affiliation, 80);
    if ('age_bands' in body) updates.age_bands = stringArray(body.age_bands, 8, 40);
    if ('notes' in body) updates.notes = text(body.notes, 4000);
    if (Object.keys(updates).length === 0) return badRequest('Nothing to update.');

    const { data, error } = await supabase
      .from('lens_schools')
      .update(updates)
      .eq('id', school.id)
      .eq('observer_id', session.observerId)
      .select(SCHOOL_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, school: data });
  } catch (error) {
    return lensError('school:patch', error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  try {
    const supabase = lensDb();
    const school = await loadOwnedSchool(supabase, session.observerId, id);
    if (!school) return notFound('That school isn’t on your list.');
    const { error } = await supabase
      .from('lens_schools')
      .update({ is_active: false })
      .eq('id', school.id)
      .eq('observer_id', session.observerId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return lensError('school:delete', error);
  }
}
