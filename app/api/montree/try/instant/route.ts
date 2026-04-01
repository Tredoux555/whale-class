// /api/montree/try/instant/route.ts
// Zero-friction instant trial - generates account + code in one shot

import { NextRequest, NextResponse } from 'next/server';
import { legacySha256 } from '@/lib/montree/password';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks, loadCurriculumAreas } from '@/lib/montree/curriculum-loader';
import { createMontreeToken, setMontreeAuthCookie } from '@/lib/montree/server-auth';
import { getLocationFromRequest } from '@/lib/ip-geolocation';

/**
 * Seed full Montessori curriculum for a new classroom
 * Non-blocking: failures here don't prevent trial creation
 */
async function seedCurriculumForClassroom(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string
): Promise<{ success: boolean; worksCount: number }> {
  try {
    // Create curriculum areas
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
      console.error('[Trial] Area seed error:', areaError.message);
      return { success: false, worksCount: 0 };
    }

    const areaMap: Record<string, string> = {};
    for (const area of insertedAreas || []) {
      areaMap[area.area_key] = area.id;
    }

    // Load and insert all works with descriptions
    const allWorks = loadAllCurriculumWorks();
    const worksToInsert = allWorks.map(work => {
      const areaUuid = areaMap[work.area_key];
      if (!areaUuid) return null;
      return {
        classroom_id: classroomId,
        area_id: areaUuid,
        work_key: work.work_key,
        name: work.name,
        description: work.description || null,
        age_range: work.age_range || '3-6',
        sequence: work.sequence,
        is_active: true,
        materials: work.materials || [],
        direct_aims: work.direct_aims || [],
        indirect_aims: work.indirect_aims || [],
        control_of_error: work.control_of_error || null,
        prerequisites: work.prerequisites || [],
        quick_guide: work.quick_guide || null,
        presentation_steps: work.presentation_steps || [],
        parent_description: work.parent_description || null,
        why_it_matters: work.why_it_matters || null,
      };
    }).filter(Boolean);

    // Insert in batches
    const BATCH_SIZE = 50;
    let count = 0;
    for (let i = 0; i < worksToInsert.length; i += BATCH_SIZE) {
      const batch = worksToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('montree_classroom_curriculum_works')
        .insert(batch);
      if (!error) count += batch.length;
    }

    return { success: true, worksCount: count };
  } catch (err) {
    console.error('[Trial] Curriculum seed error:', err);
    return { success: false, worksCount: 0 };
  }
}

