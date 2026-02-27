// /api/montree/shelf/route.ts
// GET: Returns child's focus works (current shelf) with progress status
// The shelf holds up to 5 works — one per Montessori area

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

const ALL_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const supabase = getSupabase();

    // 1. Fetch focus works (current shelf)
    const { data: focusWorks, error: fwError } = await supabase
      .from('montree_child_focus_works')
      .select('area, work_name, set_at, set_by')
      .eq('child_id', childId);

    if (fwError) {
      console.error('[Shelf] Failed to fetch focus works:', fwError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch shelf data' },
        { status: 500 }
      );
    }

    // 2. Fetch progress status for each focus work
    const workNames = (focusWorks || []).map(fw => fw.work_name);
    let progressMap: Record<string, string> = {};

    if (workNames.length > 0) {
      const { data: progress } = await supabase
        .from('montree_child_progress')
        .select('work_name, status')
        .eq('child_id', childId)
        .in('work_name', workNames);

      progressMap = (progress || []).reduce((acc, p) => {
        acc[p.work_name] = p.status;
        return acc;
      }, {} as Record<string, string>);
    }

    // 3. Build shelf response — merge focus works with progress
    const shelf = (focusWorks || []).map(fw => ({
      area: fw.area,
      work_name: fw.work_name,
      status: progressMap[fw.work_name] || 'not_started',
      set_at: fw.set_at,
      set_by: fw.set_by,
    }));

    // 4. Determine which areas have no focus work
    const occupiedAreas = shelf.map(s => s.area);
    const emptyAreas = ALL_AREAS.filter(a => !occupiedAreas.includes(a));

    return NextResponse.json({
      success: true,
      shelf,
      empty_areas: emptyAreas,
    });

  } catch (error) {
    console.error('[Shelf] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
