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
  { params }: { params: Promise<{ childId: string }> }
) {
  const supabase = getSupabase();
  const { childId } = await params;

  // Get all curriculum works
  const { data: curriculum, error: currError } = await supabase
    .from('curriculum_roadmap')
    .select('id, name, area, category, subcategory, sequence_order')
    .order('area')
    .order('sequence_order');

  if (currError) {
    console.error('Error fetching curriculum:', currError);
    return NextResponse.json({ error: currError.message }, { status: 500 });
  }

  // Get child's progress from child_work_progress
  const { data: progress } = await supabase
    .from('child_work_progress')
    .select('work_id, status')
    .eq('child_id', childId);

  // Get progress from weekly assignments too
  const { data: weeklyProgress } = await supabase
    .from('weekly_assignments')
    .select('work_id, progress_status')
    .eq('child_id', childId);

  // Create a map of work_id to status
  const progressMap: Record<string, number> = {};

  // Add from child_work_progress (status is 0-3)
  (progress || []).forEach(p => {
    if (p.work_id) {
      progressMap[p.work_id] = p.status;
    }
  });

  // Add from weekly_assignments (convert string status to number)
  const statusToNumber: Record<string, number> = {
    'not_started': 0,
    'presented': 1,
    'practicing': 2,
    'mastered': 3
  };
  
  (weeklyProgress || []).forEach(p => {
    if (p.work_id) {
      const numStatus = statusToNumber[p.progress_status] || 0;
      // Take the higher status
      progressMap[p.work_id] = Math.max(progressMap[p.work_id] || 0, numStatus);
    }
  });

  // Combine curriculum with progress
  const works = (curriculum || []).map(work => ({
    id: work.id,
    name: work.name,
    area: work.area,
    category: work.category,
    subcategory: work.subcategory,
    status: progressMap[work.id] || 0
  }));

  return NextResponse.json({ works });
}
