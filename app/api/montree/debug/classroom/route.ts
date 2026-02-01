// /api/montree/debug/classroom/route.ts
// Debug endpoint to check classroom data
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    if (!classroomId) {
      // Get all classrooms
      const { data: classrooms, error } = await supabase
        .from('montree_classrooms')
        .select('id, name, school_id, is_active')
        .limit(20);

      return NextResponse.json({
        message: 'All classrooms',
        classrooms,
        error: error?.message
      });
    }

    // Get specific classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('*')
      .eq('id', classroomId)
      .single();

    // Get school info if classroom has school_id
    let school = null;
    if (classroom?.school_id) {
      const { data: schoolData } = await supabase
        .from('montree_schools')
        .select('id, name')
        .eq('id', classroom.school_id)
        .single();
      school = schoolData;
    }

    // Get children in this classroom
    const { data: children, error: childrenError } = await supabase
      .from('montree_children')
      .select('id, name, school_id, classroom_id')
      .eq('classroom_id', classroomId);

    return NextResponse.json({
      classroom,
      classroomError: classroomError?.message,
      school,
      children,
      childrenError: childrenError?.message,
      diagnosis: {
        hasSchoolId: !!classroom?.school_id,
        schoolExists: !!school,
        childCount: children?.length || 0,
      }
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
