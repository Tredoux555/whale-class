// app/api/school/[schoolId]/curriculum/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const areaFilter = url.searchParams.get('area');
    const workId = url.searchParams.get('work_id');

    // If work_id provided, return full details for single work
    if (workId) {
      const { data, error } = await supabase
        .from('curriculum_roadmap')
        .select('*')
        .eq('id', workId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ work: data });
    }

    // Use curriculum_roadmap as the source (unified curriculum)
    let query = supabase
      .from('curriculum_roadmap')
      .select('id, name, area, sequence, chinese_name, age_range, materials, direct_aims, indirect_aims, control_of_error')
      .order('area')
      .order('sequence');

    // Handle math/mathematics as same area
    if (areaFilter) {
      if (areaFilter === 'math') {
        query = query.in('area', ['math', 'mathematics']);
      } else {
        query = query.eq('area', areaFilter);
      }
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to expected format, normalize math/mathematics to 'math'
    const curriculum = (data || []).map((item, index) => ({
      id: item.id,
      name: item.name,
      chinese_name: item.chinese_name,
      area_id: item.area === 'mathematics' ? 'math' : item.area,
      sequence: item.sequence || index,
      age_range: item.age_range,
      materials: item.materials,
      direct_aims: item.direct_aims,
      indirect_aims: item.indirect_aims,
      control_of_error: item.control_of_error,
      is_active: true
    }));

    return NextResponse.json({ curriculum, total: curriculum.length });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  // For now, curriculum is read-only from the roadmap
  return NextResponse.json({ error: 'Curriculum is read-only' }, { status: 403 });
}
