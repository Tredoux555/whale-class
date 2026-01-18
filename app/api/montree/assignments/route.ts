// app/api/montree/assignments/route.ts
// Assignment CRUD: GET (list), POST (assign work to child)
// Status flow: not_started → presented → practicing → mastered

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { AssignmentStatus } from '@/lib/montree/types/curriculum';

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const VALID_STATUSES: AssignmentStatus[] = ['not_started', 'presented', 'practicing', 'mastered'];

// GET /api/montree/assignments - List assignments with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const workId = searchParams.get('work_id');
    const status = searchParams.get('status');
    const classroomId = searchParams.get('classroom_id');
    const areaId = searchParams.get('area_id');
    
    // Validate UUID params if provided
    if (childId && !isValidUUID(childId)) {
      return NextResponse.json({ error: 'Invalid child_id format' }, { status: 400 });
    }
    if (workId && !isValidUUID(workId)) {
      return NextResponse.json({ error: 'Invalid work_id format' }, { status: 400 });
    }
    if (classroomId && !isValidUUID(classroomId)) {
      return NextResponse.json({ error: 'Invalid classroom_id format' }, { status: 400 });
    }
    if (areaId && !isValidUUID(areaId)) {
      return NextResponse.json({ error: 'Invalid area_id format' }, { status: 400 });
    }
    
    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status as AssignmentStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('montree_child_assignments')
      .select(`
        *,
        child:montree_children(id, name, classroom_id),
        work:montree_classroom_curriculum_works(id, work_key, name, name_chinese, category_key, area_id)
      `)
      .order('updated_at', { ascending: false });
    
    if (childId) {
      query = query.eq('child_id', childId);
    }
    
    if (workId) {
      query = query.eq('work_id', workId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: assignments, error } = await query;
    
    if (error) {
      console.error('Fetch assignments error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Filter by classroom or area if needed (via child's classroom_id or work's area_id)
    let filtered = assignments || [];
    if (classroomId) {
      filtered = filtered.filter(a => a.child?.classroom_id === classroomId);
    }
    if (areaId) {
      filtered = filtered.filter(a => a.work?.area_id === areaId);
    }
    
    return NextResponse.json({ assignments: filtered });
  } catch (error) {
    console.error('Assignments API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST /api/montree/assignments - Assign work to child
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { child_id, work_id, status, notes } = body;
    
    // Validate required fields
    if (!child_id) {
      return NextResponse.json({ error: 'child_id is required' }, { status: 400 });
    }
    if (!work_id) {
      return NextResponse.json({ error: 'work_id is required' }, { status: 400 });
    }
    
    // Validate UUID formats
    if (!isValidUUID(child_id)) {
      return NextResponse.json({ error: 'Invalid child_id format' }, { status: 400 });
    }
    if (!isValidUUID(work_id)) {
      return NextResponse.json({ error: 'Invalid work_id format' }, { status: 400 });
    }
    
    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }
    
    const initialStatus = status || 'not_started';
    
    const supabase = await createServerClient();
    
    // Verify child exists and get classroom
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id')
      .eq('id', child_id)
      .single();
    
    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    
    if (!child.classroom_id) {
      return NextResponse.json(
        { error: 'Child is not assigned to a classroom' },
        { status: 400 }
      );
    }
    
    // Verify work exists and belongs to child's classroom
    const { data: work, error: workError } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, classroom_id')
      .eq('id', work_id)
      .single();
    
    if (workError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }
    
    // Ensure work belongs to child's classroom
    if (work.classroom_id !== child.classroom_id) {
      return NextResponse.json(
        { error: 'Work does not belong to child\'s classroom' },
        { status: 400 }
      );
    }
    
    // Create assignment with upsert (allow re-assigning)
    const now = new Date().toISOString();
    const assignmentData: Record<string, any> = {
      child_id,
      work_id,
      status: initialStatus,
      current_level: 0,
      assigned_at: now,
      notes: notes || null,
    };
    
    // Set timestamps based on initial status
    if (initialStatus === 'presented') {
      assignmentData.presented_at = now;
    } else if (initialStatus === 'practicing') {
      assignmentData.presented_at = now;
    } else if (initialStatus === 'mastered') {
      assignmentData.presented_at = now;
      assignmentData.mastered_at = now;
    }
    
    const { data: assignment, error: createError } = await supabase
      .from('montree_child_assignments')
      .upsert(assignmentData, {
        onConflict: 'child_id,work_id',
      })
      .select(`
        *,
        child:montree_children(id, name),
        work:montree_classroom_curriculum_works(id, work_key, name)
      `)
      .single();
    
    if (createError) {
      console.error('Create assignment error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('Create assignment API error:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
