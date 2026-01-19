import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/admin/curriculum/orphaned
// List all weekly_assignments that have no work_id (orphaned works)

const WHALE_CLASSROOM_ID = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Normalize area
function normalizeArea(area: string): string {
  const areaMap: Record<string, string> = {
    'math': 'mathematics',
    'culture': 'cultural',
  };
  return areaMap[area] || area;
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  // Get all weekly_assignments with no work_id
  const { data: orphaned, error } = await supabase
    .from('weekly_assignments')
    .select(`
      id,
      work_name,
      area,
      progress_status,
      child_id
    `)
    .is('work_id', null)
    .not('work_name', 'is', null);

  if (error) {
    console.error('Error fetching orphaned works:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by work_name to deduplicate
  const workNameMap = new Map<string, { name: string; area: string; count: number; childIds: string[] }>();
  
  for (const item of orphaned || []) {
    const key = `${item.work_name}|${item.area}`;
    if (workNameMap.has(key)) {
      const existing = workNameMap.get(key)!;
      existing.count++;
      if (!existing.childIds.includes(item.child_id)) {
        existing.childIds.push(item.child_id);
      }
    } else {
      workNameMap.set(key, {
        name: item.work_name,
        area: normalizeArea(item.area || 'practical_life'),
        count: 1,
        childIds: [item.child_id]
      });
    }
  }

  // Convert to array
  const uniqueOrphaned = Array.from(workNameMap.values()).map((item, index) => ({
    id: `orphan_${index}`,
    work_name: item.name,
    area: item.area,
    assignmentCount: item.count,
    childCount: item.childIds.length
  }));

  return NextResponse.json({ 
    orphaned: uniqueOrphaned,
    totalAssignments: orphaned?.length || 0
  });
}
