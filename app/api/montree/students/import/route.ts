// /api/montree/students/import/route.ts
// Bulk import students to montree_children (standalone, no legacy connection)
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// UUID validation
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export async function POST(request: NextRequest) {
  try {
    const { students, classroom_id } = await request.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'No students provided' }, { status: 400 });
    }

    const supabase = await createServerClient();
    
    // If no classroom_id provided, get the first classroom
    let targetClassroomId = classroom_id;
    
    if (!targetClassroomId) {
      const { data: classrooms } = await supabase
        .from('montree_classrooms')
        .select('id')
        .limit(1);
      
      if (!classrooms || classrooms.length === 0) {
        return NextResponse.json({ error: 'No classroom found. Create a classroom first.' }, { status: 404 });
      }
      
      targetClassroomId = classrooms[0].id;
    }
    
    // Validate classroom_id
    if (!isValidUUID(targetClassroomId)) {
      return NextResponse.json({ error: 'Invalid classroom_id format' }, { status: 400 });
    }
    
    // Verify classroom exists
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, name')
      .eq('id', targetClassroomId)
      .single();
    
    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Prepare students for insertion into montree_children
    const studentsToInsert = students.map((s: any) => {
      // Calculate age from dateOfBirth if provided
      let age: number | null = null;
      if (s.dateOfBirth || s.date_of_birth) {
        const dob = s.dateOfBirth || s.date_of_birth;
        const birthDate = new Date(dob);
        if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          const ageYears = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          age = Math.floor(ageYears);
        }
      }
      
      return {
        classroom_id: targetClassroomId,
        name: s.name.trim(),
        date_of_birth: s.dateOfBirth || s.date_of_birth || null,
        age: age,
        notes: s.notes || null,
        settings: { name_chinese: s.name_chinese?.trim() || null },
        created_at: new Date().toISOString(),
      };
    });

    // Insert into montree_children
    const { data: inserted, error: insertError } = await supabase
      .from('montree_children')
      .insert(studentsToInsert)
      .select('id, name');

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: inserted?.length || 0,
      students: inserted,
      classroom: { id: classroom.id, name: classroom.name },
    });

  } catch (error: any) {
    console.error('Import API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
