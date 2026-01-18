// app/api/montree/children/[childId]/route.ts
// Child CRUD by ID: GET, PUT, DELETE
// GET includes assignments summary
// PUT handles classroom transfers by clearing old assignments

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ childId: string }>;
}

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// GET /api/montree/children/[childId] - Get child with assignments summary
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { childId } = await params;
    
    // Validate UUID format
    if (!isValidUUID(childId)) {
      return NextResponse.json({ error: 'Invalid child ID format' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Get child with classroom info
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('*, classroom:montree_classrooms(id, name, school_id)')
      .eq('id', childId)
      .single();
    
    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    
    // Get assignment stats
    const { data: assignments } = await supabase
      .from('montree_child_assignments')
      .select('status')
      .eq('child_id', childId);
    
    const stats = {
      total: assignments?.length || 0,
      not_started: 0,
      presented: 0,
      practicing: 0,
      mastered: 0,
    };
    
    for (const a of assignments || []) {
      if (a.status in stats) {
        stats[a.status as keyof typeof stats]++;
      }
    }
    
    return NextResponse.json({
      child,
      stats,
    });
  } catch (error) {
    console.error('Error fetching child:', error);
    return NextResponse.json(
      { error: 'Failed to fetch child' },
      { status: 500 }
    );
  }
}

// PUT /api/montree/children/[childId] - Update child
// NOTE: Classroom transfer clears all assignments (work IDs are classroom-specific)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { childId } = await params;
    
    // Validate UUID format
    if (!isValidUUID(childId)) {
      return NextResponse.json({ error: 'Invalid child ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Fields that can be updated
    const allowedFields = [
      'name',
      'name_chinese',
      'date_of_birth',
      'photo_url',
      'notes',
      'settings',
      'classroom_id', // Allow moving child to different classroom
    ];
    
    // Build update object
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }
    
    // Recalculate age if date_of_birth updated
    if (updateData.date_of_birth) {
      const birthDate = new Date(updateData.date_of_birth);
      if (isNaN(birthDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date_of_birth format. Use ISO format (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
      const today = new Date();
      const ageYears = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      updateData.age = Math.floor(ageYears);
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Get current child data to check for classroom change
    const { data: currentChild, error: fetchError } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', childId)
      .single();
    
    if (fetchError || !currentChild) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    
    // Handle classroom transfer
    let assignmentsCleared = 0;
    if (updateData.classroom_id && updateData.classroom_id !== currentChild.classroom_id) {
      // Validate new classroom ID format
      if (!isValidUUID(updateData.classroom_id)) {
        return NextResponse.json({ error: 'Invalid classroom ID format' }, { status: 400 });
      }
      
      // Verify target classroom exists
      const { data: classroom, error: classroomError } = await supabase
        .from('montree_classrooms')
        .select('id, name')
        .eq('id', updateData.classroom_id)
        .single();
      
      if (classroomError || !classroom) {
        return NextResponse.json(
          { error: 'Target classroom not found' },
          { status: 404 }
        );
      }
      
      // Clear assignments - work IDs are classroom-specific, so old assignments are invalid
      const { data: deletedAssignments } = await supabase
        .from('montree_child_assignments')
        .delete()
        .eq('child_id', childId)
        .select('id');
      
      assignmentsCleared = deletedAssignments?.length || 0;
    }
    
    // Update child
    const { data: child, error } = await supabase
      .from('montree_children')
      .update(updateData)
      .eq('id', childId)
      .select('*, classroom:montree_classrooms(id, name)')
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Build response
    const response: Record<string, any> = { child };
    
    // Include transfer info if classroom changed
    if (assignmentsCleared > 0) {
      response.transfer = {
        assignmentsCleared,
        message: `Child transferred to new classroom. ${assignmentsCleared} assignment(s) cleared as they referenced works from the previous classroom.`,
      };
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating child:', error);
    return NextResponse.json(
      { error: 'Failed to update child' },
      { status: 500 }
    );
  }
}

// DELETE /api/montree/children/[childId] - Delete child (cascades assignments)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { childId } = await params;
    
    // Validate UUID format
    if (!isValidUUID(childId)) {
      return NextResponse.json({ error: 'Invalid child ID format' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Check if child exists
    const { data: child, error: checkError } = await supabase
      .from('montree_children')
      .select('id, name')
      .eq('id', childId)
      .single();
    
    if (checkError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    
    // Delete child (cascade will handle assignments)
    const { error: deleteError } = await supabase
      .from('montree_children')
      .delete()
      .eq('id', childId);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Child "${child.name}" and all assignments deleted`,
    });
  } catch (error) {
    console.error('Error deleting child:', error);
    return NextResponse.json(
      { error: 'Failed to delete child' },
      { status: 500 }
    );
  }
}
