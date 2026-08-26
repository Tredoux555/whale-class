// PATCH  /api/lens/staff/[id]
// DELETE /api/lens/staff/[id] — soft. A guide who has left the school still
//        appears in last term's report, and the report must keep resolving her
//        name; deactivating takes her off the pickers and leaves history alone.

import { NextRequest, NextResponse } from 'next/server';
import { lensDb, loadOwnedStaff, STAFF_COLUMNS } from '@/lib/lens/db';
import {
  badRequest,
  intOrNull,
  lensError,
  notFound,
  readJson,
  requireObserver,
  text,
} from '@/lib/lens/route-helpers';
import { isStaffRole } from '@/lib/lens/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  try {
    const supabase = lensDb();
    const staff = await loadOwnedStaff(supabase, session.observerId, id);
    if (!staff) return notFound('I can’t find that person.');

    const updates: Record<string, unknown> = {};
    if ('name' in body) {
      const name = text(body.name, 200);
      if (!name) return badRequest('A staff member needs a name.');
      updates.name = name;
    }
    if ('role' in body) {
      if (!isStaffRole(body.role)) return badRequest('That isn’t a role I know.');
      updates.role = body.role;
    }
    if ('training' in body) updates.training = text(body.training, 80);
    if ('training_level' in body) updates.training_level = text(body.training_level, 80);
    if ('years_experience' in body) {
      updates.years_experience = intOrNull(body.years_experience, 0, 70);
    }
    if ('notes' in body) updates.notes = text(body.notes, 4000);
    if (Object.keys(updates).length === 0) return badRequest('Nothing to update.');

    const { data, error } = await supabase
      .from('lens_staff')
      .update(updates)
      .eq('id', staff.id)
      .select(STAFF_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, staff: data });
  } catch (error) {
    return lensError('staff:patch', error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  try {
    const supabase = lensDb();
    const staff = await loadOwnedStaff(supabase, session.observerId, id);
    if (!staff) return notFound('I can’t find that person.');
    const { error } = await supabase
      .from('lens_staff')
      .update({ is_active: false })
      .eq('id', staff.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return lensError('staff:delete', error);
  }
}
