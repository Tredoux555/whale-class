import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { childId, weekNumber, year, area, workName } = await request.json();

    if (!childId || !weekNumber || !year || !area || !workName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing curriculum work that matches
    const { data: existingWork } = await supabase
      .from('curriculum_roadmap')
      .select('id, name, chinese_name, video_url')
      .ilike('name', workName)
      .single();

    const { data: assignment, error } = await supabase
      .from('weekly_assignments')
      .insert({
        child_id: childId,
        week_number: parseInt(weekNumber),
        year: parseInt(year),
        area: area,
        work_name: workName,
        work_id: existingWork?.id || null,
        progress_status: 'not_started',
        status: 'not_started'
      })
      .select()
      .single();

    if (error) {
      console.error('Add work error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      assignment: {
        id: assignment.id,
        work_name: assignment.work_name,
        work_name_chinese: existingWork?.chinese_name,
        area: assignment.area,
        progress_status: assignment.progress_status,
        work_id: assignment.work_id,
        video_url: existingWork?.video_url,
        notes: assignment.notes
      }
    });

  } catch (error) {
    console.error('Failed to add work:', error);
    return NextResponse.json({ error: 'Failed to add work' }, { status: 500 });
  }
}
