// /api/montree/media/route.ts
// Media CRUD operations: list, update, delete
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

// GET - List media with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);

    const schoolId = searchParams.get('school_id');
    const classroomId = searchParams.get('classroom_id');
    const childId = searchParams.get('child_id');
    const untaggedOnly = searchParams.get('untagged_only') === 'true';
    const area = searchParams.get('area');  // New: area filter
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If childId is specified, check BOTH direct photos AND group photos via junction table
    if (childId) {
      const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      // PARALLEL: Fetch child classroom, direct media, and group links all at once
      const [
        { data: childData, error: childError },
        { data: directMedia, error: mediaError },
        { data: groupLinks, error: linkError },
      ] = await Promise.all([
        supabase.from('montree_children').select('classroom_id').eq('id', childId).maybeSingle(),
        supabase.from('montree_media').select('id, storage_path, thumbnail_path, media_type, caption, captured_at, child_id, work_id, parent_visible, school_id, classroom_id, created_at, updated_at').eq('child_id', childId).order('captured_at', { ascending: false }),
        supabase.from('montree_media_children').select('media_id').eq('child_id', childId),
      ]);

      if (childError || !childData) {
        console.error('Child lookup error:', childError?.message);
        return NextResponse.json({ error: 'Child not found' }, { status: 404 });
      }
      if (mediaError || linkError) {
        console.error('Media fetch error:', mediaError?.message || linkError?.message);
        return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
      }

      // Get curriculum works to map work_id to work_name and area
      const workIdToInfo = new Map<string, { name: string; area: string }>();
      if (childData?.classroom_id) {
        const { data: curriculumWorks } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id, name, area_id, area:montree_classroom_curriculum_areas!area_id(area_key)')
          .eq('classroom_id', childData.classroom_id);

        for (const w of curriculumWorks || []) {
          const areaKey = (w as any).area?.area_key || 'other';
          workIdToInfo.set(w.id, { name: w.name, area: areaKey });
        }
      }

      const groupMediaIds = (groupLinks || []).map((link: { media_id: string }) => link.media_id);

      let groupMedia: Array<Record<string, unknown>> = [];
      if (groupMediaIds.length > 0) {
        const { data: groupMediaData } = await supabase
          .from('montree_media')
          .select('*')
          .in('id', groupMediaIds)
          .order('captured_at', { ascending: false });

        groupMedia = groupMediaData || [];
      }

      // Combine and deduplicate by ID
      const mediaMap = new Map();
      for (const item of [...(directMedia || []), ...groupMedia]) {
        if (!mediaMap.has(item.id)) {
          mediaMap.set(item.id, item);
        }
      }

      // Sort by captured_at descending
      const allMedia = Array.from(mediaMap.values()).sort((a, b) =>
        new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
      );

      // Apply pagination
      const paginatedMedia = allMedia.slice(offset, offset + limit);

      // Add area and work name info from curriculum lookup
      const mediaWithArea = paginatedMedia.map((item: Record<string, unknown>) => {
        const workInfo = item.work_id ? workIdToInfo.get(item.work_id) : null;
        return {
          ...item,
          area: workInfo?.area || null,
          work_name: workInfo?.name || item.caption || null,  // Fallback to caption if no work_id
        };
      });

      return NextResponse.json({
        success: true,
        media: mediaWithArea,
        total: allMedia.length,
        limit,
        offset
      });
    }

    // Standard query for non-child-specific requests (simple query, no FK join)
    let query = supabase
      .from('montree_media')
      .select('*', { count: 'exact' })
      .order('captured_at', { ascending: false });

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }

    if (untaggedOnly) {
      query = query.is('child_id', null);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: media, error, count } = await query;

    if (error) {
      console.error('Media list error:', error.message, error.code);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // Get curriculum works to map work_id to work_name and area
    const workIdToInfo = new Map<string, { name: string; area: string }>();
    if (classroomId) {
      const { data: curriculumWorks } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, area_id, area:montree_classroom_curriculum_areas!area_id(area_key)')
        .eq('classroom_id', classroomId);

      for (const w of curriculumWorks || []) {
        const areaKey = (w as any).area?.area_key || 'other';
        workIdToInfo.set(w.id, { name: w.name, area: areaKey });
      }
    }

    // Add area and work name info to each media item
    let mediaWithArea = (media || []).map((item: Record<string, unknown>) => {
      const workInfo = item.work_id ? workIdToInfo.get(item.work_id) : null;
      return {
        ...item,
        area: workInfo?.area || null,
        work_name: workInfo?.name || item.caption || null,
      };
    });

    // Filter by area if specified (do it in JS since we removed the FK join)
    if (area && area !== 'all') {
      mediaWithArea = mediaWithArea.filter((item: Record<string, unknown>) => item.area === area);
    }

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
      error: 'Server error'
    }, { status: 500 });
  }
}

// PATCH - Update media metadata (caption, child_id, work_id, tags)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();

    const { id, caption, child_id, work_id, tags, parent_visible } = body;

    if (!id) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (caption !== undefined) updateData.caption = caption;
    if (child_id !== undefined) updateData.child_id = child_id;
    if (work_id !== undefined) updateData.work_id = work_id;
    if (tags !== undefined) updateData.tags = tags;
    if (typeof parent_visible === 'boolean') updateData.parent_visible = parent_visible;

    // Scope to authenticated user's school to prevent cross-school updates
    const schoolId = typeof auth === 'object' && 'schoolId' in auth ? auth.schoolId : null;
    let updateQuery = supabase
      .from('montree_media')
      .update(updateData)
      .eq('id', id);
    if (schoolId) {
      updateQuery = updateQuery.eq('school_id', schoolId);
    }
    const { data: media, error } = await updateQuery
      .select()
      .maybeSingle();

    if (error) {
      console.error('Media update error:', error.message, error.code);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, media });

  } catch (error) {
    console.error('Media update error:', error);
    return NextResponse.json({
      error: 'Server error'
    }, { status: 500 });
  }
}

// DELETE - Delete media (file and record) - supports single or bulk delete
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

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
    // Scope to auth school_id to prevent cross-school deletion
    const schoolId = typeof auth === 'object' && 'schoolId' in auth ? auth.schoolId : null;
    let mediaQuery = supabase
      .from('montree_media')
      .select('id, storage_path, thumbnail_path')
      .in('id', idsToDelete);
    if (schoolId) {
      mediaQuery = mediaQuery.eq('school_id', schoolId);
    }
    const { data: mediaRecords, error: fetchError } = await mediaQuery;

    if (fetchError) {
      console.error('Media fetch error:', fetchError.message, fetchError.code);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
      console.error('Media delete error:', deleteError.message, deleteError.code);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: idsToDelete.length
    });

  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json({
      error: 'Server error'
    }, { status: 500 });
  }
}
