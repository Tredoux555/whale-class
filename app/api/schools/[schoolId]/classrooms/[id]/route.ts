// /api/schools/[schoolId]/classrooms/[id]/route.ts
// Get classroom with its students
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
  { params }: { params: Promise<{ schoolId: string; id: string }> }
) {
  const supabase = getSupabase();
  const { schoolId, id: classroomId } = await params;

  // 1. Get school (by UUID or slug)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId);
  
  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, name, slug')
    .eq(isUUID ? 'id' : 'slug', schoolId)
    .single();

  if (schoolError || !school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  // 2. Get students for this school (ordered by name)
  const { data: students, error: studentsError } = await supabase
    .from('children')
    .select('id, name, date_of_birth')
    .eq('school_id', school.id)
    .order('name', { ascending: true });

  if (studentsError) {
    console.error('Students query error:', studentsError);
    return NextResponse.json({ error: studentsError.message }, { status: 500 });
  }

  return NextResponse.json({
    school,
    classroom: { id: classroomId, name: classroomId.charAt(0).toUpperCase() + classroomId.slice(1) },
    students: students || [],
    count: students?.length || 0
  });
}
