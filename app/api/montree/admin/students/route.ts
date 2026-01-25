// app/api/montree/admin/students/route.ts
// GET all students, POST to create new student

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/montree/admin/students - List all students with classroom info
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    let query = supabase
      .from('children')
      .select('id, name, date_of_birth, photo_url, classroom_id, school_id, display_order')
      .order('display_order', { ascending: true })
      .order('name');

    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error('Fetch students error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich with classroom names
    const classroomIds = [...new Set(students?.map(s => s.classroom_id).filter(Boolean))];
    
    let classroomMap: Record<string, { name: string; icon: string }> = {};
    if (classroomIds.length > 0) {
      const { data: classrooms } = await supabase
        .from('montree_classrooms')
        .select('id, name, icon')
        .in('id', classroomIds);
      
      if (classrooms) {
        classroomMap = classrooms.reduce((acc, c) => {
          acc[c.id] = { name: c.name, icon: c.icon };
          return acc;
        }, {} as Record<string, { name: string; icon: string }>);
      }
    }

    const enrichedStudents = (students || []).map(s => ({
      ...s,
      classroom_name: classroomMap[s.classroom_id]?.name || null,
      classroom_icon: classroomMap[s.classroom_id]?.icon || '📚',
    }));

    return NextResponse.json({ students: enrichedStudents });

  } catch (error) {
    console.error('Students API error:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

// POST /api/montree/admin/students - Create new student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, date_of_birth, classroom_id } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!classroom_id) {
      return NextResponse.json({ error: 'Classroom is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Get school_id from classroom
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroom_id)
      .single();

    // Get max display_order
    const { data: maxOrder } = await supabase
      .from('children')
      .select('display_order')
      .eq('classroom_id', classroom_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.display_order || 0) + 1;

    const { data: student, error } = await supabase
      .from('children')
      .insert({
        name: name.trim(),
        date_of_birth: date_of_birth || null,
        classroom_id,
        school_id: classroom?.school_id || '00000000-0000-0000-0000-000000000001',
        display_order: newOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Create student error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ student }, { status: 201 });

  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
