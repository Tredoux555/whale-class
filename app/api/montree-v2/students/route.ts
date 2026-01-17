// /api/montree-v2/students/route.ts
// CLEAN Montree API - Students endpoint
// Returns all students with progress summaries
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize at request time, not build time
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Beijing International School (hardcoded for single-tenant MVP)
const SCHOOL_ID = '772b08f1-4e56-4ea6-83b5-21aa8f079b35';
const TOTAL_CURRICULUM_WORKS = 97;

export async function GET() {
  const supabase = getSupabase();
  
  try {
    // 1. Get all students ordered by display_order
    const { data: students, error: studentErr } = await supabase
      .from('children')
      .select('id, name, date_of_birth, display_order')
      .eq('school_id', SCHOOL_ID)
      .order('display_order', { ascending: true });

    if (studentErr) throw studentErr;
    if (!students?.length) {
      return NextResponse.json({ students: [], count: 0 });
    }

    // 2. Get all progress records for these students
    const studentIds = students.map(s => s.id);
    const { data: progress } = await supabase
      .from('child_work_completion')
      .select('child_id, status')
      .in('child_id', studentIds);

    // 3. Calculate progress per student
    const progressMap: Record<string, { completed: number; practicing: number }> = {};
    (progress || []).forEach(p => {
      if (!progressMap[p.child_id]) {
        progressMap[p.child_id] = { completed: 0, practicing: 0 };
      }
      if (p.status === 'completed' || p.status === 'mastered') {
        progressMap[p.child_id].completed++;
      }
      if (p.status === 'in_progress' || p.status === 'practicing') {
        progressMap[p.child_id].practicing++;
      }
    });

    // 4. Combine data
    const enrichedStudents = students.map(s => ({
      id: s.id,
      name: s.name,
      displayOrder: s.display_order || 99,
      progress: {
        completed: progressMap[s.id]?.completed || 0,
        practicing: progressMap[s.id]?.practicing || 0,
        percentage: Math.round(((progressMap[s.id]?.completed || 0) / TOTAL_CURRICULUM_WORKS) * 100)
      }
    }));

    return NextResponse.json({
      students: enrichedStudents,
      count: enrichedStudents.length
    });

  } catch (error: any) {
    console.error('[Montree API] Students error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
