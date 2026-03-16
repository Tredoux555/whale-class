// /api/montree/progress/classroom-summary/route.ts
// Returns aggregate progress across ALL children in a classroom
// Used by ClassroomPulse on the teacher dashboard

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

const AREA_KEYS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    // Verify classroom belongs to this school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all children in the classroom
    const { data: childrenData } = await supabase
      .from('montree_children')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('is_active', true);

    const childIds = (childrenData || []).map(c => c.id);
    if (childIds.length === 0) {
      return NextResponse.json({ areas: [], totals: { mastered: 0, practicing: 0, presented: 0 } });
    }

    // Get all progress records for these children
    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('child_id, area, status')
      .in('child_id', childIds);

    // Aggregate by area
    const areaCounts: Record<string, { mastered: number; practicing: number; presented: number }> = {};
    for (const key of AREA_KEYS) {
      areaCounts[key] = { mastered: 0, practicing: 0, presented: 0 };
    }

    let totalMastered = 0;
    let totalPracticing = 0;
    let totalPresented = 0;

    for (const row of progress || []) {
      const area = row.area || 'cultural';
      if (!areaCounts[area]) areaCounts[area] = { mastered: 0, practicing: 0, presented: 0 };

      if (row.status === 'mastered') {
        areaCounts[area].mastered++;
        totalMastered++;
      } else if (row.status === 'practicing') {
        areaCounts[area].practicing++;
        totalPracticing++;
      } else if (row.status === 'presented') {
        areaCounts[area].presented++;
        totalPresented++;
      }
    }

    const areas = AREA_KEYS.map(key => ({
      area: key,
      mastered: areaCounts[key].mastered,
      practicing: areaCounts[key].practicing,
      presented: areaCounts[key].presented,
      total: areaCounts[key].mastered + areaCounts[key].practicing + areaCounts[key].presented,
    }));

    const response = NextResponse.json({
      areas,
      totals: { mastered: totalMastered, practicing: totalPracticing, presented: totalPresented },
      childCount: childIds.length,
    });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return response;

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
