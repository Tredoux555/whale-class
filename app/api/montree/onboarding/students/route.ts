// /api/montree/onboarding/students/route.ts
// Save students with their curriculum progress during onboarding

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface StudentInput {
  name: string;
  age: number;
  progress: { [areaId: string]: string | null }; // area_id -> work_id
}

export async function POST(request: NextRequest) {
  try {
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
      .single();

    if (classroomError || !classroom) {
      console.error('Classroom not found:', classroomError);
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
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

    const workMap = new Map<string, any>();
    if (curriculumWorks) {
      for (const work of curriculumWorks) {
        workMap.set(work.id, work);
        workMap.set(work.work_key, work);
      }
    }

    const createdStudents: any[] = [];
    const createdProgress: any[] = [];
    const errors: string[] = [];

    for (const student of students) {
      if (!student.name?.trim()) {
        errors.push('Student with empty name skipped');
        continue;
      }

      // Create student/child (note: school_id column doesn't exist - use classroom_id only)
      // Age must be integer (database constraint)
      const { data: createdChild, error: childError } = await supabase
        .from('montree_children')
        .insert({
          classroom_id: classroomId,
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
      const progressBatch: any[] = [];
      const now = new Date().toISOString();

      for (const [areaKey, workId] of Object.entries(student.progress)) {
        if (!workId) continue;

        const work = workMap.get(workId);
        if (!work) { console.warn(`Work not found: ${workId}`); continue; }

        const areaUuid = areaKeyToId.get(areaKey);
        if (!areaUuid) { console.warn(`Area not found for key: ${areaKey}`); continue; }

        const areaWorks = curriculumWorks?.filter(w => w.area_id === areaUuid) || [];
        areaWorks.sort((a, b) => a.sequence - b.sequence);
        const selectedIndex = areaWorks.findIndex(w => w.id === workId || w.work_key === workId);

        if (selectedIndex >= 0) {
          const worksToMark = areaWorks.slice(0, selectedIndex + 1);
          for (let i = 0; i < worksToMark.length; i++) {
            const w = worksToMark[i];
            const isSelected = (i === worksToMark.length - 1);
            progressBatch.push({
              child_id: createdChild.id,
              work_name: w.name,
              work_name_chinese: w.name_chinese || null,
              area: areaKey,
              // Prior works = mastered, selected work = presented
              status: isSelected ? 'presented' : 'mastered',
              presented_at: now,
              mastered_at: isSelected ? null : now,
              notes: isSelected ? 'Current work during onboarding' : 'Prior work during onboarding',
            });
          }
        }
      }

      // Single batch insert instead of one-by-one
      if (progressBatch.length > 0) {
        const { error: progressError } = await supabase
          .from('montree_child_progress')
          .insert(progressBatch);
        if (progressError) {
          console.error(`Failed to create progress for ${student.name}:`, JSON.stringify(progressError));
        } else {
          createdProgress.push(...progressBatch);
        }
      }
    }

    console.log(`[Onboarding] Created ${createdStudents.length} students, ${createdProgress.length} progress records`);

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
