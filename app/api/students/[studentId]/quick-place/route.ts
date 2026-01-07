// app/api/students/[studentId]/quick-place/route.ts
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
  { params }: { params: { studentId: string } }
) {
  try {
    const supabase = getSupabase();
    const { studentId } = params;

    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, school_id')
      .eq('id', studentId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const { data: curriculum } = await supabase
      .from('school_curriculum')
      .select('id, name, area_id, sequence')
      .eq('school_id', child.school_id)
      .eq('is_active', true)
      .order('area_id')
      .order('sequence');

    const { data: progress } = await supabase
      .from('child_work_completion')
      .select('school_work_id, status, mastery_level')
      .eq('child_id', studentId);

    const currentPositions: Record<string, string | null> = {};
    const areas = ['practical_life', 'sensorial', 'math', 'language', 'cultural'];
    
    for (const area of areas) {
      const areaWorks = (curriculum || []).filter(w => w.area_id === area);
      const practicing = areaWorks.find(w => {
        const prog = (progress || []).find(p => p.school_work_id === w.id);
        return prog?.status === 'practicing' || prog?.mastery_level === 2;
      });
      currentPositions[area] = practicing?.id || null;
    }

    const groupedCurriculum = (curriculum || []).reduce((acc, work) => {
      if (!acc[work.area_id]) acc[work.area_id] = [];
      acc[work.area_id].push({ id: work.id, name: work.name, sequence: work.sequence });
      return acc;
    }, {} as Record<string, Array<{ id: string; name: string; sequence: number }>>);

    return NextResponse.json({ child, currentPositions, curriculum: groupedCurriculum });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const supabase = getSupabase();
    const { studentId } = params;
    const body = await request.json();
    const { placements } = body;

    if (!placements || !Array.isArray(placements)) {
      return NextResponse.json({ error: 'placements array required' }, { status: 400 });
    }

    const { data: child } = await supabase
      .from('children')
      .select('school_id')
      .eq('id', studentId)
      .single();

    if (!child?.school_id) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    for (const placement of placements) {
      const { area_id, work_id } = placement;
      if (!work_id) continue;

      const { data: selectedWork } = await supabase
        .from('school_curriculum')
        .select('sequence')
        .eq('id', work_id)
        .single();

      if (!selectedWork) continue;

      const { data: areaWorks } = await supabase
        .from('school_curriculum')
        .select('id, sequence')
        .eq('school_id', child.school_id)
        .eq('area_id', area_id)
        .eq('is_active', true);

      if (!areaWorks) continue;

      const previousWorks = areaWorks.filter(w => w.sequence < selectedWork.sequence);
      for (const prevWork of previousWorks) {
        await supabase
          .from('child_work_completion')
          .upsert({
            child_id: studentId,
            school_work_id: prevWork.id,
            status: 'mastered',
            mastery_level: 3,
            completion_date: new Date().toISOString().split('T')[0]
          }, { onConflict: 'child_id,school_work_id' });
      }

      await supabase
        .from('child_work_completion')
        .upsert({
          child_id: studentId,
          school_work_id: work_id,
          status: 'practicing',
          mastery_level: 2,
          started_at: new Date().toISOString()
        }, { onConflict: 'child_id,school_work_id' });
    }

    return NextResponse.json({ success: true, message: 'Positions updated' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update positions' }, { status: 500 });
  }
}
