// /api/montree/curriculum/route.ts
// GET/POST curriculum works for a classroom - FIXED inline client

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

// Default area definitions (English only)
const DEFAULT_AREAS = [
  { area_key: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#10B981', sequence: 1 },
  { area_key: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#F59E0B', sequence: 2 },
  { area_key: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#3B82F6', sequence: 3 },
  { area_key: 'language', name: 'Language', icon: '📚', color: '#EC4899', sequence: 4 },
  { area_key: 'cultural', name: 'Cultural', icon: '🌍', color: '#8B5CF6', sequence: 5 },
];

// GET - Fetch curriculum for classroom
export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({ 
      curriculum: data || [],
      byArea,
      total: data?.length || 0
    });

  } catch (error) {
    console.error('Curriculum API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Seed curriculum from Montessori Brain OR add single work
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { classroom_id, action } = body;

    if (!classroom_id) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
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

      const brainAreaMapping: Record<string, string> = {
        'practical_life': 'practical_life',
        'sensorial': 'sensorial',
        'mathematics': 'mathematics',
        'math': 'mathematics',
        'language': 'language',
        'cultural': 'cultural',
        'culture': 'cultural',
      };

      // Fetch from Montessori Brain
      const { data: brainWorks, error: brainError } = await supabase
        .from('montessori_works')
        .select('*')
        .order('sequence_order');

      if (brainError) {
        console.error('Brain fetch error:', brainError);
        return NextResponse.json({ error: 'Failed to fetch brain works' }, { status: 500 });
      }

      // Transform to classroom works - preserve brain's sequence_order
      const worksToInsert: any[] = [];

      for (const work of brainWorks || []) {
        const mappedArea = brainAreaMapping[work.curriculum_area] || 'practical_life';
        const areaId = areaMap[mappedArea];
        if (!areaId) continue;

        worksToInsert.push({
          classroom_id,
          area_id: areaId,
          work_key: work.slug || work.name.toLowerCase().replace(/\s+/g, '_'),
          name: work.name,
          name_chinese: work.name_chinese || null,
          description: work.parent_explanation_simple || null,
          age_range: work.age_min && work.age_max ? `${work.age_min}-${work.age_max}` : '3-6',
          sequence: work.sequence_order || 999, // Preserve brain's logical order
          is_active: true,
          direct_aims: work.direct_aims || [],
          indirect_aims: work.indirect_aims || [],
          materials: work.materials_needed || [],
          control_of_error: work.control_of_error || null,
          prerequisites: work.readiness_indicators || [],
          // Teacher presentation - quick overview
          quick_guide: work.quick_guide || null,
          // Teacher presentation - detailed steps
          presentation_steps: work.presentation_steps || [],
          presentation_notes: work.presentation_notes || null,
          // Parent-facing
          parent_description: work.parent_explanation_detailed || null,
          why_it_matters: work.parent_why_it_matters || null,
          video_search_terms: work.video_search_term || null,
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
      .single();

    // If area doesn't exist, auto-seed all areas for this classroom
    if (!areaData) {
      console.log('Auto-seeding curriculum areas for classroom:', classroom_id);

      const areasToInsert = DEFAULT_AREAS.map(area => ({
        classroom_id,
        ...area,
        is_active: true
      }));

      const { error: seedError } = await supabase
        .from('montree_classroom_curriculum_areas')
        .insert(areasToInsert);

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
        .single();

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
      direct_aims: direct_aims || [],
      indirect_aims: indirect_aims || [],
      materials: materials || [],
      teacher_notes: teacher_notes || null,
      is_custom: is_custom || true,
    };

    const { data, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error, 'Data:', insertData);
      return NextResponse.json({ error: `Failed to add work: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, work: data });

  } catch (error) {
    console.error('Curriculum POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
