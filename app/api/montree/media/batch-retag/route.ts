// app/api/montree/media/batch-retag/route.ts
// Batch re-tag photos: change work_id for multiple media records at once
// Used for class-wide reclassification (e.g., "Painting" → "Multicultural Day" special event)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { media_ids, new_work_id, source_work_name, source_area, classroom_id } = body;

    // Validate inputs
    if (!new_work_id) {
      return NextResponse.json({ error: 'new_work_id required' }, { status: 400 });
    }

    const schoolId = typeof auth === 'object' && 'schoolId' in auth ? auth.schoolId : null;

    // SECURITY: school_id is MANDATORY — never allow cross-school access
    if (!schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate new_work_id exists in this school's curriculum
    const { data: targetWork } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, classroom_id')
      .eq('id', new_work_id)
      .maybeSingle();

    if (!targetWork) {
      return NextResponse.json({ error: 'Target work not found' }, { status: 404 });
    }

    // Verify target work's classroom belongs to this school
    const { data: targetClassroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', targetWork.classroom_id)
      .eq('school_id', schoolId)
      .maybeSingle();

    if (!targetClassroom) {
      return NextResponse.json({ error: 'Target work not in your school' }, { status: 403 });
    }

    // Mode 1: Explicit media IDs
    if (media_ids && Array.isArray(media_ids) && media_ids.length > 0) {
      if (media_ids.length > 200) {
        return NextResponse.json({ error: 'Maximum 200 photos per batch' }, { status: 400 });
      }

      // Always scope to authenticated school — prevents cross-school access
      const { data, error } = await supabase
        .from('montree_media')
        .update({ work_id: new_work_id, updated_at: new Date().toISOString() })
        .in('id', media_ids)
        .eq('school_id', schoolId)
        .select('id');

      if (error) {
        console.error('Batch retag error:', error.message);
        return NextResponse.json({ error: 'Failed to update photos' }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: data?.length || 0 });
    }

    // Mode 2: Filter by source work name + area (class-wide rematch)
    if (source_work_name && classroom_id) {
      // Escape SQL ILIKE wildcards to prevent wildcard injection (% and _ are special)
      const escapedWorkName = source_work_name.replace(/[%_\\]/g, '\\$&');
      // SECURITY: Verify classroom belongs to teacher's school
      const { data: classroomCheck } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('id', classroom_id)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (!classroomCheck) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 403 });
      }

      // Find all children in this classroom
      const { data: children } = await supabase
        .from('montree_children')
        .select('id')
        .eq('classroom_id', classroom_id);

      if (!children || children.length === 0) {
        return NextResponse.json({ success: true, updated: 0, message: 'No children in classroom' });
      }

      const childIds = children.map(c => c.id);

      // Find the source work ID(s) matching the name
      let workQuery = supabase
        .from('montree_classroom_curriculum_works')
        .select('id')
        .eq('classroom_id', classroom_id)
        .ilike('name', escapedWorkName);

      if (source_area) {
        // Join through area to filter by area_key
        const { data: areaData } = await supabase
          .from('montree_classroom_curriculum_areas')
          .select('id')
          .eq('classroom_id', classroom_id)
          .eq('area_key', source_area)
          .maybeSingle();

        if (areaData) {
          workQuery = workQuery.eq('area_id', areaData.id);
        }
      }

      const { data: sourceWorks } = await workQuery;
      const sourceWorkIds = (sourceWorks || []).map(w => w.id);

      // Find all media for these children that match the source work
      let mediaQuery = supabase
        .from('montree_media')
        .select('id')
        .in('child_id', childIds)
        .eq('school_id', schoolId);

      if (sourceWorkIds.length > 0) {
        // Match by work_id in curriculum
        mediaQuery = mediaQuery.in('work_id', sourceWorkIds);
      } else {
        // Fallback: match by work_name text in media directly
        // (for photos tagged by Smart Capture with a name but no work_id link)
        mediaQuery = mediaQuery.ilike('work_name', escapedWorkName);
      }

      const { data: matchingMedia } = await mediaQuery;

      if (!matchingMedia || matchingMedia.length === 0) {
        return NextResponse.json({ success: true, updated: 0, message: 'No matching photos found' });
      }

      const mediaIdsToUpdate = matchingMedia.map(m => m.id);

      const { data: updated, error: updateError } = await supabase
        .from('montree_media')
        .update({ work_id: new_work_id, updated_at: new Date().toISOString() })
        .in('id', mediaIdsToUpdate)
        .select('id');

      if (updateError) {
        console.error('Batch retag by name error:', updateError.message);
        return NextResponse.json({ error: 'Failed to update photos' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        updated: updated?.length || 0,
        matched: mediaIdsToUpdate.length,
      });
    }

    return NextResponse.json({ error: 'Provide either media_ids or source_work_name + classroom_id' }, { status: 400 });

  } catch (error) {
    console.error('Batch retag error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
