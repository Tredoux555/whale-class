// GET  /api/lens/schools — her client list.
// POST /api/lens/schools — add a school.
//
// observer_id comes from the SESSION, never from the body. That is the whole
// tenancy model of Lens in one sentence, and it is repeated in every route that
// writes: existence is not ownership, and a body may not name its owner.

import { NextRequest, NextResponse } from 'next/server';
import { lensDb, listSchools, SCHOOL_COLUMNS } from '@/lib/lens/db';
import {
  badRequest,
  lensError,
  readJson,
  requireObserver,
  requiredText,
  stringArray,
  text,
} from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  try {
    return NextResponse.json({ schools: await listSchools(lensDb(), session.observerId) });
  } catch (error) {
    return lensError('schools:get', error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  const name = requiredText(body.name, 200);
  if (!name) return badRequest('A school needs a name.');

  try {
    const { data, error } = await lensDb()
      .from('lens_schools')
      .insert({
        observer_id: session.observerId,
        name,
        city: text(body.city, 120),
        country: text(body.country, 120),
        contact_name: text(body.contact_name, 200),
        contact_email: text(body.contact_email, 200),
        affiliation: text(body.affiliation, 80),
        age_bands: stringArray(body.age_bands, 8, 40),
        notes: text(body.notes, 4000),
      })
      .select(SCHOOL_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, school: data }, { status: 201 });
  } catch (error) {
    return lensError('schools:post', error);
  }
}
