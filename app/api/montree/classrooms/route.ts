// app/api/montree/classrooms/route.ts
// API endpoints for classroom management
// POST - Create classroom + auto-seed curriculum from school
// GET - List classrooms (with optional school_id filter)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { seedClassroomCurriculum } from '@/lib/montree/seed';

// GET /api/montree/classrooms - List classrooms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('montree_classrooms')
      .select('*, school:montree_schools(id, name, slug)')
      .order('created_at', { ascending: false });
    
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    
    const { data: classrooms, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ classrooms });
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classrooms' },
      { status: 500 }
    );
  }
}

// POST /api/montree/classrooms - Create classroom + seed curriculum
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_id, name, teacher_id, age_group } = body;
    
    // Validate required fields
    if (!school_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, name' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Verify school exists
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('id')
      .eq('id', school_id)
      .single();
    
    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }
    
    // Create the classroom
    const { data: classroom, error: createError } = await supabase
      .from('montree_classrooms')
      .insert({
        school_id,
        name,
        teacher_id: teacher_id || null,
        age_group: age_group || '3-6',
        is_active: true,
      })
      .select()
      .single();
    
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Seed the curriculum from school
    const seedResult = await seedClassroomCurriculum(classroom.id, school_id);
    
    if (!seedResult.success) {
      console.error('Failed to seed classroom curriculum:', seedResult.error);
    }
    
    return NextResponse.json({
      classroom,
      curriculum: {
        seeded: seedResult.success,
        areas: seedResult.areasCreated,
        works: seedResult.worksCreated,
        error: seedResult.error,
      },
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating classroom:', error);
    return NextResponse.json(
      { error: 'Failed to create classroom' },
      { status: 500 }
    );
  }
}
