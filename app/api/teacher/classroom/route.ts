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

  // Get all children
  const { data: children, error: childrenError } = await supabase
    .from('children')
    .select('id, name, date_of_birth, age_group, photo_url')
    .order('name');

  if (childrenError) {
    return NextResponse.json({ error: childrenError.message }, { status: 500 });
  }

  // Try multiple progress tables (different systems may have been used)
  
  // 1. child_work_progress (teacher portal system)
  const { data: workProgress } = await supabase
    .from('child_work_progress')
    .select('child_id, status');

  // 2. weekly_assignments (weekly planning system) 
  const { data: weeklyProgress } = await supabase
    .from('weekly_assignments')
    .select('child_id, progress_status');

  // 3. child_progress (skill-based system)
  const { data: skillProgress } = await supabase
    .from('child_progress')
    .select('child_id, status_level');

  // Calculate age and aggregate progress for each child
  const childrenWithProgress = (children || []).map(child => {
    // Calculate age
    let age = null;
    if (child.date_of_birth) {
      const dob = new Date(child.date_of_birth);
      const today = new Date();
      const diffMs = today.getTime() - dob.getTime();
      age = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    }

    // Aggregate from child_work_progress (status 1=presented, 2=practicing, 3=mastered)
    const cwp = (workProgress || []).filter(p => p.child_id === child.id);
    const cwpPresented = cwp.filter(p => p.status === 1).length;
    const cwpPracticing = cwp.filter(p => p.status === 2).length;
    const cwpMastered = cwp.filter(p => p.status === 3).length;

    // Aggregate from weekly_assignments (progress_status = 'presented', 'practicing', 'mastered')
    const wa = (weeklyProgress || []).filter(p => p.child_id === child.id);
    const waPresented = wa.filter(p => p.progress_status === 'presented').length;
    const waPracticing = wa.filter(p => p.progress_status === 'practicing').length;
    const waMastered = wa.filter(p => p.progress_status === 'mastered').length;

    // Aggregate from child_progress (status_level 1=observed, 2=guided, 3=independent, 4=mastery)
    const cp = (skillProgress || []).filter(p => p.child_id === child.id);
    const cpPresented = cp.filter(p => p.status_level === 1).length;
    const cpPracticing = cp.filter(p => p.status_level >= 2 && p.status_level <= 3).length;
    const cpMastered = cp.filter(p => p.status_level >= 4).length;

    // Combine all progress (take the max from any system)
    const presented = cwpPresented + waPresented + cpPresented;
    const practicing = cwpPracticing + waPracticing + cpPracticing;
    const mastered = cwpMastered + waMastered + cpMastered;

    return {
      ...child,
      age,
      progress: {
        presented,
        practicing,
        mastered,
        total: presented + practicing + mastered
      }
    };
  });

  return NextResponse.json({ children: childrenWithProgress });
}
