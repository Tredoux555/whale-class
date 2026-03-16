// /api/montree/children/route.ts
// Returns children for a classroom + Add new children
// Fixed: Inline client creation to avoid any import issues

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

// Add a new child to classroom
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { classroomId, name, age, enrolled_at, progress, gender, notes } = await request.json();

    if (!classroomId || !name?.trim()) {
      return NextResponse.json({ error: 'Classroom ID and name required' }, { status: 400 });
    }

    // Phase 6: Input length limits
    if (name && name.length > 200) {
      return NextResponse.json({ error: 'Name too long' }, { status: 400 });
    }
    if (notes && notes.length > 5000) {
      return NextResponse.json({ error: 'Notes too long' }, { status: 400 });
    }

    // Verify classroom exists
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroomId)
      .maybeSingle();

    if (classroomError || !classroom) {
      console.error('Classroom not found:', { classroomId, classroomError });
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Create the child (note: school_id column doesn't exist in table - use classroom_id only)
    // Age must be integer (database constraint)
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .insert({
        classroom_id: classroomId,
        name: name.trim(),
        age: Math.round(age || 4),
        enrolled_at: enrolled_at || new Date().toISOString().split('T')[0],
        notes: notes || null,
        ...(gender ? { settings: { gender } } : {}),
      })
      .select()
      .single();

    if (childError) {
      console.error('Failed to create child:', childError);
      return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
    }

    // If progress is provided, create progress records
    if (progress && Object.keys(progress).length > 0) {
      // Get curriculum works + areas for this classroom in parallel
      const [{ data: curriculumWorks }, { data: curriculumAreas }] = await Promise.all([
        supabase.from('montree_classroom_curriculum_works')
          .select('id, work_key, name, name_chinese, area_id, sequence')
          .eq('classroom_id', classroomId),
        supabase.from('montree_classroom_curriculum_areas')
          .select('id, area_key')
          .eq('classroom_id', classroomId),
      ]);

      const areaKeyToId = new Map<string, string>();
      if (curriculumAreas) {
        for (const area of curriculumAreas) {
          areaKeyToId.set(area.area_key, area.id);
        }
      }

      const workMap = new Map<string, Record<string, unknown>>();
      if (curriculumWorks) {
        for (const work of curriculumWorks) {
          workMap.set(work.id, work);
          workMap.set(work.work_key, work);
        }
      }

      // Build all progress records in one batch for speed
      const progressRecords: Record<string, unknown>[] = [];
      const now = new Date().toISOString();

      for (const [areaKey, workId] of Object.entries(progress)) {
        if (!workId) continue;

        const work = workMap.get(workId as string);
        if (!work) continue;

        const areaUuid = areaKeyToId.get(areaKey);
        if (!areaUuid) continue;

        // Get all works in this area up to and including the selected work
        const areaWorks = curriculumWorks?.filter(w => w.area_id === areaUuid) || [];
        areaWorks.sort((a, b) => a.sequence - b.sequence);

        const selectedIndex = areaWorks.findIndex(w => w.id === workId || w.work_key === workId);

        if (selectedIndex >= 0) {
          const worksToMark = areaWorks.slice(0, selectedIndex + 1);
          for (let i = 0; i < worksToMark.length; i++) {
            const w = worksToMark[i];
            const isSelected = (i === worksToMark.length - 1);
            progressRecords.push({
              child_id: child.id,
              work_name: w.name,
              work_name_chinese: w.name_chinese || null,
              area: areaKey,
              // Prior works = mastered, the selected work = presented
              status: isSelected ? 'presented' : 'mastered',
              presented_at: now,
              mastered_at: isSelected ? null : now,
            });
          }
        }
      }

      // Upsert to avoid duplicate progress records (if child already has progress for a work)
      if (progressRecords.length > 0) {
        const { error: progressErr } = await supabase
          .from('montree_child_progress')
          .upsert(progressRecords, { onConflict: 'child_id,work_name' });
        if (progressErr) {
          console.error('Progress upsert error:', JSON.stringify(progressErr));
        }
      }
    }

    return NextResponse.json({ success: true, child });
  } catch (error) {
    console.error('Create child error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    const supabase = getSupabase();

    // SECURITY: Always scope to the authenticated user's school.
    // First, get all classrooms belonging to the user's school.
    // If classroom_id is provided, use it directly (but verify it belongs to their school).
    // If not, get all classrooms for their school and filter by those.

    let allowedClassroomIds: string[] = [];

    if (classroomId) {
      // Verify this classroom belongs to the user's school
      const { data: classroom } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('id', classroomId)
        .eq('school_id', auth.schoolId)
        .maybeSingle();

      if (!classroom) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }
      allowedClassroomIds = [classroomId];
    } else if (auth.classroomId) {
      // Teacher has a specific classroom — scope to that
      allowedClassroomIds = [auth.classroomId];
    } else {
      // Principal or no classroom set — get ALL classrooms for their school
      const { data: schoolClassrooms } = await supabase
        .from('montree_classrooms')
        .select('id')
        .eq('school_id', auth.schoolId);

      allowedClassroomIds = (schoolClassrooms || []).map(c => c.id);
    }

    if (allowedClassroomIds.length === 0) {
      return NextResponse.json({ children: [] });
    }

    let query = supabase
      .from('montree_children')
      .select('id, name, age, photo_url, notes, classroom_id, enrolled_at')
      .in('classroom_id', allowedClassroomIds)
      .order('name');

    const { data, error } = await query;

    if (error) {
      // Phase 8: Sanitized — no JSON.stringify of full error, no error.message to client
      console.error('[children API]', { message: error.message, code: (error as Record<string, unknown>).code });
      return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
    }

    const response = NextResponse.json({ children: data || [] });
    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
    return response;

  } catch (error) {
    // Phase 8: Sanitized — don't leak error details to client
    console.error('[children API]', { message: (error as Error)?.message || String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
