// app/api/classroom/[classroomId]/curriculum/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { classroomId: string } }
) {
  try {
    const { classroomId } = params;
    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    let query = supabase
      .from('classroom_curriculum')
      .select('*')
      .eq('classroom_id', classroomId);

    if (activeOnly) query = query.eq('is_active', true);
    if (area) query = query.eq('area', area);

    query = query.order('area').order('category').order('sequence');

    const { data, error } = await query;
    if (error) throw error;

    // Organize by area and category
    const organized: Record<string, Record<string, any[]>> = {};
    for (const work of data || []) {
      if (!organized[work.area]) organized[work.area] = {};
      if (!organized[work.area][work.category]) organized[work.area][work.category] = [];
      organized[work.area][work.category].push(work);
    }

    // Transform to nested structure for frontend
    const curriculum: any[] = [];
    for (const [areaId, categories] of Object.entries(organized)) {
      const areaData: any = {
        id: areaId,
        name: areaId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        categories: []
      };
      
      for (const [catId, works] of Object.entries(categories)) {
        areaData.categories.push({
          id: catId,
          name: catId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          works: works.map((w: any) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            sequence: w.sequence,
            materialsOnShelf: w.materials_on_shelf,
            customNotes: w.custom_notes,
            isCustom: w.is_custom
          }))
        });
      }
      
      curriculum.push(areaData);
    }

    return NextResponse.json({ success: true, works: data, organized, curriculum, count: data?.length || 0 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { classroomId: string } }
) {
  try {
    const { workId, updates } = await request.json();
    if (!workId) return NextResponse.json({ success: false, error: 'workId required' }, { status: 400 });

    const allowedFields = ['name', 'description', 'is_active', 'materials_on_shelf', 'custom_notes', 'sequence'];
    const sanitized: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const f of allowedFields) if (updates[f] !== undefined) sanitized[f] = updates[f];

    const { data, error } = await supabase
      .from('classroom_curriculum')
      .update(sanitized)
      .eq('id', workId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, work: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { classroomId: string } }
) {
  try {
    const { classroomId } = params;
    const { area, category, name, description } = await request.json();
    if (!area || !category || !name) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('classroom_curriculum')
      .select('sequence')
      .eq('classroom_id', classroomId)
      .eq('area', area)
      .eq('category', category)
      .order('sequence', { ascending: false })
      .limit(1);

    const nextSeq = existing?.length ? existing[0].sequence + 1 : 0;

    const { data, error } = await supabase
      .from('classroom_curriculum')
      .insert({
        classroom_id: classroomId,
        area, category, name,
        description: description || null,
        sequence: nextSeq,
        is_active: true,
        materials_on_shelf: true,
        is_custom: true
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, work: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


