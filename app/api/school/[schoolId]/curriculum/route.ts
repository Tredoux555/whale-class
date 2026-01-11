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

    // Use curriculum_roadmap as the source (unified curriculum)
    let query = supabase
      .from('curriculum_roadmap')
      .select('id, name, area, sequence')
      .order('area')
      .order('sequence');

    if (areaFilter) {
      query = query.eq('area', areaFilter);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to expected format
    const curriculum = (data || []).map((item, index) => ({
      id: item.id,
      name: item.name,
      chinese_name: null,
      area_id: item.area,
      sequence: item.sequence || index,
      is_active: true,
      materials_on_shelf: false,
      custom_notes: null,
      is_custom: false
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
