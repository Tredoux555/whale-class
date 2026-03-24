// GET /api/montree/classroom-setup — List works with visual memory status for this classroom
// POST /api/montree/classroom-setup — Confirm/save a Sonnet-generated description to visual_memory

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';
import { invalidateClassroomEmbeddings } from '@/lib/montree/classifier';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Fail-fast: classroomId is required for setup
    if (!auth.classroomId) {
      return NextResponse.json({ success: false, error: 'No classroom associated with this account' }, { status: 403 });
    }

    const supabase = getSupabase();
    const classroomId = auth.classroomId;

    // Verify classroom belongs to this school (classroomId comes from JWT, must validate ownership)
    const { data: classroomCheck } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroomId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroomCheck) {
      return NextResponse.json({ success: false, error: 'Classroom not found in your school' }, { status: 403 });
    }

    // 2 parallel queries: curriculum works + existing visual memories
    const [worksResult, memoriesResult] = await Promise.all([
      supabase
        .from('montree_classroom_curriculum_works')
        .select('id, name, work_key, area_key, description, is_custom, sequence')
        .eq('classroom_id', classroomId)
        .order('area_key')
        .order('sequence'),
      supabase
        .from('montree_visual_memory')
        .select('work_name, work_key, area, visual_description, reference_photo_url, source, description_confidence, updated_at')
        .eq('classroom_id', classroomId),
    ]);

    if (worksResult.error) {
      console.error('[ClassroomSetup] Works query error:', worksResult.error);
      return NextResponse.json({ success: false, error: 'Failed to load works' }, { status: 500 });
    }

    // Log but don't fail on memories query error (works list is still useful)
    if (memoriesResult.error) {
      console.error('[ClassroomSetup] Visual memories query error:', memoriesResult.error);
    }

    // Build a lookup map: work_key → visual memory entry
    const memoryMap = new Map<string, typeof memoriesResult.data extends (infer T)[] ? T : never>();
    if (memoriesResult.data) {
      for (const mem of memoriesResult.data) {
        if (mem.work_key) {
          memoryMap.set(mem.work_key, mem);
        }
      }
    }

    // Merge works with their visual memory status
    const works = (worksResult.data || []).map((w) => {
      const memory = memoryMap.get(w.work_key);
      return {
        id: w.id,
        name: w.name,
        work_key: w.work_key,
        area_key: w.area_key,
        description: w.description,
        is_custom: w.is_custom || false,
        sequence: w.sequence,
        // Visual memory fields
        has_reference_photo: !!memory?.reference_photo_url,
        has_description: !!memory?.visual_description,
        reference_photo_url: memory?.reference_photo_url || null,
        visual_description: memory?.visual_description || null,
        description_confidence: memory?.description_confidence || null,
        source: memory?.source || null,
        last_updated: memory?.updated_at || null,
      };
    });

    // Stats
    const total = works.length;
    const described = works.filter((w) => w.has_description).length;
    const withPhoto = works.filter((w) => w.has_reference_photo).length;

    return NextResponse.json({
      success: true,
      works,
      stats: { total, described, with_photo: withPhoto },
    }, {
      headers: { 'Cache-Control': 'private, max-age=10, stale-while-revalidate=30' },
    });
  } catch (error) {
    console.error('[ClassroomSetup] GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (!auth.classroomId) {
      return NextResponse.json({ success: false, error: 'No classroom associated with this account' }, { status: 403 });
    }
    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Verify classroom belongs to this school
    const { data: classroomCheck } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', auth.classroomId)
      .eq('school_id', auth.schoolId)
      .maybeSingle();

    if (!classroomCheck) {
      return NextResponse.json({ success: false, error: 'Classroom not found in your school' }, { status: 403 });
    }

    const body = await request.json();
    const {
      work_key,
      work_name,
      area,
      visual_description,
      reference_photo_url,
      parent_description,
      why_it_matters,
      key_materials,
      negative_descriptions,
      is_custom,
    } = body;

    // Validate required fields
    if (!work_key || typeof work_key !== 'string') {
      return NextResponse.json({ success: false, error: 'work_key is required' }, { status: 400 });
    }
    if (!work_name || typeof work_name !== 'string') {
      return NextResponse.json({ success: false, error: 'work_name is required' }, { status: 400 });
    }
    if (!visual_description || typeof visual_description !== 'string' || visual_description.trim().length < 20) {
      return NextResponse.json({ success: false, error: 'visual_description must be at least 20 characters' }, { status: 400 });
    }
    const validAreas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'special_events'];
    if (!area || !validAreas.includes(area)) {
      return NextResponse.json({ success: false, error: 'Invalid area' }, { status: 400 });
    }

    // Validate work belongs to this classroom's curriculum
    const { data: workExists } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id')
      .eq('classroom_id', auth.classroomId)
      .eq('work_key', work_key)
      .maybeSingle();

    if (!workExists) {
      return NextResponse.json({ success: false, error: 'Work not found in classroom curriculum' }, { status: 404 });
    }

    // Upsert into visual_memory with teacher_setup source and confidence 1.0
    const { error: upsertError } = await supabase
      .from('montree_visual_memory')
      .upsert({
        classroom_id: auth.classroomId,
        work_name: work_name.trim(),
        work_key,
        area,
        is_custom: is_custom || false,
        visual_description: visual_description.trim().slice(0, 1000),
        reference_photo_url: reference_photo_url || null,
        parent_description: parent_description ? parent_description.trim().slice(0, 500) : null,
        why_it_matters: why_it_matters ? why_it_matters.trim().slice(0, 500) : null,
        key_materials: Array.isArray(key_materials) ? key_materials.slice(0, 20) : null,
        negative_descriptions: Array.isArray(negative_descriptions) ? negative_descriptions.slice(0, 10) : null,
        source: 'teacher_setup',
        description_confidence: 1.0,
        updated_at: new Date().toISOString(),
        // Clear stale embedding so Sprint 3 re-embeds
        embedding_generated_at: null,
      }, { onConflict: 'classroom_id,work_name' });

    if (upsertError) {
      console.error('[ClassroomSetup] Upsert error:', upsertError);
      return NextResponse.json({ success: false, error: 'Failed to save description' }, { status: 500 });
    }

    console.log(`[ClassroomSetup] Saved description for "${work_name}" (${work_key}) in classroom ${auth.classroomId}`);

    // Invalidate per-classroom CLIP embeddings so they re-build with new description
    if (auth.classroomId) {
      invalidateClassroomEmbeddings(auth.classroomId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ClassroomSetup] POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
