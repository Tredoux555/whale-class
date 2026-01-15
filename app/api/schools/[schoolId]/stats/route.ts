// app/api/schools/[schoolId]/stats/route.ts
// Get school statistics (classrooms, teachers, students)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const supabase = getSupabase();
    
    // Count classrooms
    const { count: classroomCount } = await supabase
      .from('classrooms')
      .select('*', { count: 'exact', head: true });
    
    // Count teachers (users with role 'teacher')
    const { count: teacherCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teacher');
    
    // Count students (children)
    const { count: studentCount } = await supabase
      .from('children')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      classrooms: classroomCount || 0,
      teachers: teacherCount || 0,
      students: studentCount || 0,
      schoolId: params.schoolId,
    });
  } catch (error: any) {
    console.error('School stats error:', error);
    // Return zeros on error
    return NextResponse.json({
      classrooms: 0,
      teachers: 0,
      students: 0,
      error: error.message,
    });
  }
}
