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

// Default area definitions for curriculum
const DEFAULT_AREAS = [
  { area_key: 'practical_life', name: 'Practical Life', name_chinese: '日常生活', icon: '🧹', color: '#10B981', sequence: 1 },
  { area_key: 'sensorial', name: 'Sensorial', name_chinese: '感官', icon: '👁️', color: '#F59E0B', sequence: 2 },
  { area_key: 'mathematics', name: 'Mathematics', name_chinese: '数学', icon: '🔢', color: '#3B82F6', sequence: 3 },
  { area_key: 'language', name: 'Language', name_chinese: '语言', icon: '📚', color: '#EC4899', sequence: 4 },
  { area_key: 'cultural', name: 'Cultural', name_chinese: '文化', icon: '🌍', color: '#8B5CF6', sequence: 5 },
];

// Seed curriculum for a new classroom - MUST be called during classroom creation
async function seedCurriculumForClassroom(supabase: any, classroomId: string): Promise<{ success: boolean; worksCount: number; error?: string }> {
  try {
    // Step 1: Create curriculum areas for this classroom
    const areasToInsert = DEFAULT_AREAS.map(area => ({
      classroom_id: classroomId,
      ...area,
      is_active: true
    }));

    const { data: insertedAreas, error: areaError } = await supabase
      .from('montree_classroom_curriculum_areas')
      .insert(areasToInsert)
      .select();

    if (areaError) {
      console.error(`[Setup] Failed to create areas for classroom ${classroomId}:`, areaError.message);
      return { success: false, worksCount: 0, error: areaError.message };
    }

    // Build area_key -> UUID map
    const areaMap: Record<string, string> = {};
    for (const area of insertedAreas || []) {
      areaMap[area.area_key] = area.id;
    }

    // Step 2: Build curriculum works with proper area UUIDs
    const worksToInsert: any[] = [];
    let globalSequence = 0;

    for (const area of CURRICULUM) {
      const areaUuid = areaMap[area.id];
      if (!areaUuid) {
        console.warn(`[Setup] No UUID found for area ${area.id}`);
        continue;
      }

      for (const category of area.categories) {
        for (const work of category.works) {
          globalSequence++;
          worksToInsert.push({
            classroom_id: classroomId,
            area_id: areaUuid,
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

    // Step 3: Insert all works
    if (worksToInsert.length > 0) {
      const { error: worksError } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(worksToInsert);

      if (worksError) {
        console.error(`[Setup] Failed to create works for classroom ${classroomId}:`, worksError.message);
        return { success: false, worksCount: 0, error: worksError.message };
      }
    }

    console.log(`[Setup] Seeded ${worksToInsert.length} curriculum works for classroom ${classroomId}`);
    return { success: true, worksCount: worksToInsert.length };

  } catch (err) {
    console.error(`[Setup] Curriculum seed exception for ${classroomId}:`, err);
    return { success: false, worksCount: 0, error: String(err) };
  }
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

      // IMMEDIATELY seed curriculum for this classroom - THIS IS ESSENTIAL
      const curriculumResult = await seedCurriculumForClassroom(supabase, createdClassroom.id);
      if (!curriculumResult.success) {
        errors.push(`Warning: Curriculum seeding failed for ${createdClassroom.name}: ${curriculumResult.error}`);
      } else {
        console.log(`[Setup] Curriculum seeded: ${curriculumResult.worksCount} works for ${createdClassroom.name}`);
      }

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
