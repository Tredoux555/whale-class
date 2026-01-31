// /api/montree/admin/students/route.ts
// CRUD for students (children)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Get all students for school (via classroom relationship)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom');

    // First get all classroom IDs for this school
    const { data: schoolClassrooms } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    const classroomIds = (schoolClassrooms || []).map(c => c.id);

    if (classroomIds.length === 0) {
      return NextResponse.json({ students: [], classrooms: [] });
    }

    // Build query - filter by specific classroom or all school classrooms
    let query = supabase
      .from('montree_children')
      .select('id, name, photo_url, age, classroom_id, is_active, created_at')
      .in('classroom_id', classroomIds)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (classroomId && classroomId !== 'all') {
      query = query.eq('classroom_id', classroomId);
    }

    const { data: students, error } = await query;

    if (error) throw error;

    // Add classroom info to each student
    const studentsWithClassroom = (students || []).map(s => {
      const classroom = schoolClassrooms?.find(c => c.id === s.classroom_id);
      return {
        ...s,
        classroom_name: classroom?.name,
        classroom_icon: classroom?.icon,
      };
    });

    return NextResponse.json({ students: studentsWithClassroom, classrooms: schoolClassrooms });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json({ error: 'Failed to get students' }, { status: 500 });
  }
}

// Create new student
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, age, classroom_id, photo_url } = await request.json();

    if (!name || !classroom_id) {
      return NextResponse.json({ error: 'Name and classroom required' }, { status: 400 });
    }

    // Verify classroom belongs to this school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroom_id)
      .eq('school_id', schoolId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Invalid classroom' }, { status: 400 });
    }

    const { data: student, error } = await supabase
      .from('montree_children')
      .insert({
        classroom_id,
        name,
        age: age || null,
        photo_url: photo_url || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}

// Update student
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, name, age, classroom_id, photo_url, is_active } = await request.json();

    // Verify student belongs to this school via classroom
    const { data: existingStudent } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', id)
      .single();

    if (!existingStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify the classroom belongs to this school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', existingStudent.classroom_id)
      .eq('school_id', schoolId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If changing classroom, verify new classroom belongs to school
    if (classroom_id && classroom_id !== existingStudent.classroom_id) {
      const { data: newClassroom } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('id', classroom_id)
        .eq('school_id', schoolId)
        .single();

      if (!newClassroom) {
        return NextResponse.json({ error: 'Invalid classroom' }, { status: 400 });
      }
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = age;
    if (classroom_id !== undefined) updateData.classroom_id = classroom_id;
    if (photo_url !== undefined) updateData.photo_url = photo_url;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: student, error } = await supabase
      .from('montree_children')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

// Delete (soft delete) student
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // Verify student belongs to this school via classroom
    const { data: student } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', id)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', student.classroom_id)
      .eq('school_id', schoolId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabase
      .from('montree_children')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
