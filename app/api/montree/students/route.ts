// /api/montree/students/route.ts
// Get all students with progress summary
// Clean Montree API - separate from legacy
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Beijing International School ID (hardcoded for now - single tenant)
const SCHOOL_ID = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  try {
    // 1. Get all students for the school, ordered by display_order
    const { data: students, error: studentsError } = await supabase
      .from('children')
      .select('id, name, date_of_birth, display_order')
      .eq('school_id', SCHOOL_ID)
      .order('display_order', { ascending: true });

    if (studentsError) {
      console.error('Students query error:', studentsError);
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    // 2. Get progress for all students (batch query)
    const studentIds = (students || []).map(s => s.id);
    
    const { data: progressData, error: progressError } = await supabase
      .from('child_work_completion')
      .select('child_id, status')
      .in('child_id', studentIds);

    if (progressError) {
      console.error('Progress query error:', progressError);
      // Continue without progress data
    }

    // 3. Calculate progress per student
    const progressByStudent: Record<string, { completed: number; in_progress: number; total: number }> = {};
    
    (progressData || []).forEach(p => {
      if (!progressByStudent[p.child_id]) {
        progressByStudent[p.child_id] = { completed: 0, in_progress: 0, total: 0 };
      }
      progressByStudent[p.child_id].total++;
      if (p.status === 'completed') progressByStudent[p.child_id].completed++;
      if (p.status === 'in_progress') progressByStudent[p.child_id].in_progress++;
    });

    // 4. Combine students with progress
    const studentsWithProgress = (students || []).map(student => {
      const progress = progressByStudent[student.id] || { completed: 0, in_progress: 0, total: 0 };
      // Assume 97 total works in curriculum for percentage calculation
      const totalWorks = 97;
      const percentage = Math.round((progress.completed / totalWorks) * 100);
      
      return {
        ...student,
        progress: {
          completed: progress.completed,
          in_progress: progress.in_progress,
          percentage,
        }
      };
    });

    return NextResponse.json({
      students: studentsWithProgress,
      count: studentsWithProgress.length,
      school_id: SCHOOL_ID
    });

  } catch (error: any) {
    console.error('Montree students API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
