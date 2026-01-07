// app/api/school/[schoolId]/curriculum/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const { schoolId } = params;
    const url = new URL(request.url);
    const areaFilter = url.searchParams.get('area');
    const activeOnly = url.searchParams.get('active') !== 'false';

    let query = supabase
      .from('school_curriculum')
      .select('*')
      .eq('school_id', schoolId)
      .order('area_id')
      .order('sequence');

    if (areaFilter) {
      query = query.eq('area_id', areaFilter);
    }
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ curriculum: data, total: data?.length || 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const { schoolId } = params;
    const body = await request.json();
    const { workId, updates } = body;

    if (!workId) {
      return NextResponse.json({ error: 'workId required' }, { status: 400 });
    }

    const allowedFields = ['is_active', 'materials_on_shelf', 'custom_notes', 'name', 'chinese_name'];
    const sanitizedUpdates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field];
      }
    }
    sanitizedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('school_curriculum')
      .update(sanitizedUpdates)
      .eq('id', workId)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, work: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
