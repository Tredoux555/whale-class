// /api/schools/[schoolId]/route.ts
// Get school details with its classrooms
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
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const supabase = getSupabase();
  const { schoolId } = await params;

  // schoolId can be UUID or slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schoolId);

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, name, slug')
    .eq(isUUID ? 'id' : 'slug', schoolId)
    .single();

  if (schoolError || !school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  // Get classrooms for this school
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, name')
    .eq('school_id', school.id);

  // Count students per classroom (they're in children table with school_id)
  const { data: children } = await supabase
    .from('children')
    .select('id')
    .eq('school_id', school.id);

  // For now, assume one classroom per school (Whale Class)
  // In future, children table should have classroom_id
  const classroomsWithCount = (classrooms || []).map(c => ({
    ...c,
    student_count: children?.length || 0
  }));

  // If no classrooms table entry, create virtual one from children
  if (classroomsWithCount.length === 0 && children && children.length > 0) {
    classroomsWithCount.push({
      id: 'whale',
      name: 'Whale',
      student_count: children.length
    });
  }

  return NextResponse.json({
    school,
    classrooms: classroomsWithCount
  });
}
