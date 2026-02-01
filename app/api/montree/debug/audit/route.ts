// /api/montree/debug/audit/route.ts
// Full audit of all data for a classroom
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    // Get table schemas first
    const { data: childrenCols } = await supabase.rpc('get_table_columns', { table_name: 'montree_children' }).single();

    // Fallback: just try to get one record to see columns
    const { data: sampleChild, error: sampleErr } = await supabase
      .from('montree_children')
      .select('*')
      .limit(1);

    // Get all classrooms
    const { data: classrooms, error: classroomsErr } = await supabase
      .from('montree_classrooms')
      .select('id, name, school_id, is_active')
      .limit(10);

    let classroomData = null;
    let areas = null;
    let works = null;
    let children = null;

    if (classroomId) {
      // Get specific classroom
      const { data: cr } = await supabase
        .from('montree_classrooms')
        .select('*')
        .eq('id', classroomId)
        .single();
      classroomData = cr;

      // Get areas
      const { data: ar, error: arErr } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('*')
        .eq('classroom_id', classroomId);
      areas = { data: ar, error: arErr?.message, count: ar?.length };

      // Get works
      const { data: wk, error: wkErr } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, area_id, sequence, is_active')
        .eq('classroom_id', classroomId)
        .order('sequence')
        .limit(20);
      works = { data: wk, error: wkErr?.message, count: wk?.length };

      // Get children (without school_id to avoid error)
      const { data: ch, error: chErr } = await supabase
        .from('montree_children')
        .select('id, name, age, classroom_id')
        .eq('classroom_id', classroomId);
      children = { data: ch, error: chErr?.message, count: ch?.length };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      classroomId,
      classrooms: { data: classrooms, error: classroomsErr?.message },
      classroom: classroomData,
      areas,
      works,
      children,
      sampleChildRecord: sampleChild?.[0] || null,
      sampleChildError: sampleErr?.message,
      // Show what columns exist based on sample
      childrenColumns: sampleChild?.[0] ? Object.keys(sampleChild[0]) : [],
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
