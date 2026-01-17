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

// Beijing International School slug
const SCHOOL_SLUG = 'beijing-international';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();

  try {
    // 1. Get school by slug
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, slug')
      .eq('slug', SCHOOL_SLUG)
      .single();

    if (schoolError || !school) {
      console.error('School not found:', schoolError);
      return NextResponse.json({ 
        error: 'School not found', 
        detail: schoolError?.message,
        slug: SCHOOL_SLUG 
      }, { status: 404 });
    }

    // 2. Get all students for the school
    // Try with display_order first, fall back to name if column doesn't exist
    let students: any[] = [];
    let studentsError: any = null;

    // First try with display_order
    const result1 = await supabase
      .from('children')
      .select('id, name, date_of_birth')
      .eq('school_id', school.id)
      .order('name', { ascending: true });

    if (result1.error) {
      console.error('Students query error:', result1.error);
      return NextResponse.json({ error: result1.error.message }, { status: 500 });
    }
    
    students = result1.data || [];

    // 3. Get progress for all students (batch query)
    const studentIds = students.map(s => s.id);
    
    let progressData: any[] = [];
    if (studentIds.length > 0) {
      const { data, error: progressError } = await supabase
        .from('child_work_completion')
        .select('child_id, status')
        .in('child_id', studentIds);

      if (progressError) {
        console.error('Progress query error:', progressError);
        // Continue without progress data
      } else {
        progressData = data || [];
      }
    }

    // 4. Calculate progress per student
    const progressByStudent: Record<string, { completed: number; in_progress: number; total: number }> = {};
    
    progressData.forEach(p => {
      if (!progressByStudent[p.child_id]) {
        progressByStudent[p.child_id] = { completed: 0, in_progress: 0, total: 0 };
      }
      progressByStudent[p.child_id].total++;
      if (p.status === 'completed') progressByStudent[p.child_id].completed++;
      if (p.status === 'in_progress') progressByStudent[p.child_id].in_progress++;
    });

    // 5. Combine students with progress
    const studentsWithProgress = students.map(student => {
      const progress = progressByStudent[student.id] || { completed: 0, in_progress: 0, total: 0 };
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
      school_id: school.id,
      school_name: school.name
    });

  } catch (error: any) {
    console.error('Montree students API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
