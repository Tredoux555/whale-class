// app/api/montree/classrooms/[id]/route.ts
// Classroom CRUD by ID: GET, PUT, DELETE
// GET includes curriculum summary and child count

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { MontreeClassroom } from '@/lib/montree/types/curriculum';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/montree/classrooms/[id] - Get classroom with curriculum summary
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid classroom ID format' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Get classroom with school info
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('*, school:montree_schools(id, name, slug)')
      .eq('id', id)
      .single();
    
    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }
    
    // Get curriculum areas with work counts in a single optimized query
    const { data: areas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key, name, name_chinese, color, icon, sequence')
      .eq('classroom_id', id)
      .order('sequence');
    
    // Get all work counts in one query, grouped by area
    const { data: workCounts } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('area_id')
      .eq('classroom_id', id);
    
    // Count works per area
    const workCountMap: Record<string, number> = {};
    for (const work of workCounts || []) {
      workCountMap[work.area_id] = (workCountMap[work.area_id] || 0) + 1;
    }
    
    // Build area stats with work counts
    const areaStats = (areas || []).map(area => ({
      ...area,
      workCount: workCountMap[area.id] || 0,
    }));
    
    // Get children count
    const { count: childCount } = await supabase
      .from('montree_children')
      .select('*', { count: 'exact', head: true })
      .eq('classroom_id', id);
    
    // Calculate total works
    const totalWorks = Object.values(workCountMap).reduce((sum, count) => sum + count, 0);
    
    return NextResponse.json({
      classroom,
      curriculum: {
        areas: areaStats,
        totalWorks,
      },
      stats: {
        children: childCount || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching classroom:', error);
    return NextResponse.json(
      { error: 'Failed to fetch classroom' },
      { status: 500 }
    );
  }
}

// PUT /api/montree/classrooms/[id] - Update classroom settings
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid classroom ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Fields that can be updated
    const allowedFields = [
      'name',
      'teacher_id',
      'age_group',
      'settings',
      'is_active',
    ];
    
    // Build update object with only allowed fields
    const updateData: Partial<MontreeClassroom> = {};
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
    
    const { data: classroom, error } = await supabase
      .from('montree_classrooms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ classroom });
  } catch (error) {
    console.error('Error updating classroom:', error);
    return NextResponse.json(
      { error: 'Failed to update classroom' },
      { status: 500 }
    );
  }
}

// DELETE /api/montree/classrooms/[id] - Delete classroom (cascades to curriculum, children unlinked)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid classroom ID format' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Check if classroom exists
    const { data: classroom, error: checkError } = await supabase
      .from('montree_classrooms')
      .select('id, name')
      .eq('id', id)
      .single();
    
    if (checkError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }
    
    // Delete classroom (cascade will handle curriculum, children's classroom_id set to NULL)
    const { error: deleteError } = await supabase
      .from('montree_classrooms')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Classroom "${classroom.name}" and all related curriculum data deleted`,
    });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    return NextResponse.json(
      { error: 'Failed to delete classroom' },
      { status: 500 }
    );
  }
}
