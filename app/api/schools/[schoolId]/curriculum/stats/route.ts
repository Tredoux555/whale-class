// app/api/schools/[schoolId]/curriculum/stats/route.ts
// Get curriculum statistics for a school
// Handles both 'area' and 'area_id' fields for backwards compatibility
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const schoolId = params.schoolId;
    const supabase = getSupabase();
    
    // Get work counts by area from curriculum_roadmap
    const { data: works, error } = await supabase
      .from('curriculum_roadmap')
      .select('area, area_id');
    
    if (error) {
      console.error('Curriculum query error:', error);
      // Return zeros if table error
      return NextResponse.json({
        areas: {
          practical_life: 0,
          sensorial: 0,
          math: 0,
          language: 0,
          cultural: 0,
        },
        total: 0,
        error: error.message,
      });
    }
    
    // Count works per area (use area_id if available, otherwise area)
    const areaCounts: Record<string, number> = {};
    (works || []).forEach((work: any) => {
      // Prefer area_id, fallback to area
      const area = work.area_id || work.area || 'other';
      // Normalize area names to lowercase with underscores
      const normalizedArea = area.toLowerCase().replace(/\s+/g, '_');
      areaCounts[normalizedArea] = (areaCounts[normalizedArea] || 0) + 1;
    });
    
    const total = Object.values(areaCounts).reduce((sum, count) => sum + count, 0);
    
    return NextResponse.json({
      areas: areaCounts,
      total,
      schoolId,
    });
  } catch (error: any) {
    console.error('Curriculum stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
