// app/api/montree/children/[childId]/fill-shelf/route.ts
// Takes a list of work names from a game plan, resolves their areas from the
// classroom curriculum, and sets them as focus works on the child's shelf.
// Only fills empty area slots — never overwrites existing focus works.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

interface RouteContext {
  params: Promise<{ childId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await context.params;
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { works } = await request.json() as { works: string[] };
    if (!works?.length) {
      return NextResponse.json({ success: false, error: 'No works provided' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Get the child's classroom
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .maybeSingle();

    if (!child?.classroom_id) {
      return NextResponse.json({ success: false, error: 'Child not in a classroom' }, { status: 400 });
    }

    // Get existing focus works — don't overwrite occupied slots
    const { data: existingFocus } = await supabase
      .from('montree_child_focus_works')
      .select('area')
      .eq('child_id', childId);

    const occupiedAreas = new Set((existingFocus || []).map((f: { area: string }) => f.area));

    // Look up each work in the classroom curriculum to find its area
    const { data: areas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', child.classroom_id);

    if (!areas?.length) {
      return NextResponse.json({ success: false, error: 'No curriculum areas found' }, { status: 400 });
    }

    const areaIdToKey: Record<string, string> = {};
    for (const a of areas as Array<{ id: string; area_key: string }>) {
      areaIdToKey[a.id] = a.area_key;
    }

    // Resolve work names to areas via case-insensitive match
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('name, area_id')
      .eq('classroom_id', child.classroom_id);

    const workToArea: Record<string, string> = {};
    for (const w of (curriculumWorks || []) as Array<{ name: string; area_id: string }>) {
      const areaKey = areaIdToKey[w.area_id];
      if (areaKey) workToArea[w.name.toLowerCase()] = areaKey;
    }

    // Fill empty slots — first match per area wins
    const filled: Array<{ work_name: string; area: string }> = [];
    const filledAreas = new Set<string>();
    const now = new Date().toISOString();

    for (const workName of works) {
      const area = workToArea[workName.toLowerCase()];
      if (!area) continue; // work not in curriculum
      if (occupiedAreas.has(area)) continue; // area already has a focus work
      if (filledAreas.has(area)) continue; // already filling this area from another plan work

      // Set as focus work
      await supabase
        .from('montree_child_focus_works')
        .upsert({
          child_id: childId,
          area,
          work_name: workName,
          set_at: now,
          set_by: 'game_plan',
          updated_at: now,
        }, { onConflict: 'child_id,area' });

      // Also ensure progress row exists
      await supabase
        .from('montree_child_work_progress')
        .upsert({
          child_id: childId,
          work_name: workName,
          area,
          status: 'presented',
          updated_at: now,
        }, { onConflict: 'child_id,work_name' });

      filled.push({ work_name: workName, area });
      filledAreas.add(area);
    }

    console.log(`[FillShelf] Filled ${filled.length} slots for child ${childId}: ${filled.map(f => `${f.area}=${f.work_name}`).join(', ')}`);

    return NextResponse.json({
      success: true,
      filled,
      skipped_areas: Array.from(occupiedAreas),
    });
  } catch (error) {
    console.error('[FillShelf] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
