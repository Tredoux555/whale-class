// app/api/montree/assignments/[id]/route.ts
// Assignment CRUD by ID: GET, PUT (update status), DELETE
// Status flow: not_started → presented → practicing → mastered

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { AssignmentStatus } from '@/lib/montree/types/curriculum';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const VALID_STATUSES: AssignmentStatus[] = ['not_started', 'presented', 'practicing', 'mastered'];

// GET /api/montree/assignments/[id] - Get single assignment with full work details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid assignment ID format' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    const { data: assignment, error } = await supabase
      .from('montree_child_assignments')
      .select(`
        *,
        child:montree_children(id, name, classroom_id),
        work:montree_classroom_curriculum_works(
          id, work_key, name, name_chinese, description,
          category_key, category_name, area_id,
          materials, direct_aims, indirect_aims, prerequisites, levels
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}

// PUT /api/montree/assignments/[id] - Update assignment status/level/notes
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid assignment ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    const { status, current_level, notes } = body;
    
    const supabase = await createServerClient();
    
    // Get existing assignment
    const { data: existing, error: fetchError } = await supabase
      .from('montree_child_assignments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    
    // Build update object
    const updateData: Record<string, any> = {};
    const now = new Date().toISOString();
    
    // Update status and set appropriate timestamps
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      
      updateData.status = status;
      
      // Set timestamps based on status progression
      if (status === 'presented' && !existing.presented_at) {
        updateData.presented_at = now;
      } else if (status === 'mastered') {
        if (!existing.presented_at) {
          updateData.presented_at = now;
        }
        if (!existing.mastered_at) {
          updateData.mastered_at = now;
        }
      }
      
      // Clear mastered_at if moving back from mastered
      if (status !== 'mastered' && existing.status === 'mastered') {
        updateData.mastered_at = null;
      }
    }
    
    // Update level if provided
    if (current_level !== undefined) {
      if (typeof current_level !== 'number' || current_level < 0) {
        return NextResponse.json(
          { error: 'current_level must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.current_level = current_level;
    }
    
    // Update notes if provided
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update. Provide status, current_level, or notes.' },
        { status: 400 }
      );
    }
    
    const { data: assignment, error: updateError } = await supabase
      .from('montree_child_assignments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        child:montree_children(id, name),
        work:montree_classroom_curriculum_works(id, work_key, name)
      `)
      .single();
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    );
  }
}

// DELETE /api/montree/assignments/[id] - Remove assignment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid assignment ID format' }, { status: 400 });
    }
    
    const supabase = await createServerClient();
    
    // Check exists and get details for response
    const { data: assignment, error: checkError } = await supabase
      .from('montree_child_assignments')
      .select('id, child:montree_children(name), work:montree_classroom_curriculum_works(name)')
      .eq('id', id)
      .single();
    
    if (checkError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    
    // Delete
    const { error: deleteError } = await supabase
      .from('montree_child_assignments')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Assignment removed`,
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}

// PATCH /api/montree/assignments/[id] - Same as PUT for compatibility
export const PATCH = PUT;
