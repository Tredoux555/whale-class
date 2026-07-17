// /api/montree/onboarding/route.ts
// Session 105: Real onboarding API - saves to Supabase
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { legacySha256 } from '@/lib/montree/password';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getLocationFromRequest } from '@/lib/ip-geolocation';
import { DEFAULTS } from '@/lib/montree/constants';
import { generateSecureCode } from '@/lib/montree/secure-code';

// Generate URL-friendly slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Generate crypto-safe 6-character login code (no confusing chars)
function generateLoginCode(): string {
  return generateSecureCode();
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
    const rateLimitError = await checkRateLimit(request, 'onboarding', 10, 60);
    if (rateLimitError) return rateLimitError;

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
      .maybeSingle();

    if (existingSchool) {
      return NextResponse.json({ error: 'A school with this name already exists' }, { status: 400 });
    }

    // Capture signup location (non-blocking — has 5s timeout)
    const location = await getLocationFromRequest(request).catch(() => ({
      country: null, countryCode: null, city: null, region: null, timezone: null, ip: null,
    }));

    // 🚨 Launch pricing (Jul 6 2026 — plan amendment A1): stamp trial_ends_at
    // on every 'trialing' school so the tier resolver's trial branch reads a
    // real end date (future → Sonnet Premium trial) instead of falling to the
    // Haiku NULL-legacy floor. DEFAULTS.TRIAL_DAYS (= 7) is the single source.
    const trialEndsAt = new Date(Date.now() + DEFAULTS.TRIAL_DAYS * 24 * 60 * 60 * 1000);

    // 1. Create school
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .insert({
        name: schoolName.trim(),
        slug,
        owner_email: ownerEmail.trim(),
        owner_name: ownerName?.trim() || null,
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
        plan_type: 'school',
        subscription_tier: 'free',
        is_active: true,
        signup_country: location.country,
        signup_country_code: location.countryCode,
        signup_city: location.city,
        signup_region: location.region,
        signup_timezone: location.timezone,
        signup_ip: location.ip,
      })
      .select()
      .single();

    if (schoolError) {
      console.error('School creation error:', schoolError);
      return NextResponse.json({ error: 'Failed to create school' }, { status: 500 });
    }

    const createdClassrooms: Record<string, unknown>[] = [];
    const createdTeachers: Record<string, unknown>[] = [];

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
        const passwordHash = legacySha256(loginCode);

        const { data: createdTeacher, error: teacherError } = await supabase
          .from('montree_teachers')
          .insert({
            school_id: school.id,
            classroom_id: createdClassroom.id,
            name: teacher.name.trim(),
            email: teacher.email?.trim() || null,
            password_hash: passwordHash,
            login_code: loginCode,
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
