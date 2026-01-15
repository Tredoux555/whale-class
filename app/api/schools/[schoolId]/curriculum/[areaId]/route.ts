// app/api/schools/[schoolId]/curriculum/[areaId]/route.ts
// Get curriculum works by area
// Supports both 'area' and 'area_id' columns for backwards compatibility
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
  { params }: { params: { schoolId: string; areaId: string } }
) {
  try {
    const { schoolId, areaId } = params;
    const supabase = getSupabase();
    
    // Try area_id first, fallback to area
    // Seed data uses 'area' field, migration adds 'area_id' field
    let { data: works, error } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, work_name, description, sequence, sequence_order, area_id, area, category_id, age_range, chinese_name, stage')
      .or(`area_id.eq.${areaId},area.eq.${areaId}`)
      .order('sequence_order', { ascending: true });
    
    if (error) {
      console.error('Curriculum fetch error:', error);
      return NextResponse.json({ 
        works: [],
        error: error.message,
        total: 0,
        areaId,
      });
    }
    
    // Transform to consistent format
    const formattedWorks = (works || []).map((work: any, index: number) => ({
      id: work.id,
      name: work.name || work.work_name || 'Unnamed Work',
      description: work.description || null,
      sequence: work.sequence || work.sequence_order || index + 1,
      areaId: work.area_id || work.area,
      categoryId: work.category_id,
      ageRange: work.age_range,
      chineseName: work.chinese_name,
      stage: work.stage,
      isActive: true,
    }));
    
    return NextResponse.json({
      works: formattedWorks,
      total: formattedWorks.length,
      areaId,
      schoolId,
    });
  } catch (error: any) {
    console.error('Curriculum area API error:', error);
    return NextResponse.json({ 
      works: [],
      error: error.message,
      total: 0,
    });
  }
}
