// /api/home/children/[childId]/route.ts
// GET, PUT, DELETE individual child from family

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

interface RouteContext {
  params: Promise<{ childId: string }>;
}

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

// GET - Get single child details with photos
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { childId } = await context.params;
    const familyId = request.nextUrl.searchParams.get('family_id');

    if (!familyId) {
      return errorResponse('family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Fetch child and verify it belongs to this family
    const { data: child, error } = await supabase
      .from('home_children')
      .select('*')
      .eq('id', childId)
      .eq('family_id', familyId)
      .single();

    if (error || !child) {
      return errorResponse('Child not found', { message: error?.message }, 404);
    }

    // Fetch photos from home_media
    const { data: photos, error: photosError } = await supabase
      .from('home_media')
      .select('id, file_path, work_name, area, created_at, thumbnail_path, caption')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    // Build photo URLs
    const formattedPhotos = (photos || []).map((photo: Record<string, unknown>) => ({
      ...photo,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/home-media/${photo.file_path}`,
      thumbnail_url: photo.thumbnail_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/home-media/${photo.thumbnail_path}` : null
    }));

    return NextResponse.json({ success: true, child, photos: formattedPhotos });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Get child error:', message);
    return errorResponse('Server error', { message });
  }
}

// PUT - Update child
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { childId } = await context.params;
    const body = await request.json();
    const { family_id, name, age } = body;

    if (!family_id) {
      return errorResponse('family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Fetch child to verify it exists and belongs to family
    const { data: child, error: fetchError } = await supabase
      .from('home_children')
      .select('id, family_id')
      .eq('id', childId)
      .eq('family_id', family_id)
      .single();

    if (fetchError || !child) {
      return errorResponse('Child not found', { message: fetchError?.message }, 404);
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (age !== undefined) {
      const childAge = Math.round(age);
      if (childAge < 0 || childAge > 12) {
        return errorResponse('Age must be between 0 and 12', undefined, 400);
      }
      updates.age = childAge;

      // Update birth_date from age
      const today = new Date();
      const birthDate = new Date(today.getFullYear() - childAge, today.getMonth(), today.getDate());
      updates.birth_date = birthDate.toISOString().split('T')[0];
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('No updates provided', undefined, 400);
    }

    updates.updated_at = new Date().toISOString();

    const { data: updatedChild, error: updateError } = await supabase
      .from('home_children')
      .update(updates)
      .eq('id', childId)
      .select()
      .single();

    if (updateError) {
      console.error('Update child error:', updateError.message);
      return errorResponse('Failed to update child', { message: updateError.message });
    }

    return NextResponse.json({ success: true, child: updatedChild });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Update child error:', message);
    return errorResponse('Server error', { message });
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
    const familyId = request.nextUrl.searchParams.get('family_id');

    if (!familyId) {
      return errorResponse('family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Verify child exists and belongs to family
    const { data: child, error: findError } = await supabase
      .from('home_children')
      .select('id, name, family_id')
      .eq('id', childId)
      .eq('family_id', familyId)
      .single();

    if (findError || !child) {
      return errorResponse('Child not found', { message: findError?.message }, 404);
    }

    // Delete related records first
    // 1. Delete progress records
    await supabase
      .from('home_progress')
      .delete()
      .eq('child_id', childId);

    // 2. Delete work sessions
    await supabase
      .from('home_sessions')
      .delete()
      .eq('child_id', childId);

    // 3. Delete media records
    const { data: mediaRecords } = await supabase
      .from('home_media')
      .select('id, file_path, thumbnail_path')
      .eq('child_id', childId);

    if (mediaRecords && mediaRecords.length > 0) {
      const pathsToDelete = mediaRecords.flatMap(m =>
        [m.file_path, m.thumbnail_path].filter(Boolean)
      );
      if (pathsToDelete.length > 0) {
        await supabase.storage.from('home-media').remove(pathsToDelete);
      }
    }

    await supabase
      .from('home_media')
      .delete()
      .eq('child_id', childId);

    // 4. Delete observations
    await supabase
      .from('home_observations')
      .delete()
      .eq('child_id', childId);

    // 5. Delete weekly reports
    await supabase
      .from('home_weekly_reports')
      .delete()
      .eq('child_id', childId);

    // 6. Finally delete the child
    const { error: deleteError } = await supabase
      .from('home_children')
      .delete()
      .eq('id', childId);

    if (deleteError) {
      console.error('Delete child error:', deleteError.message);
      return errorResponse('Failed to delete child', { message: deleteError.message });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${child.name} and all related data`,
      deleted: {
        childId,
        name: child.name,
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Delete child error:', message);
    return errorResponse('Server error', { message });
  }
}
