// /api/montree/principal/setup/route.ts
// Principal setup - add classrooms and teachers
// FIXED: Create teachers FIRST before curriculum to prevent timeout issues
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRICULUM } from '@/lib/montree/curriculum-data';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateLoginCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Build curriculum records for a new classroom
function buildCurriculumRecords(classroomId: string) {
  const records: any[] = [];
  let globalSequence = 0;

  for (const area of CURRICULUM) {
    for (const category of area.categories) {
      for (const work of category.works) {
        globalSequence++;
        records.push({
          classroom_id: classroomId,
          area_id: area.id,
          work_key: work.id,
          name: work.name,
          name_chinese: work.chineseName || null,
          description: work.description || null,
          age_range: work.ageRange || '3-6',
          sequence: globalSequence,
          materials: work.materials || [],
          levels: work.levels || [],
          is_active: true,
        });
      }
    }
  }

  return records;
}

interface TeacherInput {
  id: string;
  name: string;
  email?: string;
}

interface ClassroomInput {
  id: string;
  name: string;
  icon: string;
  color: string;
  teachers: TeacherInput[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = getSupabase();
    const { schoolId, classrooms } = await request.json() as {
      schoolId: string;
      classrooms: ClassroomInput[];
    };

    console.log(`[Setup] Starting for school ${schoolId} with ${classrooms.length} classrooms`);

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }
    if (!classrooms?.length) {
      return NextResponse.json({ error: 'At least one classroom required' }, { status: 400 });
    }

    // Verify school exists
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('id, name')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      console.error('[Setup] School not found:', schoolError);
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const createdClassrooms: any[] = [];
    const createdTeachers: any[] = [];
    const classroomsForCurriculum: string[] = [];
    const errors: string[] = [];

    // PHASE 1: Create all classrooms and teachers FIRST (this is the priority)
    console.log('[Setup] Phase 1: Creating classrooms and teachers...');

