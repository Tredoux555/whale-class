// /api/montree/principal/setup/route.ts
// Session 105: Principal setup - add classrooms and teachers
// Updated: Auto-assign full curriculum to new classrooms
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CURRICULUM } from '@/lib/montree/curriculum-data';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Login code is stored plain for lookup, password_hash is for email+password auth

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
      .select('id')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const createdClassrooms: any[] = [];
    const createdTeachers: any[] = [];

    // Create classrooms and teachers
    for (const classroom of classrooms) {
      if (!classroom.name?.trim()) continue;

      // Create classroom
      const { data: createdClassroom, error: classroomError } = await supabase
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

      if (classroomError) {
        console.error('Classroom creation error:', classroomError);
        continue;
      }

      createdClassrooms.push(createdClassroom);

      // Auto-assign full curriculum to this classroom
      const curriculumRecords = buildCurriculumRecords(createdClassroom.id);
      if (curriculumRecords.length > 0) {
        const { error: curriculumError } = await supabase
          .from('montree_classroom_curriculum_works')
          .insert(curriculumRecords);

        if (curriculumError) {
          console.error('Curriculum assignment error:', curriculumError);
          // Don't fail the whole operation - classroom still works with global fallback
        } else {
          console.log(`Assigned ${curriculumRecords.length} curriculum works to classroom ${createdClassroom.name}`);
        }
      }

      // Create teachers for this classroom
      for (const teacher of classroom.teachers) {
        if (!teacher.name?.trim()) continue;

        const loginCode = generateLoginCode();

        const { data: createdTeacher, error: teacherError } = await supabase
          .from('montree_teachers')
          .insert({
            school_id: schoolId,
            classroom_id: createdClassroom.id,
            name: teacher.name.trim(),
            email: teacher.email?.trim() || null,
            login_code: loginCode,  // Store plain code for lookup
            role: 'teacher',
            is_active: true,
          })
          .select()
          .single();

        if (teacherError) {
          console.error('Teacher creation error:', teacherError);
          continue;
        }

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

    return NextResponse.json({
      success: true,
      classrooms: createdClassrooms,
      teachers: createdTeachers,
    });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
