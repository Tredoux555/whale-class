import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CLASSROOM CURRICULUM-BASED PROGRESS API
// Uses classroom-specific curriculum instead of global curriculum_roadmap

const WHALE_CLASSROOM_ID = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Area key normalization
function normalizeArea(area: string): string {
  const areaMap: Record<string, string> = {
    'math': 'mathematics',
    'culture': 'cultural',
  };
  return areaMap[area] || area;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;

  // Get classroom areas with their IDs
  const { data: areas, error: areaError } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id, area_key, name')
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .eq('is_active', true);

  if (areaError) {
    console.error('Error fetching areas:', areaError);
    return NextResponse.json({ error: areaError.message }, { status: 500 });
  }

  // Create area lookup map
  const areaLookup = new Map(areas?.map(a => [a.id, a.area_key]) || []);
  const areaNameLookup = new Map(areas?.map(a => [a.id, a.name]) || []);

  // Get ALL classroom curriculum works
  const { data: curriculum, error: currError } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, work_key, name, area_id, sequence')
    .eq('classroom_id', WHALE_CLASSROOM_ID)
    .order('sequence');

  if (currError) {
    console.error('Error fetching classroom curriculum:', currError);
    return NextResponse.json({ error: currError.message }, { status: 500 });
  }

  // Get child's progress from child_work_progress (may reference old work_ids)
  const { data: progress } = await supabase
    .from('child_work_progress')
    .select('id, work_id, status')
    .eq('child_id', childId);

  // Get weekly assignments for this child (includes work_name for matching)
  const { data: weeklyAssignments } = await supabase
    .from('weekly_assignments')
    .select('id, work_id, work_name, area, progress_status')
    .eq('child_id', childId);

  // Build progress map from multiple sources
  const progressMap: Record<string, number> = {};
  const statusToNumber: Record<string, number> = {
    'not_started': 0,
    'presented': 1,
    'practicing': 2,
    'mastered': 3
  };

  // Add progress from child_work_progress
  (progress || []).forEach(p => {
    if (p.work_id) {
      progressMap[p.work_id] = p.status;
    }
  });

  // Add progress from weekly_assignments (by work_id if linked)
  (weeklyAssignments || []).forEach(a => {
    if (a.work_id) {
      const numStatus = statusToNumber[a.progress_status] || 0;
      progressMap[a.work_id] = Math.max(progressMap[a.work_id] || 0, numStatus);
    }
  });

  // Also try to match by work_name to classroom curriculum
  const workNameToId = new Map(
    (curriculum || []).map(w => [w.name.toLowerCase().trim(), w.id])
  );
  
  (weeklyAssignments || []).forEach(a => {
    if (!a.work_id && a.work_name) {
      const matchedId = workNameToId.get(a.work_name.toLowerCase().trim());
      if (matchedId) {
        const numStatus = statusToNumber[a.progress_status] || 0;
        progressMap[matchedId] = Math.max(progressMap[matchedId] || 0, numStatus);
      }
    }
  });

  // Transform curriculum works to response format
  const works = (curriculum || []).map(work => {
    const areaKey = areaLookup.get(work.area_id) || 'unknown';
    return {
      id: work.id,
      name: work.name,
      area: areaKey,
      category: work.area_id,
      sequence: work.sequence,
      status: progressMap[work.id] || 0,
      linked: progressMap[work.id] !== undefined
    };
  });

  // Find UNLINKED weekly assignments (work_id is null AND not matched by name)
  const unlinkedAssignments = (weeklyAssignments || [])
    .filter(a => {
      if (a.work_id) return false;
      if (!a.work_name) return false;
      const matchedId = workNameToId.get(a.work_name.toLowerCase().trim());
      return !matchedId;
    })
    .map(a => ({
      id: a.id,
      name: a.work_name,
      area: normalizeArea(a.area || 'unknown'),
      status: statusToNumber[a.progress_status] || 2,
      linked: false,
      orphaned: true,
      source: 'weekly_assignment'
    }));

  // Count stats
  const stats = {
    total: works.length,
    linked: works.filter(w => w.linked).length,
    unlinked: unlinkedAssignments.length,
    withProgress: Object.keys(progressMap).length
  };

  return NextResponse.json({ 
    works, 
    orphanedWorks: unlinkedAssignments,
    stats,
    classroomId: WHALE_CLASSROOM_ID,
    debug: {
      curriculumCount: curriculum?.length || 0,
      progressCount: progress?.length || 0,
      weeklyCount: weeklyAssignments?.length || 0,
      unlinkedCount: unlinkedAssignments.length,
      areaCount: areas?.length || 0
    }
  });
}