    for (const classroom of classrooms) {
      if (!classroom.name?.trim()) {
        console.log(`[Setup] Skipping classroom with empty name`);
        errors.push(`Classroom with empty name was skipped`);
        continue;
      }

      // Create classroom with retry logic
      let createdClassroom = null;
      let classroomError = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        const result = await supabase
          .from('montree_classrooms')
          .insert({
            school_id: schoolId,
            name: classroom.name.trim(),
            icon: classroom.icon || '📚',
            color: classroom.color || '#10b981',
            is_active: true,
          })
          .select()
          .single();

        if (result.error) {
          classroomError = result.error;
          console.error(`[Setup] Classroom creation attempt ${attempt} failed for "${classroom.name}":`, result.error.message);
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 100 * attempt)); // Brief delay before retry
          }
        } else {
          createdClassroom = result.data;
          classroomError = null;
          break;
        }
      }

      if (classroomError || !createdClassroom) {
        const errMsg = `Failed to create classroom "${classroom.name}": ${classroomError?.message || 'Unknown error'}`;
        console.error(`[Setup] ${errMsg}`);
        errors.push(errMsg);
        continue;
      }

      console.log(`[Setup] Created classroom: ${createdClassroom.name} (${createdClassroom.id})`);
      createdClassrooms.push(createdClassroom);
      classroomsForCurriculum.push(createdClassroom.id);

      // Create ALL teachers for this classroom immediately
      const teachersToCreate = classroom.teachers.filter(t => t.name?.trim());
      console.log(`[Setup] Creating ${teachersToCreate.length} teachers for ${createdClassroom.name}...`);

      for (const teacher of teachersToCreate) {
        // Generate login code with collision retry
        let loginCode = generateLoginCode();
        let createdTeacher = null;
        let teacherError = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          const result = await supabase
            .from('montree_teachers')
            .insert({
              school_id: schoolId,
              classroom_id: createdClassroom.id,
              name: teacher.name.trim(),
              email: teacher.email?.trim() || null,
              login_code: loginCode,
              role: 'teacher',
              is_active: true,
            })
            .select()
            .single();

          if (result.error) {
            teacherError = result.error;
            console.error(`[Setup] Teacher creation attempt ${attempt} failed for "${teacher.name}":`, result.error.message);
            // If it might be a code collision, generate new code
            if (result.error.message?.includes('unique') || result.error.message?.includes('duplicate')) {
              loginCode = generateLoginCode();
            }
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, 100 * attempt));
            }
          } else {
            createdTeacher = result.data;
            teacherError = null;
            break;
          }
        }

        if (teacherError || !createdTeacher) {
          const errMsg = `Failed to create teacher "${teacher.name}": ${teacherError?.message || 'Unknown error'}`;
          console.error(`[Setup] ${errMsg}`);
          errors.push(errMsg);
          continue;
        }

        console.log(`[Setup] Created teacher: ${createdTeacher.name} (code: ${loginCode})`);

        createdTeachers.push({
          id: createdTeacher.id,
          name: createdTeacher.name,
          email: createdTeacher.email,
          login_code: loginCode,
          classroom_id: createdClassroom.id,
          classroom_name: createdClassroom.name,
          classroom_icon: createdClassroom.icon,
        });
      }
    }

    const phase1Time = Date.now() - startTime;
    console.log(`[Setup] Phase 1 complete: ${createdClassrooms.length} classrooms, ${createdTeachers.length} teachers (${phase1Time}ms)`);

    // PHASE 2: Assign curriculum to classrooms (non-critical, can fail gracefully)
    console.log('[Setup] Phase 2: Assigning curriculum (background)...');

    // Do this in background - don't block the response
    const curriculumPromises = classroomsForCurriculum.map(async (classroomId) => {
      try {
        const curriculumRecords = buildCurriculumRecords(classroomId);
        if (curriculumRecords.length > 0) {
          const { error: curriculumError } = await supabase
            .from('montree_classroom_curriculum_works')
            .insert(curriculumRecords);

          if (curriculumError) {
            console.error(`[Setup] Curriculum error for classroom ${classroomId}:`, curriculumError.message);
          } else {
            console.log(`[Setup] Assigned ${curriculumRecords.length} works to classroom ${classroomId}`);
          }
        }
      } catch (err) {
        console.error(`[Setup] Curriculum exception for ${classroomId}:`, err);
      }
    });

    // Don't await - let it run in background
    Promise.all(curriculumPromises).catch(err => {
      console.error('[Setup] Background curriculum assignment failed:', err);
    });

    const totalTime = Date.now() - startTime;
    console.log(`[Setup] Complete! Returning ${createdTeachers.length} teachers (${totalTime}ms)`);

    // Verification: Count expected vs actual
    const expectedClassrooms = classrooms.filter(c => c.name?.trim()).length;
    const expectedTeachers = classrooms.reduce((sum, c) => sum + c.teachers.filter(t => t.name?.trim()).length, 0);

    if (createdClassrooms.length < expectedClassrooms || createdTeachers.length < expectedTeachers) {
      console.warn(`[Setup] MISMATCH! Expected ${expectedClassrooms} classrooms, got ${createdClassrooms.length}. Expected ${expectedTeachers} teachers, got ${createdTeachers.length}`);
      errors.push(`Warning: Some items may not have been created. Expected ${expectedClassrooms} classrooms and ${expectedTeachers} teachers, but got ${createdClassrooms.length} classrooms and ${createdTeachers.length} teachers.`);
    }

    return NextResponse.json({
      success: true,
      classrooms: createdClassrooms,
      teachers: createdTeachers,
      warnings: errors.length > 0 ? errors : undefined,
      stats: {
        expectedClassrooms,
        createdClassrooms: createdClassrooms.length,
        expectedTeachers,
        createdTeachers: createdTeachers.length,
      }
    });

  } catch (error) {
    console.error('[Setup] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
