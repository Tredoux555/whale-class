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
      .select('id, name, area, sequence, chinese_name, age_range, materials, direct_aims, indirect_aims, control_of_error, video_url, video_channel, video_search_term')
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
      video_url: item.video_url,
      video_channel: item.video_channel,
      video_search_term: item.video_search_term,
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
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { workId, name, chinese_name, materials, direct_aims, indirect_aims, control_of_error, video_url } = body;

    if (!workId) {
      return NextResponse.json({ error: 'workId required' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (chinese_name !== undefined) updates.chinese_name = chinese_name;
    if (materials !== undefined) updates.materials = materials;
    if (direct_aims !== undefined) updates.direct_aims = direct_aims;
    if (indirect_aims !== undefined) updates.indirect_aims = indirect_aims;
    if (control_of_error !== undefined) updates.control_of_error = control_of_error;
    if (video_url !== undefined) updates.video_url = video_url;

    const { data, error } = await supabase
      .from('curriculum_roadmap')
      .update(updates)
      .eq('id', workId)
      .select()
      .single();

    if (error) {
      console.error('Update work error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, work: data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update work' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { name, area_id, sequence, chinese_name } = body;

    if (!name || !area_id) {
      return NextResponse.json({ error: 'name and area_id required' }, { status: 400 });
    }

    // Map area_id to area name in db
    const areaMap: Record<string, string> = {
      'practical_life': 'practical_life',
      'sensorial': 'sensorial',
      'mathematics': 'mathematics',
      'math': 'mathematics',
      'language': 'language',
      'culture': 'culture',
      'cultural': 'culture'
    };

    const { data, error } = await supabase
      .from('curriculum_roadmap')
      .insert({
        name,
        area: areaMap[area_id] || area_id,
        sequence: sequence || 999,
        chinese_name: chinese_name || null
      })
      .select()
      .single();

    if (error) {
      console.error('Add work error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, work: data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to add work' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const workId = url.searchParams.get('workId');

    if (!workId) {
      return NextResponse.json({ error: 'workId required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('curriculum_roadmap')
      .delete()
      .eq('id', workId);

    if (error) {
      console.error('Delete work error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete work' }, { status: 500 });
  }
}
