// /api/montree/students/[id]/route.ts
// Get single student with full progress details
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
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  const { id: studentId } = await params;

  try {
    // 1. Get student
    const { data: student, error: studentError } = await supabase
      .from('children')
      .select('id, name, date_of_birth, display_order, school_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      console.error('Student not found:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // 2. Get progress for this student
    const { data: progressData, error: progressError } = await supabase
      .from('child_work_completion')
      .select('id, work_id, status, completed_date, notes')
      .eq('child_id', studentId);

    if (progressError) {
      console.error('Progress query error:', progressError);
    }

    // 3. Get works (photos) for this student
    const { data: works, error: worksError } = await supabase
      .from('student_works')
      .select('id, work_name, area, photo_url, notes, created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (worksError) {
      console.error('Works query error:', worksError);
    }

    // 4. Calculate progress by area
    const progressByArea: Record<string, { completed: number; in_progress: number; total: number }> = {
      practical_life: { completed: 0, in_progress: 0, total: 25 },
      sensorial: { completed: 0, in_progress: 0, total: 20 },
      language: { completed: 0, in_progress: 0, total: 22 },
      math: { completed: 0, in_progress: 0, total: 20 },
      science: { completed: 0, in_progress: 0, total: 10 },
    };

    // Count progress (simplified - would need work_id -> area mapping in production)
    (progressData || []).forEach(p => {
      // For now, just count totals
      if (p.status === 'completed') {
        progressByArea.practical_life.completed++;
      }
    });

    return NextResponse.json({
      student,
      progress: progressByArea,
      recentWorks: works || [],
      totalCompleted: (progressData || []).filter(p => p.status === 'completed').length,
      totalInProgress: (progressData || []).filter(p => p.status === 'in_progress').length,
    });

  } catch (error: any) {
    console.error('Montree student detail API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
