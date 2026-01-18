// app/api/montree/children/route.ts
// Children CRUD: GET (list), POST (create)
// Uses new schema with classroom_id integration

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/montree/children - List children (with optional classroom_id filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    
    // Validate classroom_id if provided
    if (classroomId && !isValidUUID(classroomId)) {
      return NextResponse.json({ error: 'Invalid classroom_id format' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('montree_children')
      .select('*, classroom:montree_classrooms(id, name, school_id)')
      .order('name');
    
    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }
    
    const { data: children, error } = await query;
    
    if (error) {
      console.error('Fetch children error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ children: children || [] });
  } catch (error) {
    console.error('Children API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch children' },
      { status: 500 }
    );
  }
}

// POST /api/montree/children - Add new child to classroom
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classroom_id, name, name_chinese, date_of_birth, photo_url, notes } = body;
    
    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    if (!classroom_id) {
      return NextResponse.json(
        { error: 'classroom_id is required' },
        { status: 400 }
      );
    }
    
    // Validate classroom_id format
    if (!isValidUUID(classroom_id)) {
      return NextResponse.json(
        { error: 'Invalid classroom_id format' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Verify classroom exists
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, name')
      .eq('id', classroom_id)
      .single();
    
    if (classroomError || !classroom) {
      return NextResponse.json(
        { error: 'Classroom not found' },
        { status: 404 }
      );
    }
    
    // Calculate age from date_of_birth if provided
    let age: number | null = null;
    if (date_of_birth) {
      const birthDate = new Date(date_of_birth);
      if (isNaN(birthDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date_of_birth format. Use ISO format (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
      const today = new Date();
      const ageYears = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      age = Math.floor(ageYears);
    }
    
    // Create child
    // Note: name_chinese stored in settings JSON since column may not exist
    const { data: child, error: createError } = await supabase
      .from('montree_children')
      .insert({
        classroom_id,
        name: name.trim(),
        date_of_birth: date_of_birth || null,
        age,
        photo_url: photo_url || null,
        notes: notes || null,
        settings: { name_chinese: name_chinese?.trim() || null },
        created_at: new Date().toISOString(),
      })
      .select('*, classroom:montree_classrooms(id, name)')
      .single();
    
    if (createError) {
      console.error('Create child error:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ child }, { status: 201 });
  } catch (error) {
    console.error('Create child API error:', error);
    return NextResponse.json(
      { error: 'Failed to create child' },
      { status: 500 }
    );
  }
}
