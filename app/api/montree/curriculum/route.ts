// /api/montree/curriculum/route.ts
// GET/POST curriculum works for a classroom - FIXED inline client

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { enrichCustomWorkInBackground } from '@/lib/montree/guru/work-enrichment';

// Default area definitions (English only)
const DEFAULT_AREAS = [
  { area_key: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#10B981', sequence: 1 },
  { area_key: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#F59E0B', sequence: 2 },
  { area_key: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#3B82F6', sequence: 3 },
  { area_key: 'language', name: 'Language', icon: '📚', color: '#EC4899', sequence: 4 },
  { area_key: 'cultural', name: 'Cultural', icon: '🌍', color: '#8B5CF6', sequence: 5 },
  { area_key: 'special_events', name: 'Special Events', icon: '🎉', color: '#E11D48', sequence: 6 },
];

// GET - Fetch curriculum for classroom
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    // Fetch works with area info - ordered by area then sequence
    const { data, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        *,
        area:montree_classroom_curriculum_areas!area_id (
          id, area_key, name, name_chinese, icon, color, sequence
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('sequence');

    if (error) {
      console.error('Curriculum fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 });
    }

    // Group by area_key for display, sorted by sequence within each area
    const byArea: Record<string, any[]> = {};
    for (const work of data || []) {
      const areaKey = work.area?.area_key || 'other';
      if (!byArea[areaKey]) byArea[areaKey] = [];
      byArea[areaKey].push(work);
    }
    // Sort each area by sequence
    for (const areaKey of Object.keys(byArea)) {
      byArea[areaKey].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    }

    const response = NextResponse.json({
      curriculum: data || [],
      byArea,
      total: data?.length || 0
    });
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return response;

  } catch (error) {
    console.error('Curriculum API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Seed curriculum from Montessori Brain OR add single work
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { classroom_id, action } = body;

    if (!classroom_id) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    // Verify classroom belongs to this school (cross-pollination protection)
    const { data: classroomCheck } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroom_id)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroomCheck) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 403 });
    }

    // SEED FROM BRAIN
    if (action === 'seed' || action === 'seed_from_brain' || action === 'seed_works') {
      // Check for existing areas first
      const { data: existingAreas } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id, area_key')
        .eq('classroom_id', classroom_id);

      let areaMap: Record<string, string> = {};

      if (existingAreas && existingAreas.length > 0) {
        // Use existing areas
        for (const area of existingAreas) {
          areaMap[area.area_key] = area.id;
        }
        // Clear ONLY non-custom works (preserve custom works added by teacher)
        await supabase
          .from('montree_classroom_curriculum_works')
          .delete()
          .eq('classroom_id', classroom_id)
          .or('is_custom.is.null,is_custom.eq.false');
      } else {
        // Create new areas
        const areasToInsert = DEFAULT_AREAS.map(area => ({
          classroom_id,
          ...area,
          is_active: true
        }));

        const { data: insertedAreas, error: areaError } = await supabase
          .from('montree_classroom_curriculum_areas')
          .insert(areasToInsert)
          .select();

        if (areaError) {
          console.error('Area seed error:', areaError);
          return NextResponse.json({ error: 'Failed to seed areas' }, { status: 500 });
        }

        for (const area of insertedAreas || []) {
          areaMap[area.area_key] = area.id;
        }
      }

      // Load from AUTHORITATIVE static curriculum (100% coverage guaranteed)
      const allWorks = loadAllCurriculumWorks();

      const worksToInsert: Record<string, unknown>[] = [];

      for (const work of allWorks) {
        const areaId = areaMap[work.area_key];
        if (!areaId) continue;

        worksToInsert.push({
          classroom_id,
          area_id: areaId,
          work_key: work.work_key,
          name: work.name,
          description: work.description || null,
          age_range: work.age_range || '3-6',
          sequence: work.sequence, // Correct global sequence from static files
          is_active: true,
          direct_aims: work.direct_aims || [],
          indirect_aims: work.indirect_aims || [],
          materials: work.materials || [],
          control_of_error: work.control_of_error || null,
          prerequisites: work.prerequisites || [],
          // Teacher presentation
          quick_guide: work.quick_guide || null,
          presentation_steps: work.presentation_steps || [],
          // Parent-facing (guaranteed from comprehensive-guides)
          parent_description: work.parent_description || null,
          why_it_matters: work.why_it_matters || null,
        });
      }

      if (worksToInsert.length > 0) {
        const { error: workError } = await supabase
          .from('montree_classroom_curriculum_works')
          .insert(worksToInsert);

        if (workError) {
          console.error('Work seed error:', workError);
          return NextResponse.json({ error: 'Failed to seed works' }, { status: 500 });
        }
      }

      return NextResponse.json({ 
        success: true, 
        seeded: worksToInsert.length,
        areas: Object.keys(areaMap).length
      });
    }

    // ADD SINGLE WORK - supports inserting at specific position
    const {
      work_key,
      name,
      name_chinese,
      area_key,
      description,
      after_sequence,
      age_range,
      why_it_matters,
      direct_aims,
      indirect_aims,
      materials,
      teacher_notes,
      is_custom,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    // Normalize area_key (handle "Language" -> "language", "math" -> "mathematics")
    let normalizedAreaKey = (area_key || 'practical_life').toLowerCase().replace(/\s+/g, '_').replace('-', '_');
    if (normalizedAreaKey === 'math') normalizedAreaKey = 'mathematics';

    // Get the area ID for this work
    let { data: areaData } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', classroom_id)
      .eq('area_key', normalizedAreaKey)
      .maybeSingle();

    // If area doesn't exist, auto-seed all areas for this classroom
    if (!areaData) {
      const areasToInsert = DEFAULT_AREAS.map(area => ({
        classroom_id,
        ...area,
        is_active: true
      }));

      const { error: seedError } = await supabase
        .from('montree_classroom_curriculum_areas')
        .upsert(areasToInsert, { onConflict: 'classroom_id,area_key', ignoreDuplicates: true });

      if (seedError) {
        console.error('Failed to auto-seed areas:', seedError);
        return NextResponse.json({ error: 'Failed to initialize curriculum areas' }, { status: 500 });
      }

      // Now fetch the area we need
      const { data: newAreaData } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id')
        .eq('classroom_id', classroom_id)
        .eq('area_key', normalizedAreaKey)
        .maybeSingle();

      areaData = newAreaData;
    }

    if (!areaData) {
      return NextResponse.json({ error: `Area "${normalizedAreaKey}" could not be created` }, { status: 500 });
    }

    let newSequence: number;

    // Check if we should insert at a specific position (after_sequence can be 0)
    if (typeof after_sequence === 'number') {
      // INSERT AFTER SPECIFIC SEQUENCE
      // First, shift all works with sequence > after_sequence by 1
      const { error: shiftError } = await supabase.rpc('increment_sequences_after', {
        p_classroom_id: classroom_id,
        p_area_id: areaData.id,
        p_after_sequence: after_sequence
      });

      // If RPC doesn't exist, do it manually
      if (shiftError) {
        // Get all works in this area with sequence > after_sequence
        const { data: worksToShift } = await supabase
          .from('montree_classroom_curriculum_works')
          .select('id, sequence')
          .eq('classroom_id', classroom_id)
          .eq('area_id', areaData.id)
          .gt('sequence', after_sequence)
          .order('sequence', { ascending: false }); // Descending to avoid conflicts

        // Shift each one
        for (const work of worksToShift || []) {
          await supabase
            .from('montree_classroom_curriculum_works')
            .update({ sequence: work.sequence + 1 })
            .eq('id', work.id);
        }
      }

      newSequence = after_sequence + 1;
    } else {
      // ADD AT END
      const { data: existingSeq } = await supabase
        .from('montree_classroom_curriculum_works')
        .select('sequence')
        .eq('classroom_id', classroom_id)
        .eq('area_id', areaData.id)
        .order('sequence', { ascending: false })
        .limit(1);

      newSequence = (existingSeq?.[0]?.sequence || 0) + 1;
    }

    const insertData: Record<string, unknown> = {
      classroom_id,
      area_id: areaData.id,
      work_key: work_key || `custom_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      name,
      name_chinese: name_chinese || null,
      description: description || null,
      sequence: newSequence,
      is_active: true,
      age_range: age_range || '3-6',
      why_it_matters: why_it_matters || null,
      direct_aims: Array.isArray(direct_aims) ? direct_aims : [],
      indirect_aims: Array.isArray(indirect_aims) ? indirect_aims : [],
      materials: Array.isArray(materials) ? materials : [],
      teacher_notes: teacher_notes || null,
      is_custom: is_custom !== undefined ? is_custom : true,
      source: body.source || 'teacher_manual',
      quick_guide: body.quick_guide || null,
      parent_description: body.parent_description || null,
      presentation_steps: body.presentation_steps || [],
    };

    // Only include optional columns if they have values (columns may not exist in all deployments)
    if (body.prompt_used) insertData.prompt_used = body.prompt_used;
    if (body.reference_photo_url) insertData.reference_photo_url = body.reference_photo_url;

    const { data, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .insert(insertData)
      .select();

    if (error) {
      // Handle duplicate custom work name (partial unique index from migration 144)
      if (error.code === '23505') {
        console.log(`[Curriculum] Duplicate custom work "${name}" in classroom ${classroom_id}`);
        return NextResponse.json({ error: 'A custom work with this name already exists in your classroom' }, { status: 409 });
      }
      console.error('Insert error:', error.message, error.code, error.details, error.hint);
      console.error('Insert data was:', JSON.stringify(insertData, null, 2));
      return NextResponse.json({ error: 'Failed to add work' }, { status: 500 });
    }

    const work = data?.[0] || null;

    // Fire-and-forget: auto-generate Sonnet descriptions for custom works
    // Only triggers when is_custom=true AND enrichment fields are empty
    if (work && work.is_custom && !work.description && !work.quick_guide && !work.parent_description) {
      // Don't await — this runs in the background after the response is sent
      enrichCustomWorkInBackground(work.id, work.name, normalizedAreaKey, auth.schoolId)
        .catch(err => console.error('[Curriculum] Enrichment failed:', err instanceof Error ? err.message : err));
    }

    return NextResponse.json({ success: true, work });

  } catch (error) {
    console.error('Curriculum POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update a curriculum work
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { work_id, ...updates } = body;

    if (!work_id) {
      return NextResponse.json({ error: 'work_id required' }, { status: 400 });
    }

    // Build update object - only include provided fields
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const allowedFields = [
      'name', 'name_chinese', 'description', 'parent_description',
      'why_it_matters', 'age_range', 'direct_aims', 'indirect_aims',
      'materials', 'prerequisites', 'teacher_notes', 'is_active', 'sequence',
      'photo_url', 'quick_guide', 'presentation_steps', 'reference_photo_url',
      'source', 'prompt_used',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    const { data, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .update(updateData)
      .eq('id', work_id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update work' }, { status: 500 });
    }

    return NextResponse.json({ success: true, work: data });
  } catch (error) {
    console.error('Curriculum PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a curriculum work
export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const body = await request.json();
    const { work_id } = body;

    if (!work_id) {
      return NextResponse.json({ error: 'work_id required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('montree_classroom_curriculum_works')
      .delete()
      .eq('id', work_id);

    if (error) {
      console.error('Delete work error:', error);
      return NextResponse.json({ error: 'Failed to delete work' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Curriculum DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
