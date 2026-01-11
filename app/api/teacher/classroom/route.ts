import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  
  // Get teacher name from cookie (set during login)
  const cookieStore = await cookies();
  const teacherName = cookieStore.get('teacherName')?.value;
  
  // Also check query param for flexibility
  const { searchParams } = new URL(request.url);
  const queryTeacher = searchParams.get('teacher');
  
  const currentTeacher = teacherName || queryTeacher;
  
  if (!currentTeacher) {
    return NextResponse.json({ error: 'Not authenticated', children: [] }, { status: 401 });
  }

  // Get teacher's ID from simple_teachers
  const { data: teacher, error: teacherError } = await supabase
    .from('simple_teachers')
    .select('id, name')
    .eq('name', currentTeacher)
    .single();

  if (teacherError || !teacher) {
    // Fallback: teacher not in database yet (legacy localStorage login)
    // For now, return empty to prevent data leakage
    console.log(`Teacher ${currentTeacher} not found in database`);
    return NextResponse.json({ 
      children: [], 
      teacher: currentTeacher,
      message: 'No students assigned. Contact admin to assign students.'
    });
  }

  // Get ONLY this teacher's children via teacher_children junction table
  const { data: teacherChildren, error: tcError } = await supabase
    .from('teacher_children')
    .select(`
      child_id,
      children (
        id,
        name,
        date_of_birth,
        age_group,
        photo_url,
        active_status
      )
    `)
    .eq('teacher_id', teacher.id);

  if (tcError) {
    console.error('Error fetching teacher children:', tcError);
    return NextResponse.json({ error: tcError.message }, { status: 500 });
  }

  // Flatten the children data
  const children = (teacherChildren || [])
    .map(tc => tc.children)
    .filter(c => c && c.active_status);

  // Get progress data for these children only
  const childIds = children.map(c => c.id);
  
  let workProgress: any[] = [];
  let weeklyProgress: any[] = [];
  let skillProgress: any[] = [];

  if (childIds.length > 0) {
    // child_work_progress
    const { data: wp } = await supabase
      .from('child_work_progress')
      .select('child_id, status')
      .in('child_id', childIds);
    workProgress = wp || [];

    // weekly_assignments
    const { data: wa } = await supabase
      .from('weekly_assignments')
      .select('child_id, progress_status')
      .in('child_id', childIds);
    weeklyProgress = wa || [];

    // child_progress
    const { data: cp } = await supabase
      .from('child_progress')
      .select('child_id, status_level')
      .in('child_id', childIds);
    skillProgress = cp || [];
  }

  // Calculate age and aggregate progress for each child
  const childrenWithProgress = children.map(child => {
    // Calculate age
    let age = null;
    if (child.date_of_birth) {
      const dob = new Date(child.date_of_birth);
      const today = new Date();
      const diffMs = today.getTime() - dob.getTime();
      age = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    }

    // Aggregate from child_work_progress (status 1=presented, 2=practicing, 3=mastered)
    const cwp = workProgress.filter(p => p.child_id === child.id);
    const cwpPresented = cwp.filter(p => p.status === 1).length;
    const cwpPracticing = cwp.filter(p => p.status === 2).length;
    const cwpMastered = cwp.filter(p => p.status === 3).length;

    // Aggregate from weekly_assignments
    const wa = weeklyProgress.filter(p => p.child_id === child.id);
    const waPresented = wa.filter(p => p.progress_status === 'presented').length;
    const waPracticing = wa.filter(p => p.progress_status === 'practicing').length;
    const waMastered = wa.filter(p => p.progress_status === 'mastered').length;

    // Aggregate from child_progress
    const cp = skillProgress.filter(p => p.child_id === child.id);
    const cpPresented = cp.filter(p => p.status_level === 1).length;
    const cpPracticing = cp.filter(p => p.status_level >= 2 && p.status_level <= 3).length;
    const cpMastered = cp.filter(p => p.status_level >= 4).length;

    // Combine all progress
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

  return NextResponse.json({ 
    children: childrenWithProgress,
    teacher: teacher.name,
    teacherId: teacher.id,
    count: childrenWithProgress.length
  });
}
