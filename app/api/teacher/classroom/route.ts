import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// THE STEM school ID - Beijing International School
const BEIJING_SCHOOL_ID = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  
  // Get teacher name from cookie or query param
  const cookieStore = await cookies();
  const teacherName = cookieStore.get('teacherName')?.value;
  const { searchParams } = new URL(request.url);
  const queryTeacher = searchParams.get('teacher');
  const currentTeacher = teacherName || queryTeacher;
  
  if (!currentTeacher) {
    return NextResponse.json({ error: 'Not authenticated', children: [] }, { status: 401 });
  }

  // TREDOUX: Pull directly from THE STEM (children table with school_id)
  if (currentTeacher === 'Tredoux') {
    const { data: children, error } = await supabase
      .from('children')
      .select('id, name, date_of_birth, age_group, photo_url')
      .eq('school_id', BEIJING_SCHOOL_ID)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching STEM children:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get progress and game data for these children
    const childIds = (children || []).map(c => c.id);
    const childrenWithProgress = await enrichChildrenData(supabase, children || [], childIds);

    return NextResponse.json({
      children: childrenWithProgress,
      teacher: 'Tredoux',
      count: childrenWithProgress.length,
      source: 'THE_STEM'
    });
  }

  // OTHER TEACHERS: Use junction table (existing logic)
  const { data: teacher, error: teacherError } = await supabase
    .from('simple_teachers')
    .select('id, name')
    .eq('name', currentTeacher)
    .single();

  if (teacherError || !teacher) {
    return NextResponse.json({ 
      children: [], 
      teacher: currentTeacher,
      message: 'No students assigned. Contact admin to assign students.'
    });
  }

  const { data: teacherChildren, error: tcError } = await supabase
    .from('teacher_children')
    .select(`
      child_id,
      children (
        id, name, date_of_birth, age_group, photo_url, active_status, display_order
      )
    `)
    .eq('teacher_id', teacher.id);

  if (tcError) {
    return NextResponse.json({ error: tcError.message }, { status: 500 });
  }

  const children = (teacherChildren || [])
    .map(tc => tc.children)
    .filter(c => c && c.active_status);

  const childIds = children.map(c => c.id);
  const childrenWithProgress = await enrichChildrenData(supabase, children, childIds);

  return NextResponse.json({ 
    children: childrenWithProgress,
    teacher: teacher.name,
    teacherId: teacher.id,
    count: childrenWithProgress.length
  });
}

// Helper: Add progress and game data to children
async function enrichChildrenData(supabase: any, children: any[], childIds: string[]) {
  if (childIds.length === 0) return [];

  // Fetch all progress data in parallel
  const [workProgressRes, weeklyProgressRes, skillProgressRes, gameProgressRes] = await Promise.all([
    supabase.from('child_work_progress').select('child_id, status').in('child_id', childIds),
    supabase.from('weekly_assignments').select('child_id, progress_status').in('child_id', childIds),
    supabase.from('child_progress').select('child_id, status_level').in('child_id', childIds),
    supabase.from('game_sessions').select('child_id, game_name, started_at, duration_seconds')
      .in('child_id', childIds).order('started_at', { ascending: false })
  ]);

  const workProgress = workProgressRes.data || [];
  const weeklyProgress = weeklyProgressRes.data || [];
  const skillProgress = skillProgressRes.data || [];
  const gameProgress = gameProgressRes.data || [];

  return children.map(child => {
    // Calculate age
    let age = null;
    if (child.date_of_birth) {
      const dob = new Date(child.date_of_birth);
      const diffMs = Date.now() - dob.getTime();
      age = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    }

    // Aggregate progress from all sources
    const cwp = workProgress.filter((p: any) => p.child_id === child.id);
    const wa = weeklyProgress.filter((p: any) => p.child_id === child.id);
    const cp = skillProgress.filter((p: any) => p.child_id === child.id);

    const presented = 
      cwp.filter((p: any) => p.status === 1).length +
      wa.filter((p: any) => p.progress_status === 'presented').length +
      cp.filter((p: any) => p.status_level === 1).length;

    const practicing = 
      cwp.filter((p: any) => p.status === 2).length +
      wa.filter((p: any) => p.progress_status === 'practicing').length +
      cp.filter((p: any) => p.status_level >= 2 && p.status_level <= 3).length;

    const mastered = 
      cwp.filter((p: any) => p.status === 3).length +
      wa.filter((p: any) => p.progress_status === 'mastered').length +
      cp.filter((p: any) => p.status_level >= 4).length;

    // Get most recent game
    const childGames = gameProgress.filter((g: any) => g.child_id === child.id);
    const lastGame = childGames[0] || null;

    return {
      ...child,
      age,
      progress: { presented, practicing, mastered, total: presented + practicing + mastered },
      lastGame: lastGame ? {
        name: lastGame.game_name,
        playedAt: lastGame.started_at,
        duration: lastGame.duration_seconds
      } : null,
      totalGameSessions: childGames.length
    };
  });
}
