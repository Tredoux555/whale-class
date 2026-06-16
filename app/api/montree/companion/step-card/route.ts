// app/api/montree/companion/step-card/route.ts
// POST { child_id, work_name, area } → the full hand-held Step Card for that
// work. Powers "tap a work on the Shelf → see exactly how to do it with my child."

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { generateStepCardForWork } from '@/lib/montree/companion/present';

export const maxDuration = 60;

const VALID_AREAS = new Set(['practical_life', 'sensorial', 'mathematics', 'language', 'cultural']);

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { child_id?: string; work_name?: string; area?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const childId = (body.child_id || '').trim();
  const workName = (body.work_name || '').trim();
  const area = (body.area || '').trim();
  if (!childId || !workName) return NextResponse.json({ error: 'child_id and work_name required' }, { status: 400 });
  const safeArea = VALID_AREAS.has(area) ? area : 'practical_life';

  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const supabase = getSupabase();
  try {
    const { data: child } = await supabase
      .from('montree_children')
      .select('name, date_of_birth, classroom_id')
      .eq('id', childId)
      .maybeSingle();
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

    let ageYears: number | null = null;
    if (child.date_of_birth) {
      const dob = new Date(child.date_of_birth as string);
      if (!Number.isNaN(dob.getTime())) ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    }

    const card = await generateStepCardForWork(supabase, {
      childId,
      classroomId: (child.classroom_id as string) || null,
      schoolId: auth.schoolId,
      workName,
      area: safeArea,
      childName: (child.name as string) || undefined,
      childAgeYears: ageYears,
    });
    return NextResponse.json({ card }, { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' } });
  } catch (err) {
    console.error('[companion/step-card] error:', err);
    return NextResponse.json({ error: 'Could not load the how-to right now.' }, { status: 500 });
  }
}
