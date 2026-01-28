// /api/montree/onboarding/route.ts
// Session 105: Real onboarding API - saves to Supabase
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Simple hash for login codes (not bcrypt, but sufficient for 6-char codes)
function hashLoginCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Generate URL-friendly slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Generate 6-character login code
function generateLoginCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // No confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface ClassroomInput {
  id: string;
  name: string;
  icon: string;
  color: string;
  teachers: {
    id: string;
    name: string;
    email?: string;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { schoolName, ownerEmail, ownerName, classrooms } = body as {
      schoolName: string;
      ownerEmail: string;
      ownerName?: string;
      classrooms: ClassroomInput[];
    };

    // Validate required fields
    if (!schoolName?.trim()) {
      return NextResponse.json({ error: 'School name is required' }, { status: 400 });
    }
    if (!ownerEmail?.trim()) {
      return NextResponse.json({ error: 'Owner email is required' }, { status: 400 });
    }
    if (!classrooms?.length) {
      return NextResponse.json({ error: 'At least one classroom is required' }, { status: 400 });
    }

    // Check if slug already exists
    const slug = generateSlug(schoolName);
    const { data: existingSchool } = await supabase
      .from('montree_schools')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSchool) {
      return NextResponse.json({ error: 'A school with this name already exists' }, { status: 400 });
    }

    // 1. Create school
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .insert({
        name: schoolName.trim(),
        slug,
        owner_email: ownerEmail.trim(),
        owner_name: ownerName?.trim() || null,
        subscription_status: 'trialing',
        plan_type: 'school',
        subscription_tier: 'free',
        is_active: true,
      })
      .select()
      .single();

    if (schoolError) {
      console.error('School creation error:', schoolError);
      return NextResponse.json({ error: 'Failed to create school' }, { status: 500 });
    }

    const createdClassrooms: any[] = [];
    const createdTeachers: any[] = [];

    // 2. Create classrooms and teachers
    for (const classroom of classrooms) {
      if (!classroom.name?.trim()) continue;

      // Create classroom
      const { data: createdClassroom, error: classroomError } = await supabase
        .from('montree_classrooms')
        .insert({
          school_id: school.id,
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

      // Create teachers for this classroom
      for (const teacher of classroom.teachers) {
        if (!teacher.name?.trim()) continue;

        const loginCode = generateLoginCode();
        const passwordHash = hashLoginCode(loginCode);

        const { data: createdTeacher, error: teacherError } = await supabase
          .from('montree_teachers')
          .insert({
            school_id: school.id,
            classroom_id: createdClassroom.id,
            name: teacher.name.trim(),
            email: teacher.email?.trim() || null,
            password_hash: passwordHash,
            role: 'teacher',
            is_active: true,
          })
          .select()
          .single();

        if (teacherError) {
          console.error('Teacher creation error:', teacherError);
          continue;
        }

        // Return teacher with login code (not stored, only returned once)
        createdTeachers.push({
          id: createdTeacher.id,
          name: createdTeacher.name,
          email: createdTeacher.email,
          login_code: loginCode, // Plain text - only shown once!
          classroom_id: createdClassroom.id,
          classroom_name: createdClassroom.name,
          classroom_icon: createdClassroom.icon,
        });
      }
    }

    return NextResponse.json({
      success: true,
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
      },
      classrooms: createdClassrooms,
      teachers: createdTeachers,
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
