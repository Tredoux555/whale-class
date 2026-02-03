// app/api/whale/teacher/assign-work/route.ts
// Assign a work to one or more students

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workId, studentIds } = body;

    if (!workId || !studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json(
        { error: 'workId and studentIds array required' },
        { status: 400 }
      );
    }

    // SECURITY: Verify teacher has access to ALL requested students
    const { data: access } = await supabase
      .from('teacher_students')
      .select('student_id')
      .eq('teacher_id', user.id)
      .eq('is_active', true)
      .in('student_id', studentIds);

    const authorizedIds = access?.map(a => a.student_id) || [];
    const unauthorizedIds = studentIds.filter(id => !authorizedIds.includes(id));

    // SECURITY: Deny if ANY students are unauthorized (fail securely)
    if (unauthorizedIds.length > 0) {
      return NextResponse.json(
        { error: 'Not authorized for some students' },
        { status: 403 }
      );
    }
    
    // SECURITY: Verify all requested students were authorized
    if (authorizedIds.length !== studentIds.length) {
      return NextResponse.json(
        { error: 'Not authorized for some students' },
        { status: 403 }
      );
    }

    // Get work details for max_level
    const { data: work } = await supabase
      .from('curriculum_roadmap')
      .select('levels')
      .eq('id', workId)
      .single();

    const maxLevel = work?.levels?.length || 1;

    // Create work assignments (start work for each student)
    const assignments = authorizedIds.map(studentId => ({
      child_id: studentId,
      work_id: workId,
      status: 'in_progress',
      current_level: 1,
      max_level: maxLevel,
      started_at: new Date().toISOString(),
      assigned_by: user.id,
    }));

    const { data, error } = await supabase
      .from('child_work_completion')
      .upsert(assignments, { 
        onConflict: 'child_id,work_id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      assigned: data?.length || 0,
      studentIds: authorizedIds,
    });

  } catch (error) {
    console.error('Error assigning work:', error);
    return NextResponse.json(
      { error: 'Failed to assign work' },
      { status: 500 }
    );
  }
}


