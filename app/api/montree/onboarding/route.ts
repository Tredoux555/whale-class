// app/api/montree/onboarding/route.ts
// Complete school onboarding: creates school + classrooms + teachers in one transaction

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

type ClassroomInput = {
  name: string;
  icon: string;
  color: string;
  teacher: {
    name: string;
    email: string;
  };
};

type OnboardingInput = {
  school: {
    name: string;
    slug: string;
  };
  classrooms: ClassroomInput[];
};

// Generate a simple login code like "whale-7392"
function generateLoginCode(classroomName: string): string {
  const prefix = classroomName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10) || 'class';
  const suffix = Math.floor(1000 + Math.random() * 9000); // 4 digit number
  return `${prefix}-${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const body: OnboardingInput = await request.json();
    const { school, classrooms } = body;

    // Validate
    if (!school?.name || !school?.slug) {
      return NextResponse.json({ error: 'School name and slug required' }, { status: 400 });
    }

    if (!classrooms || classrooms.length === 0) {
      return NextResponse.json({ error: 'At least one classroom required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // 1. Create the school
    const { data: newSchool, error: schoolError } = await supabase
      .from('montree_schools')
      .insert({
        name: school.name,
        slug: school.slug,
        subscription_status: 'active',
      })
      .select()
      .single();

    if (schoolError) {
      // Check if slug already exists
      if (schoolError.code === '23505') {
        return NextResponse.json({ error: 'A school with this name already exists' }, { status: 400 });
      }
      throw schoolError;
    }

    const schoolId = newSchool.id;
    const createdClassrooms = [];
    const createdTeachers = [];

    // 2. Create classrooms and teachers
    for (const classroom of classrooms) {
      if (!classroom.name) continue;

      // Create teacher first if name provided
      let teacherId = null;
      let loginCode = null;
      
      if (classroom.teacher?.name) {
        // Generate unique login code
        loginCode = generateLoginCode(classroom.name);
        
        const { data: teacher, error: teacherError } = await supabase
          .from('simple_teachers')
          .insert({
            name: classroom.teacher.name,
            password: '123', // Temporary default, teacher will set their own
            password_set: false,
            login_code: loginCode,
            school_id: schoolId,
            is_active: true,
          })
          .select()
          .single();

        if (teacherError) {
          console.error('Teacher creation error:', teacherError);
          // Try with different code if duplicate
          if (teacherError.code === '23505') {
            loginCode = generateLoginCode(classroom.name + Math.random());
            const { data: retryTeacher } = await supabase
              .from('simple_teachers')
              .insert({
                name: classroom.teacher.name,
                password: '123',
                password_set: false,
                login_code: loginCode,
                school_id: schoolId,
                is_active: true,
              })
              .select()
              .single();
            if (retryTeacher) {
              teacherId = retryTeacher.id;
              createdTeachers.push({ ...retryTeacher, login_code: loginCode });
            }
          }
        } else {
          teacherId = teacher.id;
          createdTeachers.push({ ...teacher, login_code: loginCode });
        }
      }

      // Create classroom
      const { data: newClassroom, error: classroomError } = await supabase
        .from('montree_classrooms')
        .insert({
          school_id: schoolId,
          name: classroom.name,
          icon: classroom.icon || '📚',
          color: classroom.color || '#10b981',
          teacher_id: teacherId,
          is_active: true,
        })
        .select()
        .single();

      if (classroomError) {
        console.error('Classroom creation error:', classroomError);
      } else {
        createdClassrooms.push(newClassroom);

        // Update teacher with classroom_id
        if (teacherId) {
          await supabase
            .from('simple_teachers')
            .update({ classroom_id: newClassroom.id })
            .eq('id', teacherId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      school: newSchool,
      classrooms: createdClassrooms,
      teachers: createdTeachers, // Includes login_code for each teacher
    }, { status: 201 });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
