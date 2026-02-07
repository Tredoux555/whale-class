// /api/montree/principal/setup/route.ts
// Principal setup - add classrooms and teachers
// OVERHAULED: Use static curriculum as PRIMARY source for correct sequencing
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks, loadCurriculumAreas } from '@/lib/montree/curriculum-loader';

function generateLoginCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Seed curriculum for a new classroom using STATIC JSON files
 * This ensures correct Montessori sequencing (not Brain's unreliable order)
 */
async function seedCurriculumForClassroom(
  supabase: any,
  classroomId: string
): Promise<{ success: boolean; worksCount: number; error?: string }> {
  try {
    // Step 1: Create curriculum areas from static data (English only)
    const areas = loadCurriculumAreas();
    const areasToInsert = areas.map(area => ({
      classroom_id: classroomId,
      area_key: area.area_key,
      name: area.name,
      icon: area.icon,
      color: area.color,
      sequence: area.sequence,
      is_active: true,
    }));

    const { data: insertedAreas, error: areaError } = await supabase
      .from('montree_classroom_curriculum_areas')
      .insert(areasToInsert)
      .select();

    if (areaError) {
      console.error(`[Setup] Failed to create areas:`, areaError.message);
      return { success: false, worksCount: 0, error: areaError.message };
    }

    // Build area_key -> UUID map
    const areaMap: Record<string, string> = {};
    for (const area of insertedAreas || []) {
      areaMap[area.area_key] = area.id;
    }

    // Step 2: Load ALL works from static curriculum (correctly sequenced!)
    const allWorks = loadAllCurriculumWorks();

    // Step 3: Transform to database format
    const worksToInsert = allWorks.map(work => {
      const areaUuid = areaMap[work.area_key];
      if (!areaUuid) {
        console.warn(`[Setup] No area UUID for ${work.area_key}`);
        return null;
      }

      return {
        classroom_id: classroomId,
        area_id: areaUuid,
        work_key: work.work_key,
        name: work.name,
        description: work.description || null,
        age_range: work.age_range || '3-6',
        sequence: work.sequence, // CORRECT global sequence from static files
        is_active: true,
        materials: work.materials || [],
        direct_aims: work.direct_aims || [],
        indirect_aims: work.indirect_aims || [],
        control_of_error: work.control_of_error || null,
        prerequisites: work.prerequisites || [],
        // Parent-facing descriptions (from comprehensive-guides)
        quick_guide: work.quick_guide || null,
        presentation_steps: work.presentation_steps || [],
        parent_description: work.parent_description || null,
        why_it_matters: work.why_it_matters || null,
      };
    }).filter(Boolean);

    // Step 4: Insert works in batches for reliability
    const BATCH_SIZE = 50;
    let insertedCount = 0;

    for (let i = 0; i < worksToInsert.length; i += BATCH_SIZE) {
      const batch = worksToInsert.slice(i, i + BATCH_SIZE);

      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error: batchError } = await supabase
          .from('montree_classroom_curriculum_works')
          .insert(batch);

        if (!batchError) {
          insertedCount += batch.length;
          break;
        }

        if (attempt < 3) {
          console.warn(`[Setup] Batch ${Math.floor(i/BATCH_SIZE)+1} attempt ${attempt} failed, retrying...`);
          await new Promise(r => setTimeout(r, 500 * attempt));
        } else {
          console.error(`[Setup] Batch insert failed after 3 attempts:`, batchError.message);
        }
      }
    }

    return { success: true, worksCount: insertedCount };

  } catch (err) {
    console.error(`[Setup] Curriculum seed error:`, err);
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

    // Process each classroom
    for (const classroom of classrooms) {
      if (!classroom.name?.trim()) {
        errors.push(`Classroom with empty name was skipped`);
        continue;
      }

      // Create classroom
      let createdClassroom = null;
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

        if (!result.error) {
          createdClassroom = result.data;
          break;
        }

        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 100 * attempt));
        } else {
          errors.push(`Failed to create classroom "${classroom.name}"`);
        }
      }

      if (!createdClassroom) continue;

      createdClassrooms.push(createdClassroom);

      // Seed curriculum with CORRECT sequencing
      const curriculumResult = await seedCurriculumForClassroom(supabase, createdClassroom.id);
      if (!curriculumResult.success) {
        errors.push(`Curriculum seeding failed for ${createdClassroom.name}: ${curriculumResult.error}`);
      }

      // Create teachers
      const teachersToCreate = classroom.teachers.filter(t => t.name?.trim());
      for (const teacher of teachersToCreate) {
        let loginCode = generateLoginCode();
        let createdTeacher = null;

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

          if (!result.error) {
            createdTeacher = result.data;
            break;
          }

          // If code collision, generate new code
          if (result.error.message?.includes('unique') || result.error.message?.includes('duplicate')) {
            loginCode = generateLoginCode();
          }

          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 100 * attempt));
          }
        }

        if (createdTeacher) {
          createdTeachers.push({
            id: createdTeacher.id,
            name: createdTeacher.name,
            email: createdTeacher.email,
            login_code: loginCode,
            classroom_id: createdClassroom.id,
            classroom_name: createdClassroom.name,
            classroom_icon: createdClassroom.icon,
          });
        } else {
          errors.push(`Failed to create teacher "${teacher.name}"`);
        }
      }
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      classrooms: createdClassrooms,
      teachers: createdTeachers,
      warnings: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('[Setup] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
