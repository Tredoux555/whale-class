// /api/montree/children/[childId]/route.ts
// GET, PUT, DELETE individual child

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET - Get single child details
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { childId } = await context.params;
    const supabase = getSupabase();

    // Check for authentication header
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: child, error } = await supabase
      .from('montree_children')
      .select('*')
      .eq('id', childId)
      .single();

    if (error || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Verify child belongs to this school via classroom
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', child.classroom_id)
      .eq('school_id', schoolId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch photos from montree_media
    const { data: photos, error: photosError } = await supabase
      .from('montree_media')
      .select('id, storage_path, work_id, captured_at, thumbnail_path')
      .eq('child_id', childId)
      .order('captured_at', { ascending: false });

    // Build photo URLs
    const formattedPhotos = (photos || []).map((photo: { id: string; storage_path: string; work_id?: string; captured_at: string; thumbnail_path?: string }) => ({
      id: photo.id,
      storage_path: photo.storage_path,
      work_id: photo.work_id,
      captured_at: photo.captured_at,
      thumbnail_path: photo.thumbnail_path,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/montree-media/${photo.storage_path}`,
      thumbnail_url: photo.thumbnail_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/montree-media/${photo.thumbnail_path}` : null
    }));

    return NextResponse.json({ success: true, child, photos: formattedPhotos });
  } catch (error: unknown) {
    console.error('Get child error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update child
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { childId } = await context.params;
    const supabase = getSupabase();

    // Check for authentication header
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    // Fetch child to verify it exists and get classroom_id
    const { data: child, error: fetchError } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', childId)
      .single();

    if (fetchError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Verify child belongs to this school via classroom
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', child.classroom_id)
      .eq('school_id', schoolId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.age !== undefined) updates.age = Math.round(body.age);
    if (body.photo_url !== undefined) updates.photo_url = body.photo_url;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.enrolled_at !== undefined) updates.enrolled_at = body.enrolled_at;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const { data: updatedChild, error: updateError } = await supabase
      .from('montree_children')
      .update(updates)
      .eq('id', childId)
      .select()
      .single();

    if (updateError) {
      console.error('Update child error:', updateError);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true, child: updatedChild });
  } catch (error: unknown) {
    console.error('Update child error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update child (alias for PUT)
export async function PATCH(request: NextRequest, context: RouteContext) {
  return PUT(request, context);
}

// DELETE - Remove child and all related data
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { childId } = await context.params;
    const supabase = getSupabase();

    // Check for authentication header
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify child exists
    const { data: child, error: findError } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id')
      .eq('id', childId)
      .single();

    if (findError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Verify child belongs to this school via classroom
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', child.classroom_id)
      .eq('school_id', schoolId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete related records first (foreign key constraints)

    // 1. Delete progress records
    await supabase
      .from('montree_child_progress')
      .delete()
      .eq('child_id', childId);

    // 2. Delete work sessions/notes
    await supabase
      .from('montree_work_sessions')
      .delete()
      .eq('child_id', childId);

    // 3. Delete photos from montree_media
    await supabase
      .from('montree_media')
      .delete()
      .eq('child_id', childId);

    // 4. Delete parent links
    await supabase
      .from('montree_parent_children')
      .delete()
      .eq('child_id', childId);

    // 5. Delete weekly reports
    await supabase
      .from('montree_weekly_reports')
      .delete()
      .eq('child_id', childId);

    // 6. Finally delete the child
    const { error: deleteError } = await supabase
      .from('montree_children')
      .delete()
      .eq('id', childId);

    if (deleteError) {
      console.error('Delete child error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete child' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${child.name} and all related data`,
      deleted: {
        childId,
        name: child.name,
      }
    });
  } catch (error: unknown) {
    console.error('Delete child error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
