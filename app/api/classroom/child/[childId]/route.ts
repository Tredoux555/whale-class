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

  // Get child details
  const { data: child, error: childError } = await supabase
    .from('children')
    .select('id, name, date_of_birth, age_group, photo_url')
    .eq('id', childId)
    .single();

  if (childError || !child) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  }

  // Get progress from child_work_progress
  const { data: workProgress } = await supabase
    .from('child_work_progress')
    .select('status')
    .eq('child_id', childId);

  // Get progress from weekly_assignments
  const { data: weeklyProgress } = await supabase
    .from('weekly_assignments')
    .select('progress_status')
    .eq('child_id', childId);

  // Get media count
  const { count: mediaCount } = await supabase
    .from('child_work_media')
    .select('id', { count: 'exact', head: true })
    .eq('child_id', childId);

  // Calculate age
  let age = null;
  if (child.date_of_birth) {
    const dob = new Date(child.date_of_birth);
    const today = new Date();
    const diffMs = today.getTime() - dob.getTime();
    age = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  }

  // Calculate progress
  const cwp = workProgress || [];
  const cwpPresented = cwp.filter(p => p.status === 1).length;
  const cwpPracticing = cwp.filter(p => p.status === 2).length;
  const cwpMastered = cwp.filter(p => p.status === 3).length;

  const wa = weeklyProgress || [];
  const waPresented = wa.filter(p => p.progress_status === 'presented').length;
  const waPracticing = wa.filter(p => p.progress_status === 'practicing').length;
  const waMastered = wa.filter(p => p.progress_status === 'mastered').length;

  const presented = Math.max(cwpPresented, waPresented);
  const practicing = Math.max(cwpPracticing, waPracticing);
  const mastered = Math.max(cwpMastered, waMastered);

  return NextResponse.json({
    child: {
      ...child,
      age,
      progress: {
        presented,
        practicing,
        mastered,
        total: presented + practicing + mastered
      },
      mediaCount: mediaCount || 0
    }
  });
}
