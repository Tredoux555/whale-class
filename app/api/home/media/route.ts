// /api/home/media/route.ts
// Media CRUD operations: list, update, delete

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

// GET - List media with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const familyId = searchParams.get('family_id');
    const childId = searchParams.get('child_id');
    const area = searchParams.get('area');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!familyId) {
      return errorResponse('family_id required', undefined, 400);
    }

    // If childId is specified, get child's media
    if (childId) {
      const { data: directMedia, error: mediaError } = await supabase
        .from('home_media')
        .select('*')
        .eq('child_id', childId)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (mediaError) {
        console.error('Media list error:', mediaError.message);
        return errorResponse('Failed to fetch media', { message: mediaError.message });
      }

      // Apply pagination
      const paginatedMedia = (directMedia || []).slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        media: paginatedMedia,
        total: (directMedia || []).length,
        limit,
        offset
      });
    }

    // Standard query for family-wide requests
    let query = supabase
      .from('home_media')
      .select('*', { count: 'exact' })
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    query = query.range(offset, offset + limit - 1);

    const { data: media, error, count } = await query;

    if (error) {
      console.error('Media list error:', error.message);
      return errorResponse('Failed to fetch media', { message: error.message });
    }

    // Filter by area if specified
    let filteredMedia = media || [];
    if (area && area !== 'all') {
      filteredMedia = filteredMedia.filter(item => item.area === area);
    }

    return NextResponse.json({
      success: true,
      media: filteredMedia,
      total: count || 0,
      limit,
      offset
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Media list error:', message);
    return errorResponse('Server error', { message });
  }
}

// PATCH - Update media metadata (caption, child_id, work_name, area, tags)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();

    const { id, family_id, caption, child_id, work_name, area, tags } = body;

    if (!id || !family_id) {
      return errorResponse('id and family_id required', undefined, 400);
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (caption !== undefined) updateData.caption = caption;
    if (child_id !== undefined) updateData.child_id = child_id;
    if (work_name !== undefined) updateData.work_name = work_name;
    if (area !== undefined) updateData.area = area;
    if (tags !== undefined) updateData.tags = tags;

    const { data: media, error } = await supabase
      .from('home_media')
      .update(updateData)
      .eq('id', id)
      .eq('family_id', family_id)
      .select()
      .single();

    if (error) {
      console.error('Media update error:', error.message);
      return errorResponse('Failed to update media', { message: error.message });
    }

    return NextResponse.json({ success: true, media });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Media update error:', message);
    return errorResponse('Server error', { message });
  }
}

// DELETE - Delete media (file and record) - supports single or bulk delete
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const familyId = searchParams.get('family_id');
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (!familyId) {
      return errorResponse('family_id required', undefined, 400);
    }

    // Determine which IDs to delete
    let idsToDelete: string[] = [];

    if (idsParam) {
      // Bulk delete - parse comma-separated IDs
      idsToDelete = idsParam.split(',').filter(id => id.trim());
    } else if (id) {
      // Single delete
      idsToDelete = [id];
    } else {
      return errorResponse('Media ID(s) required', undefined, 400);
    }

    if (idsToDelete.length === 0) {
      return errorResponse('No valid IDs provided', undefined, 400);
    }

    // Fetch all media records to get storage paths
    const { data: mediaRecords, error: fetchError } = await supabase
      .from('home_media')
      .select('id, file_path, thumbnail_path')
      .eq('family_id', familyId)
      .in('id', idsToDelete);

    if (fetchError) {
      console.error('Media fetch error:', fetchError.message);
      return errorResponse('Failed to fetch media', { message: fetchError.message });
    }

    if (!mediaRecords || mediaRecords.length === 0) {
      return errorResponse('Media not found', undefined, 404);
    }

    // Collect all paths to delete from storage
    const pathsToDelete: string[] = [];
    mediaRecords.forEach(media => {
      pathsToDelete.push(media.file_path);
      if (media.thumbnail_path) {
        pathsToDelete.push(media.thumbnail_path);
      }
    });

    // Delete from storage
    if (pathsToDelete.length > 0) {
      await supabase.storage.from('home-media').remove(pathsToDelete);
    }

    // Delete database records
    const { error: deleteError } = await supabase
      .from('home_media')
      .delete()
      .eq('family_id', familyId)
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Media delete error:', deleteError.message);
      return errorResponse('Failed to delete media', { message: deleteError.message });
    }

    return NextResponse.json({
      success: true,
      deletedCount: mediaRecords.length
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Media delete error:', message);
    return errorResponse('Server error', { message });
  }
}
