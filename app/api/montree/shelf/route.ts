// /api/montree/shelf/route.ts
// GET: Returns child's focus works (current shelf) with progress status + guru reasons
// POST: Set a focus work on the shelf (upsert by child+area)
// The shelf holds up to 5 works — one per Montessori area

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getChineseNameForWork } from '@/lib/montree/curriculum-loader';

const ALL_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

// Chinese name lookup now uses centralized getChineseNameForWork() from curriculum-loader

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

    // 3. Fetch guru area reasons from child settings
    const { data: childData } = await supabase
      .from('montree_children')
      .select('settings')
      .eq('id', childId)
      .single();
    const settings = (childData?.settings as Record<string, unknown>) || {};
    const guruReasons = (settings.guru_area_reasons as Record<string, string>) || {};

    // 4. Build shelf response — merge focus works with progress + chinese names (fuzzy) + reasons
    const shelf = (focusWorks || []).map(fw => ({
      area: fw.area,
      work_name: fw.work_name,
      chineseName: fw.work_name ? getChineseNameForWork(fw.work_name) : null,
      status: progressMap[fw.work_name] || 'not_started',
      set_at: fw.set_at,
      set_by: fw.set_by,
      guru_reason: guruReasons[fw.area] || null,
    }));

    // 6. Determine which areas have no focus work
    const occupiedAreas = shelf.map(s => s.area);
    const emptyAreas = ALL_AREAS.filter(a => !occupiedAreas.includes(a));

    const response = NextResponse.json({
      success: true,
      shelf,
      empty_areas: emptyAreas,
    });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return response;

  } catch (error) {
    console.error('[Shelf] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Set a focus work on the shelf (used by parent search bar)
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { child_id, area, work_name } = body;

    if (!child_id || !area || !work_name) {
      return NextResponse.json(
        { success: false, error: 'child_id, area, and work_name are required' },
        { status: 400 }
      );
    }

    if (!ALL_AREAS.includes(area)) {
      return NextResponse.json(
        { success: false, error: 'Invalid area' },
        { status: 400 }
      );
    }

    if (typeof work_name !== 'string' || work_name.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Invalid work_name' },
        { status: 400 }
      );
    }

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('montree_child_focus_works')
      .upsert({
        child_id,
        area,
        work_name,
        set_at: new Date().toISOString(),
        set_by: 'parent',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'child_id,area' });

    if (error) {
      console.error('[Shelf] Failed to set focus work:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to set focus work' },
        { status: 500 }
      );
    }

    // Also ensure work exists in progress table (so teacher week view can see it)
    const { data: existingProgress } = await supabase
      .from('montree_child_progress')
      .select('id')
      .eq('child_id', child_id)
      .eq('work_name', work_name)
      .maybeSingle();

    if (!existingProgress) {
      await supabase
        .from('montree_child_progress')
        .insert({
          child_id,
          work_name,
          area,
          status: 'presented',
          presented_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Shelf POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
