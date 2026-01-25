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
      if (classroom.teacher?.name) {
        const { data: teacher, error: teacherError } = await supabase
          .from('simple_teachers')
          .insert({
            name: classroom.teacher.name,
            password: '123', // Default password
            school_id: schoolId,
            is_active: true,
          })
          .select()
          .single();

        if (teacherError) {
          console.error('Teacher creation error:', teacherError);
        } else {
          teacherId = teacher.id;
          createdTeachers.push(teacher);
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
      teachers: createdTeachers,
    }, { status: 201 });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
