// /api/montree/students/import/route.ts
// Bulk import students to database
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const SCHOOL_SLUG = 'beijing-international';

export async function POST(request: NextRequest) {
  const supabase = getSupabase();

  try {
    const { students } = await request.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No students provided' }, { status: 400 });
    }

    // 1. Get school by slug
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .eq('slug', SCHOOL_SLUG)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // 2. Get current max display_order
    const { data: existingStudents } = await supabase
      .from('children')
      .select('id')
      .eq('school_id', school.id);

    const startOrder = (existingStudents?.length || 0) + 1;

    // 3. Prepare students for insertion
    const studentsToInsert = students.map((s: any, index: number) => ({
      name: s.name.trim(),
      school_id: school.id,
      date_of_birth: s.dateOfBirth || null,
      display_order: startOrder + index,
      active_status: true,
      enrollment_date: new Date().toISOString().split('T')[0],
    }));

    // 4. Insert students
    const { data: inserted, error: insertError } = await supabase
      .from('children')
      .insert(studentsToInsert)
      .select('id, name, display_order');

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: inserted?.length || 0,
      students: inserted,
    });

  } catch (error: any) {
    console.error('Import API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
