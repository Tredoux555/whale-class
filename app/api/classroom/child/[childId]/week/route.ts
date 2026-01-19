import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Get ISO week number
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;

  // Get current week info
  const now = new Date();
  const { week: currentWeek, year: currentYear } = getWeekNumber(now);

  // Get the child's classroom ID
  const { data: childData } = await supabase
    .from('children')
    .select('classroom_id')
    .eq('id', childId)
    .single();
  
  const classroomId = childData?.classroom_id || null;

  // Try to find the most recent weekly plan
  const { data: plans } = await supabase
    .from('weekly_plans')
    .select('id, week_number, year')
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })
    .limit(1);

  const latestPlan = plans?.[0];
  
  if (!latestPlan) {
    return NextResponse.json({ 
      assignments: [], 
      weekInfo: null,
      message: 'No weekly plans found' 
    });
  }

  // Get assignments for this child from the latest plan
  const { data: assignments, error } = await supabase
    .from('weekly_assignments')
    .select(`
      id,
      work_name,
      work_id,
      area,
      progress_status,
      notes
    `)
    .eq('child_id', childId)
    .eq('week_number', latestPlan.week_number)
    .eq('year', latestPlan.year)
    .order('area');

  if (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get media counts for each assignment
  const assignmentIds = (assignments || []).map(a => a.id);
  
  let mediaCounts: Record<string, number> = {};
  
  if (assignmentIds.length > 0) {
    const { data: mediaData } = await supabase
      .from('child_work_media')
      .select('assignment_id')
      .in('assignment_id', assignmentIds);

    (mediaData || []).forEach(m => {
      if (m.assignment_id) {
        mediaCounts[m.assignment_id] = (mediaCounts[m.assignment_id] || 0) + 1;
      }
    });
  }

  // Add media counts to assignments
  const assignmentsWithMedia = (assignments || []).map(a => ({
    ...a,
    mediaCount: mediaCounts[a.id] || 0
  }));

  return NextResponse.json({
    assignments: assignmentsWithMedia,
    weekInfo: {
      week: latestPlan.week_number,
      year: latestPlan.year
    },
    classroomId
  });
}
