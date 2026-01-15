// app/api/schools/[schoolId]/curriculum/[areaId]/route.ts
// Get curriculum works by area
// Supports both 'master' (global curriculum) and specific schoolId
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
    
    // For now, all schools use the master curriculum_roadmap
    // Later we can add school_curriculum_works table for customization
    
    // Fetch works from curriculum_roadmap
    const { data: works, error } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, work_name, description, sequence, area_id, category_id, age_range, chinese_name')
      .eq('area_id', areaId)
      .order('sequence', { ascending: true });
    
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
      sequence: work.sequence || index + 1,
      areaId: work.area_id,
      categoryId: work.category_id,
      ageRange: work.age_range,
      chineseName: work.chinese_name,
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
