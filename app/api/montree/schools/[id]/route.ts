// app/api/montree/schools/[id]/route.ts
// School CRUD by ID: GET, PUT, DELETE
// Cascade delete removes all classrooms, curriculum, children, and assignments

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { MontreeSchool } from '@/lib/montree/types/curriculum';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/montree/schools/[id] - Get single school with stats
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid school ID format' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Get school
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('*')
      .eq('id', id)
      .single();
    
    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    
    // Get classroom count
    const { count: classroomCount } = await supabase
      .from('montree_classrooms')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', id);
    
    // Get curriculum stats
    const { count: areaCount } = await supabase
      .from('montree_school_curriculum_areas')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', id);
    
    const { count: workCount } = await supabase
      .from('montree_school_curriculum_works')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', id);
    
    // Get total children across all classrooms
    const { data: classroomIds } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('school_id', id);
    
    let childCount = 0;
    if (classroomIds && classroomIds.length > 0) {
      const ids = classroomIds.map(c => c.id);
      const { count } = await supabase
        .from('montree_children')
        .select('*', { count: 'exact', head: true })
        .in('classroom_id', ids);
      childCount = count || 0;
    }
    
    return NextResponse.json({
      school,
      stats: {
        classrooms: classroomCount || 0,
        areas: areaCount || 0,
        works: workCount || 0,
        children: childCount,
      },
    });
  } catch (error) {
    console.error('Error fetching school:', error);
    return NextResponse.json(
      { error: 'Failed to fetch school' },
      { status: 500 }
    );
  }
}

// PUT /api/montree/schools/[id] - Update school settings
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid school ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Fields that can be updated
    const allowedFields = [
      'name',
      'owner_email',
      'owner_name',
      'subscription_status',
      'plan_type',
      'settings',
    ];
    
    // Build update object with only allowed fields
    const updateData: Partial<MontreeSchool> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        (updateData as any)[field] = body[field];
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    const { data: school, error } = await supabase
      .from('montree_schools')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'School not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ school });
  } catch (error) {
    console.error('Error updating school:', error);
    return NextResponse.json(
      { error: 'Failed to update school' },
      { status: 500 }
    );
  }
}

// DELETE /api/montree/schools/[id] - Delete school (cascades to everything)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid school ID format' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Check if school exists
    const { data: school, error: checkError } = await supabase
      .from('montree_schools')
      .select('id, name')
      .eq('id', id)
      .single();
    
    if (checkError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    
    // Delete school (cascade will handle classrooms, curriculum, children, assignments)
    const { error: deleteError } = await supabase
      .from('montree_schools')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `School "${school.name}" and all related data deleted`,
    });
  } catch (error) {
    console.error('Error deleting school:', error);
    return NextResponse.json(
      { error: 'Failed to delete school' },
      { status: 500 }
    );
  }
}
