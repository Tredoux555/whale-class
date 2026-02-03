// /api/montree/media/route.ts
// Media CRUD operations: list, update, delete
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET - List media with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const schoolId = searchParams.get('school_id');
    const classroomId = searchParams.get('classroom_id');
    const childId = searchParams.get('child_id');
    const untaggedOnly = searchParams.get('untagged_only') === 'true';
    const area = searchParams.get('area');  // New: area filter
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Base query with work area info via join
    let query = supabase
      .from('montree_media')
      .select(`
        *,
        work:work_id (
          work_id,
          name,
          area
        )
      `, { count: 'exact' })
      .order('captured_at', { ascending: false });

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }

    if (childId) {
      query = query.eq('child_id', childId);
    }

    if (untaggedOnly) {
      query = query.is('child_id', null);
    }

    // New: Filter by area (requires work_id to be set)
    if (area && area !== 'all') {
      query = query.eq('work.area', area);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: media, error, count } = await query;

    if (error) {
      console.error('Media list error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add area and work name info to each media item for frontend use
    const mediaWithArea = (media || []).map((item: any) => ({
      ...item,
      area: item.work?.area || null,
      work_name: item.work?.name || null,
    }));

    return NextResponse.json({
      success: true,
      media: mediaWithArea,
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Media list error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 });
  }
}

// PATCH - Update media metadata (caption, child_id, work_id, tags)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();

    const { id, caption, child_id, work_id, tags } = body;

    if (!id) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (caption !== undefined) updateData.caption = caption;
    if (child_id !== undefined) updateData.child_id = child_id;
    if (work_id !== undefined) updateData.work_id = work_id;
    if (tags !== undefined) updateData.tags = tags;

    const { data: media, error } = await supabase
      .from('montree_media')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Media update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, media });

  } catch (error) {
    console.error('Media update error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 });
  }
}

// DELETE - Delete media (file and record) - supports single or bulk delete
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    // Determine which IDs to delete
    let idsToDelete: string[] = [];

    if (idsParam) {
      // Bulk delete - parse comma-separated IDs
      idsToDelete = idsParam.split(',').filter(id => id.trim());
    } else if (id) {
      // Single delete
      idsToDelete = [id];
    } else {
      return NextResponse.json({ error: 'Media ID(s) required' }, { status: 400 });
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
    }

    // Fetch all media records to get storage paths
    const { data: mediaRecords, error: fetchError } = await supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path')
      .in('id', idsToDelete);

    if (fetchError) {
      console.error('Media fetch error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!mediaRecords || mediaRecords.length === 0) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Collect all paths to delete from storage
    const pathsToDelete: string[] = [];
    mediaRecords.forEach(media => {
      pathsToDelete.push(media.storage_path);
      if (media.thumbnail_path) {
        pathsToDelete.push(media.thumbnail_path);
      }
    });

    // Delete from storage
    if (pathsToDelete.length > 0) {
      await supabase.storage.from('montree-media').remove(pathsToDelete);
    }

    // Delete child links for all media
    await supabase.from('montree_media_children').delete().in('media_id', idsToDelete);

    // Delete database records
    const { error: deleteError } = await supabase
      .from('montree_media')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Media delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: idsToDelete.length
    });

  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Server error'
    }, { status: 500 });
  }
}
