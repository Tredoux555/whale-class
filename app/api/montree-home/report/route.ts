import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');

  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  try {
    // Get child's progress
    const { data: progress, error: progressError } = await supabase
      .from('home_child_progress')
      .select('curriculum_work_id, status, mastered_date')
      .eq('child_id', childId)
      .eq('status', 3); // Only mastered

    if (progressError) throw progressError;

    if (!progress || progress.length === 0) {
      return NextResponse.json({ mastered: [] });
    }

    // Get curriculum details for mastered items
    const { data: curriculum, error: curriculumError } = await supabase
      .from('home_curriculum_master')
      .select('id, name, category, area')
      .in('id', progress.map(p => p.curriculum_work_id));

    if (curriculumError) throw curriculumError;

    // Combine data
    const mastered = (curriculum || []).map(c => {
      const progressRecord = progress.find(p => p.curriculum_work_id === c.id);
      return {
        name: c.name,
        category: c.category,
        area: c.area,
        status: 3,
        mastered_date: progressRecord?.mastered_date
      };
    }).sort((a, b) => {
      // Sort by area, then category, then name
      if (a.area !== b.area) return a.area.localeCompare(b.area);
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ mastered });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching report:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
