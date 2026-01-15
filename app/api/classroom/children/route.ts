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
  const schoolId = searchParams.get('schoolId') || '00000000-0000-0000-0000-000000000001';

  // Get all active children
  const { data: children, error: childError } = await supabase
    .from('children')
    .select('id, name, date_of_birth, age_group, photo_url, active_status')
    .eq('active_status', true)
    .order('name');

  if (childError) {
    console.error('Error fetching children:', childError);
    return NextResponse.json({ error: childError.message }, { status: 500 });
  }

  const childIds = (children || []).map(c => c.id);

  if (childIds.length === 0) {
    return NextResponse.json({ children: [], count: 0 });
  }

  // Get progress from child_work_progress
  const { data: workProgress } = await supabase
    .from('child_work_progress')
    .select('child_id, status')
    .in('child_id', childIds);

  // Get progress from weekly_assignments
  const { data: weeklyProgress } = await supabase
    .from('weekly_assignments')
    .select('child_id, progress_status')
    .in('child_id', childIds);

  // Get media counts per child
  const { data: mediaCounts } = await supabase
    .from('child_work_media')
    .select('child_id')
    .in('child_id', childIds);

  // Count media per child
  const mediaCountMap: Record<string, number> = {};
  (mediaCounts || []).forEach(m => {
    mediaCountMap[m.child_id] = (mediaCountMap[m.child_id] || 0) + 1;
  });

  // Get last activity (most recent media upload)
  const { data: lastMedia } = await supabase
    .from('child_work_media')
    .select('child_id, taken_at')
    .in('child_id', childIds)
    .order('taken_at', { ascending: false })
    .limit(100);

  const lastActivityMap: Record<string, string> = {};
  (lastMedia || []).forEach(m => {
    if (!lastActivityMap[m.child_id]) {
      lastActivityMap[m.child_id] = m.taken_at;
    }
  });

  // Calculate progress for each child
  const childrenWithProgress = (children || []).map(child => {
    // Calculate age
    let age = null;
    if (child.date_of_birth) {
      const dob = new Date(child.date_of_birth);
      const today = new Date();
      const diffMs = today.getTime() - dob.getTime();
      age = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    }

    // From child_work_progress (status 1=presented, 2=practicing, 3=mastered)
    const cwp = (workProgress || []).filter(p => p.child_id === child.id);
    const cwpPresented = cwp.filter(p => p.status === 1).length;
    const cwpPracticing = cwp.filter(p => p.status === 2).length;
    const cwpMastered = cwp.filter(p => p.status === 3).length;

    // From weekly_assignments
    const wa = (weeklyProgress || []).filter(p => p.child_id === child.id);
    const waPresented = wa.filter(p => p.progress_status === 'presented').length;
    const waPracticing = wa.filter(p => p.progress_status === 'practicing').length;
    const waMastered = wa.filter(p => p.progress_status === 'mastered').length;

    // Combine (avoid double counting - take max)
    const presented = Math.max(cwpPresented, waPresented);
    const practicing = Math.max(cwpPracticing, waPracticing);
    const mastered = Math.max(cwpMastered, waMastered);

    return {
      id: child.id,
      name: child.name,
      date_of_birth: child.date_of_birth,
      age_group: child.age_group,
      photo_url: child.photo_url,
      age,
      progress: {
        presented,
        practicing,
        mastered,
        total: presented + practicing + mastered
      },
      mediaCount: mediaCountMap[child.id] || 0,
      lastActivity: lastActivityMap[child.id] || null
    };
  });

  return NextResponse.json({
    children: childrenWithProgress,
    count: childrenWithProgress.length
  });
}
