import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Get child's classroom
    const { data: child } = await supabase
      .from('montree_children')
      .select('classroom_id')
      .eq('id', childId)
      .single();

    if (!child?.classroom_id) {
      return NextResponse.json({ assignments: [], total: 0 });
    }

    // Get curriculum works for this classroom
    const { data: works, error: worksError } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        id, work_key, name, name_chinese, age_range, sequence,
        area:montree_classroom_curriculum_areas!area_id (
          area_key, name, icon
        )
      `)
      .eq('classroom_id', child.classroom_id)
      .eq('is_active', true)
      .order('sequence')
      .limit(20); // Show first 20 works for "This Week"

    if (worksError) {
      console.error('Works fetch error:', worksError);
      return NextResponse.json({ error: 'Failed to fetch works' }, { status: 500 });
    }

    // Get existing progress for this child
    const { data: progress } = await supabase
      .from('montree_child_progress')
      .select('work_name, status')
      .eq('child_id', childId);

    // Create a map of work_name -> status
    const progressMap = new Map();
    for (const p of progress || []) {
      progressMap.set(p.work_name?.toLowerCase(), p.status);
    }

    // Transform works to assignments with progress status
    const assignments = (works || []).map(work => ({
      id: work.id,
      work_key: work.work_key,
      work_name: work.name,
      work_name_chinese: work.name_chinese,
      area: work.area?.area_key || 'practical_life',
      area_name: work.area?.name || 'Practical Life',
      area_icon: work.area?.icon || '📋',
      age_range: work.age_range,
      status: progressMap.get(work.name?.toLowerCase()) || 'not_started'
    }));

    return NextResponse.json({
      assignments,
      total: assignments.length
    });

  } catch (error) {
    console.error('Weekly assignments error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