// Same charset as existing teacher codes - no confusing chars
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function generateSlug(baseName: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomSuffix}`;
}

export async function POST(req: NextRequest) {
  // Diagnostic: track each step
  const steps: string[] = [];

  try {
    steps.push('1-init');
    const supabase = getSupabase();
    const { role, name, schoolName, email } = await req.json();

    if (!role || !['teacher', 'principal', 'homeschool_parent'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Use provided names or fall back to defaults
    const userName = (name && name.trim()) || (role === 'principal' ? 'Principal' : role === 'homeschool_parent' ? 'Parent' : 'Teacher');
    const userSchoolName = (schoolName && schoolName.trim()) || `Trial ${role === 'principal' ? 'School' : role === 'homeschool_parent' ? 'Homeschool' : 'Classroom'}`;

    const code = generateCode();
    const codeHash = legacySha256(code.toUpperCase());
    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // ── Step 1: Create trial school ──
    steps.push('2-school');
    const schoolSlug = generateSlug(`trial-${role}-${code}`);
    const planType = role === 'principal' ? 'school' : role === 'homeschool_parent' ? 'homeschool' : 'personal_classroom';
    const { data: school, error: schoolErr } = await supabase
      .from('montree_schools')
      .insert({
        name: userSchoolName,
        slug: schoolSlug,
        owner_email: email?.trim() || `trial-${code.toLowerCase()}@montree.app`,
        owner_name: userName,
        subscription_status: 'trialing',
        plan_type: planType,
        subscription_tier: 'trial',
        is_active: true,
        trial_ends_at: trialEndsAt.toISOString(),
        max_students: role === 'homeschool_parent' ? 10 : 30,
      })
      .select()
      .single();

    if (schoolErr || !school) {
      console.error('SCHOOL FAIL:', schoolErr?.message, schoolErr?.code, schoolErr?.details);
      return NextResponse.json({
        error: 'School creation failed',
      }, { status: 500 });
    }
    steps.push('2-school-ok:' + school.id);

    // ── Step 1b: Capture signup location (non-blocking analytics) ──
    try {
      steps.push('2b-location');
      const location = await getLocationFromRequest(req);
      if (location.country) {
        await supabase
          .from('montree_schools')
          .update({
            signup_country: location.country,
            signup_country_code: location.countryCode,
            signup_city: location.city,
            signup_region: location.region,
            signup_ip: location.ip,
            signup_timezone: location.timezone,
          })
          .eq('id', school.id);
        steps.push(`2b-location-ok:${location.city || 'unknown'},${location.country}`);
      } else {
        steps.push('2b-location-skip');
      }
    } catch (locErr) {
      // Non-critical: don't fail signup if geolocation fails
      const message = locErr instanceof Error ? locErr.message : String(locErr);
      steps.push('2b-location-fail:' + message);
    }

    // ── Step 2: Create classroom (teachers + homeschool only — principals create their own) ──
    let classroom: Record<string, unknown> | null = null;
    if (role !== 'principal') {
      steps.push('3-classroom');
      const classroomName = role === 'homeschool_parent' ? 'My Home' : 'My Classroom';
      const { data: classroomData, error: classroomErr } = await supabase
        .from('montree_classrooms')
        .insert({ name: classroomName, school_id: school.id })
        .select()
        .single();

      classroom = classroomData;

      if (classroomErr) {
        console.error('CLASSROOM FAIL:', JSON.stringify(classroomErr));
        steps.push('3-classroom-fail:' + classroomErr.message);
      } else {
        steps.push('3-classroom-ok');
      }

      // ── Step 2b: Seed curriculum for classroom (non-blocking) ──
      if (classroom?.id) {
        steps.push('3b-curriculum');
        const seedResult = await seedCurriculumForClassroom(supabase, classroom.id as string);
        if (seedResult.success) {
          steps.push(`3b-curriculum-ok:${seedResult.worksCount}`);
        } else {
          steps.push('3b-curriculum-fail');
        }
      }
    } else {
      steps.push('3-classroom-skip-principal');
    }

    // ── Step 3: Create user account ──
    if (role === 'homeschool_parent') {
      // ── Homeschool parent flow — identical to teacher, same table, same response ──
      steps.push('4-homeschool-parent');
      const { data: teacher, error: teacherErr } = await supabase
        .from('montree_teachers')
        .insert({
          name: userName,
          school_id: school.id,
          classroom_id: (classroom?.id as string) || null,
          password_hash: codeHash,
          login_code: code.toUpperCase(),
          email: email?.trim() || null,
          role: 'homeschool_parent',
        })
        .select()
        .single();

      if (teacherErr || !teacher) {
        console.error('HOMESCHOOL TEACHER FAIL:', teacherErr?.message, teacherErr?.code, teacherErr?.details);
        await supabase.from('montree_schools').delete().eq('id', school.id);
        return NextResponse.json({
          error: 'Account creation failed',
        }, { status: 500 });
      }
      steps.push('4-homeschool-parent-ok:' + teacher.id);

      // Lead record (non-blocking)
      try {
        await supabase.from('montree_leads').insert({
          role: 'homeschool_parent',
          interest_type: 'try',
          status: 'new',
          name: userName,
          email: email?.trim() || null,
          school_name: userSchoolName,
          notes: `Homeschool trial - Code: ${code}\nParent: ${userName}\nSchool: ${userSchoolName} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        steps.push('5-lead-fail:' + message);
      }

      // Issue signed JWT token — homeschool_parent role, 30-day TTL
      const token = await createMontreeToken({
        sub: teacher.id as string,
        schoolId: (school?.id || teacher.school_id) as string,
        classroomId: (classroom?.id || teacher.classroom_id) as string,
        role: 'homeschool_parent',
      });

      // Same response shape as teacher — dashboard handles the rest
      const response = NextResponse.json({
        success: true,
        code,
        token,
        role: 'homeschool_parent',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email || null,
          password_set_at: teacher.password_set_at || null,
        },
        classroom: classroom ? {
          id: classroom.id,
          name: classroom.name,
          icon: classroom.icon || null,
          color: classroom.color || null,
        } : null,
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
        },
        onboarded: false, // needs to add children first, same as teacher
        userId: teacher.id as string,
      });
      setMontreeAuthCookie(response, token, 'homeschool_parent');
      return response;

    } else if (role === 'teacher') {
      steps.push('4-teacher');
      const { data: teacher, error: teacherErr } = await supabase
        .from('montree_teachers')
        .insert({
          name: userName,
          school_id: school.id,
          classroom_id: (classroom?.id as string) || null,
          password_hash: codeHash,
          login_code: code.toUpperCase(),
          email: email?.trim() || null,
        })
        .select()
        .single();

      if (teacherErr || !teacher) {
        console.error('TEACHER FAIL:', teacherErr?.message, teacherErr?.code, teacherErr?.details);
        await supabase.from('montree_schools').delete().eq('id', school.id);
        return NextResponse.json({
          error: 'Teacher creation failed',
        }, { status: 500 });
      }
      steps.push('4-teacher-ok:' + teacher.id);

      // Lead record (non-blocking)
      try {
        await supabase.from('montree_leads').insert({
          role,
          interest_type: 'try',
          status: 'new',
          name: userName,
          email: email?.trim() || null,
          school_name: userSchoolName,
          notes: `Instant trial - Code: ${code}\nName: ${userName}\nTeacher ID: ${teacher.id}\nSchool: ${userSchoolName} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        steps.push('5-lead-fail:' + message);
      }

      // Issue signed JWT token for instant login
      const token = await createMontreeToken({
        sub: teacher.id,
        schoolId: school.id,
        classroomId: (classroom?.id as string) || undefined,
        role: 'teacher',
      });

      const response = NextResponse.json({
        success: true,
        code,
        token,
        role: 'teacher',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email || null,
          password_set_at: null,
        },
        classroom: classroom ? {
          id: classroom.id as string,
          name: classroom.name as string,
          icon: classroom.icon as string,
          color: classroom.color as string,
        } : null,
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
        },
        onboarded: false,
        userId: teacher.id,
      });
      setMontreeAuthCookie(response, token);
      return response;

    } else {
      // Principal
      steps.push('4-principal');
      const { data: principal, error: principalErr } = await supabase
        .from('montree_school_admins')
        .insert({
          school_id: school.id,
          email: email?.trim() || `trial-${code.toLowerCase()}@montree.app`,
          password_hash: codeHash,
          name: userName,
          role: 'principal',
        })
        .select()
        .single();

      if (principalErr || !principal) {
        console.error('PRINCIPAL FAIL:', principalErr?.message, principalErr?.code, principalErr?.details);
        await supabase.from('montree_schools').delete().eq('id', school.id);
        return NextResponse.json({
          error: 'Principal creation failed',
        }, { status: 500 });
      }
      steps.push('4-principal-ok:' + principal.id);

      // Lead record (non-blocking)
      try {
        await supabase.from('montree_leads').insert({
          role,
          interest_type: 'try',
          status: 'new',
          name: userName,
          email: email?.trim() || null,
          school_name: userSchoolName,
          notes: `Instant trial - Code: ${code}\nName: ${userName}\nPrincipal ID: ${principal.id}\nSchool: ${userSchoolName} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        steps.push('5-lead-fail:' + message);
      }

      // Issue signed JWT token for instant login
      const token = await createMontreeToken({
        sub: principal.id,
        schoolId: school.id,
        role: 'principal',
      });

      const response = NextResponse.json({
        success: true,
        code,
        token,
        role: 'principal',
        principal: {
          id: principal.id,
          name: principal.name,
          email: principal.email,
          role: principal.role,
        },
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
          subscription_status: school.subscription_status || 'trialing',
          plan_type: school.plan_type || 'school',
          trial_ends_at: school.trial_ends_at || trialEndsAt.toISOString(),
        },
        userId: principal.id,
      });
      setMontreeAuthCookie(response, token);
      return response;
    }

  } catch (err: unknown) {
    console.error('INSTANT TRIAL CRASH:', err, 'Steps:', steps);
    return NextResponse.json({
      error: 'Unexpected error',
    }, { status: 500 });
  }
}
