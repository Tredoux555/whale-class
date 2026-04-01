// /api/montree/community/works/[id]/inject/route.ts
// POST: Inject a community work into a teacher's classroom curriculum
// Only needs teacher code — no full login required

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// SQL injection defense helper for .ilike() queries
function escapeIlike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workId } = await params;
    const supabase = getSupabase();
    const body = await request.json();
    const { teacher_code } = body;

    if (!teacher_code || teacher_code.length < 4 || teacher_code.length > 10) {
      return NextResponse.json({ error: 'Valid teacher code required' }, { status: 400 });
    }

    // 1. Fetch the community work
    const { data: communityWork, error: workError } = await supabase
      .from('montree_community_works')
      .select('*')
      .eq('id', workId)
      .eq('status', 'approved')
      .maybeSingle();

    if (workError || !communityWork) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    // 2. Find teacher by login code (case-insensitive)
    const { data: teacher, error: teacherError } = await supabase
      .from('montree_teachers')
      .select('id, school_id, classroom_id, name')
      .ilike('login_code', escapeIlike(teacher_code.trim()))
      .maybeSingle();

    if (teacherError || !teacher) {
      return NextResponse.json({ error: 'Teacher code not found. Check your code and try again.' }, { status: 404 });
    }

    if (!teacher.classroom_id) {
      return NextResponse.json({ error: 'No classroom found for this teacher.' }, { status: 400 });
    }

    // 3. Find or create the curriculum area for this classroom
    let { data: areaData } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id')
      .eq('classroom_id', teacher.classroom_id)
      .eq('area_key', communityWork.area)
      .maybeSingle();

    if (!areaData) {
      // Auto-seed areas for this classroom
      const DEFAULT_AREAS = [
        { area_key: 'practical_life', name: 'Practical Life', icon: 'P', color: '#ec4899', sequence: 1 },
        { area_key: 'sensorial', name: 'Sensorial', icon: 'S', color: '#8b5cf6', sequence: 2 },
        { area_key: 'mathematics', name: 'Mathematics', icon: 'M', color: '#3b82f6', sequence: 3 },
        { area_key: 'language', name: 'Language', icon: 'L', color: '#22c55e', sequence: 4 },
        { area_key: 'cultural', name: 'Cultural', icon: 'C', color: '#f97316', sequence: 5 },
      ];

      await supabase
        .from('montree_classroom_curriculum_areas')
        .insert(DEFAULT_AREAS.map(a => ({ ...a, classroom_id: teacher.classroom_id, is_active: true })));

      const { data: newArea } = await supabase
        .from('montree_classroom_curriculum_areas')
        .select('id')
        .eq('classroom_id', teacher.classroom_id)
        .eq('area_key', communityWork.area)
        .maybeSingle();

      areaData = newArea;
    }

    if (!areaData) {
      return NextResponse.json({ error: 'Failed to set up curriculum area' }, { status: 500 });
    }

    // 4. Check if work already exists in this classroom (by title match)
    const { data: existing } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id')
      .eq('classroom_id', teacher.classroom_id)
      .eq('name', communityWork.title)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: `"${communityWork.title}" is already in your classroom curriculum!`,
      }, { status: 409 });
    }

    // 5. Get next sequence number
    const { data: lastWork } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('sequence')
      .eq('classroom_id', teacher.classroom_id)
      .eq('area_id', areaData.id)
      .order('sequence', { ascending: false })
      .limit(1);

    const newSequence = (lastWork?.[0]?.sequence || 0) + 1;

    // 6. Insert the work into the classroom curriculum
    const { error: insertError } = await supabase
      .from('montree_classroom_curriculum_works')
      .insert({
        classroom_id: teacher.classroom_id,
        area_id: areaData.id,
        work_key: `community_${communityWork.id}`,
        name: communityWork.title,
        description: communityWork.description,
        age_range: communityWork.age_range || 'all',
        sequence: newSequence,
        is_active: true,
        is_custom: true,
        materials: communityWork.materials || [],
        direct_aims: communityWork.direct_aims || [],
        indirect_aims: communityWork.indirect_aims || [],
        control_of_error: communityWork.control_of_error || null,
        prerequisites: communityWork.prerequisites || [],
        quick_guide: communityWork.detailed_description || null,
        presentation_steps: communityWork.presentation_steps || [],
        parent_description: communityWork.description,
        why_it_matters: (communityWork.direct_aims || []).join('. ') || null,
      });

    if (insertError) {
      console.error('Inject work error:', insertError);
      return NextResponse.json({ error: 'Failed to add work to classroom' }, { status: 500 });
    }

    // 7. Increment inject count
    await supabase
      .from('montree_community_works')
      .update({ inject_count: (communityWork.inject_count || 0) + 1 })
      .eq('id', workId);

    // Area name for confirmation message
    const AREA_NAMES: Record<string, string> = {
      practical_life: 'Practical Life',
      sensorial: 'Sensorial',
      mathematics: 'Mathematics',
      language: 'Language',
      cultural: 'Cultural',
    };

    return NextResponse.json({
      success: true,
      message: `"${communityWork.title}" added to your ${AREA_NAMES[communityWork.area]} curriculum!`,
      teacher_name: teacher.name,
      area: communityWork.area,
      area_name: AREA_NAMES[communityWork.area],
    });
  } catch (error) {
    console.error('Inject work error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
