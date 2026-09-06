// /api/montree/onboarding/students/route.ts
// Save students with their curriculum progress during onboarding

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { writeProgressBatchChunked, type ProgressEntry } from '@/lib/montree/progress/write-progress';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

interface StudentInput {
  name: string;
  age: number;
  progress: { [areaId: string]: string | null }; // area_id -> work_id
}

export async function POST(request: NextRequest) {
  try {
    // AUTH (added 2026-06-10): was unauthenticated — anyone could insert
    // children + progress rows into any classroom by supplying its ID. Require
    // a valid session; the target classroom MUST belong to the caller's school
    // (checked below once the classroom is loaded). The teacher/homeschool
    // signup flow logs the user in (try/instant sets the cookie) before this.
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { classroomId, students } = await request.json() as {
      classroomId: string;
      students: StudentInput[];
    };

    if (!classroomId) {
      return NextResponse.json({ error: 'Classroom ID required' }, { status: 400 });
    }

    if (!students?.length) {
      return NextResponse.json({ error: 'At least one student required' }, { status: 400 });
    }

    // Verify classroom exists and get school_id
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, school_id, name')
      .eq('id', classroomId)
      .maybeSingle();

    if (classroomError || !classroom) {
      console.error('Classroom not found:', classroomError);
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    if (classroom.school_id !== auth.schoolId) {
      return NextResponse.json(
        { error: 'You can only add students to your own school' },
        { status: 403 }
      );
    }

    // Get curriculum areas for this classroom to map area_key to area_id (UUID)
    const { data: curriculumAreas } = await supabase
      .from('montree_classroom_curriculum_areas')
      .select('id, area_key')
      .eq('classroom_id', classroomId);

    const areaKeyToId = new Map<string, string>();
    const areaIdToKey = new Map<string, string>();
    if (curriculumAreas) {
      for (const area of curriculumAreas) {
        areaKeyToId.set(area.area_key, area.id);
        areaIdToKey.set(area.id, area.area_key);
      }
    }

    // Get curriculum works for this classroom to map work_ids to names
    const { data: curriculumWorks } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, work_key, name, name_chinese, area_id, sequence')
      .eq('classroom_id', classroomId);

    const workMap = new Map<string, Record<string, unknown>>();
    if (curriculumWorks) {
      for (const work of curriculumWorks) {
        workMap.set(work.id, work);
        workMap.set(work.work_key, work);
      }
    }

    const createdStudents: Record<string, unknown>[] = [];
    const createdProgress: ProgressEntry[] = [];
    const errors: string[] = [];

    for (const student of students) {
      if (!student.name?.trim()) {
        errors.push('Student with empty name skipped');
        continue;
      }

      // Create student/child — include school_id for data integrity
      // Age must be integer (database constraint)
      const { data: createdChild, error: childError } = await supabase
        .from('montree_children')
        .insert({
          classroom_id: classroomId,
          school_id: classroom.school_id,
          name: student.name.trim(),
          age: Math.round(student.age || 4),
        })
        .select()
        .single();

      if (childError || !createdChild) {
        console.error(`Failed to create student "${student.name}":`, childError);
        errors.push(`Failed to create ${student.name}: ${childError?.message}`);
        continue;
      }

      createdStudents.push(createdChild);

      // Build all progress records in one batch for speed
      const progressBatch: ProgressEntry[] = [];
      const now = new Date().toISOString();

      for (const [areaKey, workId] of Object.entries(student.progress)) {
        if (!workId) continue;

        const work = workMap.get(workId);
        if (!work) { continue; }

        const areaUuid = areaKeyToId.get(areaKey);
        if (!areaUuid) { continue; }

        const areaWorks = curriculumWorks?.filter(w => w.area_id === areaUuid) || [];
        areaWorks.sort((a, b) => a.sequence - b.sequence);
        const selectedIndex = areaWorks.findIndex(w => w.id === workId || w.work_key === workId);

        if (selectedIndex >= 0) {
          const worksToMark = areaWorks.slice(0, selectedIndex + 1);
          for (let i = 0; i < worksToMark.length; i++) {
            const w = worksToMark[i];
            const isSelected = (i === worksToMark.length - 1);
            progressBatch.push({
              childId: createdChild.id,
              workName: w.name,
              workKey: w.work_key || null,
              workNameChinese: w.name_chinese || null,
              area: areaKey,
              // Prior works = mastered, selected work = presented
              status: isSelected ? 'presented' : 'mastered',
              source: 'import',
              classroomId,
              notes: isSelected ? 'Current work during onboarding' : 'Prior work during onboarding',
            });
          }
        }
      }

      // THE DOOR (rule 2). One chunked batch through the sanctioned writer instead
      // of a raw insert: rank gate, classroom/school/work_key stamps and a
      // montree_progress_events row per change (source 'import'). presented_at /
      // mastered_at are stamped by writeProgress on the first transition, so they are
      // no longer sent by hand. Only rows that actually landed are counted.
      if (progressBatch.length > 0) {
        const progressResults = await writeProgressBatchChunked(supabase, progressBatch, {
          actor: auth.userId || null,
        });
        progressResults.forEach((result, i) => {
          if (result.outcome === 'written') createdProgress.push(progressBatch[i]);
          else if (result.outcome === 'queued') {
            console.warn(`[Onboarding] Queued for review (unresolved work): "${result.workName}" for ${student.name}`);
          } else if (result.error) {
            console.error(`Failed to create progress for ${student.name}:`, result.error);
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      students: createdStudents,
      progressCount: createdProgress.length,
      warnings: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('[Onboarding] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
