// /api/montree/works/next/route.ts
// Get the next work in sequence after a work is mastered
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const workName = searchParams.get('work_name');
    const area = searchParams.get('area');
    
    if (!workName) {
      return NextResponse.json({ error: 'work_name required' }, { status: 400 });
    }

    // First, find the current work by name
    const { data: currentWork, error: workError } = await supabase
      .from('montessori_works')
      .select('id, name, curriculum_area, sub_area, sequence_order')
      .ilike('name', workName)
      .single();

    if (workError || !currentWork) {
      // Try classroom curriculum if not in montessori_works
      const { data: curriculumWork } = await supabase
        .from('classroom_curriculum')
        .select('id, name, area_id, sequence_order')
        .ilike('name', workName)
        .single();
      
      if (curriculumWork) {
        // Get next work in same area by sequence order
        const { data: nextWork } = await supabase
          .from('classroom_curriculum')
          .select('id, name, area_id, name_chinese')
          .eq('area_id', curriculumWork.area_id)
          .gt('sequence_order', curriculumWork.sequence_order || 0)
          .order('sequence_order', { ascending: true })
          .limit(1)
          .single();
        
        if (nextWork) {
          return NextResponse.json({
            success: true,
            next_work: {
              id: nextWork.id,
              name: nextWork.name,
              name_chinese: nextWork.name_chinese,
              area: nextWork.area_id,
              source: 'classroom_curriculum'
            }
          });
        }
      }
      
      return NextResponse.json({ success: true, next_work: null });
    }

    // Method 1: Check work_unlocks table (what this work unlocks)
    const { data: unlocks } = await supabase
      .from('work_unlocks')
      .select(`
        unlocks_work_id,
        montessori_works!work_unlocks_unlocks_work_id_fkey (
          id, name, curriculum_area, sub_area, parent_explanation_simple
        )
      `)
      .eq('work_id', currentWork.id)
      .limit(1);

    if (unlocks && unlocks.length > 0 && unlocks[0].montessori_works) {
      const nextWork = unlocks[0].montessori_works as any;
      return NextResponse.json({
        success: true,
        next_work: {
          id: nextWork.id,
          name: nextWork.name,
          area: nextWork.curriculum_area,
          sub_area: nextWork.sub_area,
          description: nextWork.parent_explanation_simple,
          source: 'work_unlocks'
        }
      });
    }

    // Method 2: Find next work in same sub_area by sequence_order
    if (currentWork.sequence_order !== null) {
      const { data: nextInSequence } = await supabase
        .from('montessori_works')
        .select('id, name, curriculum_area, sub_area, parent_explanation_simple')
        .eq('sub_area', currentWork.sub_area)
        .gt('sequence_order', currentWork.sequence_order)
        .order('sequence_order', { ascending: true })
        .limit(1)
        .single();

      if (nextInSequence) {
        return NextResponse.json({
          success: true,
          next_work: {
            id: nextInSequence.id,
            name: nextInSequence.name,
            area: nextInSequence.curriculum_area,
            sub_area: nextInSequence.sub_area,
            description: nextInSequence.parent_explanation_simple,
            source: 'sequence_order'
          }
        });
      }
    }

    // Method 3: Find works that have this work as a prerequisite
    const { data: dependents } = await supabase
      .from('work_prerequisites')
      .select(`
        work_id,
        montessori_works!work_prerequisites_work_id_fkey (
          id, name, curriculum_area, sub_area, parent_explanation_simple
        )
      `)
      .eq('prerequisite_work_id', currentWork.id)
      .limit(1);

    if (dependents && dependents.length > 0 && dependents[0].montessori_works) {
      const nextWork = dependents[0].montessori_works as any;
      return NextResponse.json({
        success: true,
        next_work: {
          id: nextWork.id,
          name: nextWork.name,
          area: nextWork.curriculum_area,
          sub_area: nextWork.sub_area,
          description: nextWork.parent_explanation_simple,
          source: 'prerequisite'
        }
      });
    }

    // No next work found
    return NextResponse.json({ success: true, next_work: null });

  } catch (error) {
    console.error('Next work error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
