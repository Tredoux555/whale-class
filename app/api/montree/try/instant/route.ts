// /api/montree/try/instant/route.ts
// Zero-friction instant trial - generates account + code in one shot

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase-client';
import { loadAllCurriculumWorks, loadCurriculumAreas } from '@/lib/montree/curriculum-loader';

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

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
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
    const { role, name, schoolName } = await req.json();

    if (!role || !['teacher', 'principal'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Use provided names or fall back to defaults
    const userName = (name && name.trim()) || (role === 'principal' ? 'Principal' : 'Teacher');
    const userSchoolName = (schoolName && schoolName.trim()) || `Trial ${role === 'principal' ? 'School' : 'Classroom'}`;

    const code = generateCode();
    const codeHash = hashCode(code);
    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // ── Step 1: Create trial school ──
    steps.push('2-school');
    const schoolSlug = generateSlug(`trial-${role}-${code}`);
    const { data: school, error: schoolErr } = await supabase
      .from('montree_schools')
      .insert({
        name: userSchoolName,
        slug: schoolSlug,
        owner_email: `trial-${code.toLowerCase()}@montree.app`,
        owner_name: userName,
        subscription_status: 'trialing',
        plan_type: role === 'principal' ? 'school' : 'personal_classroom',
        subscription_tier: 'trial',
        is_active: true,
        trial_ends_at: trialEndsAt.toISOString(),
        max_students: 30,
      })
      .select()
      .single();

    if (schoolErr || !school) {
      const errDetail = schoolErr ? {
        message: schoolErr.message,
        code: schoolErr.code,
        details: schoolErr.details,
        hint: schoolErr.hint,
      } : 'no data returned';
      console.error('SCHOOL FAIL:', JSON.stringify(errDetail, null, 2));
      return NextResponse.json({
        error: 'School creation failed',
        debug: errDetail,
        steps,
      }, { status: 500 });
    }
    steps.push('2-school-ok:' + school.id);

    // ── Step 2: Create classroom ──
    steps.push('3-classroom');
    const { data: classroom, error: classroomErr } = await supabase
      .from('montree_classrooms')
      .insert({ name: 'My Classroom', school_id: school.id })
      .select()
      .single();

    if (classroomErr) {
      console.error('CLASSROOM FAIL:', JSON.stringify(classroomErr));
      steps.push('3-classroom-fail:' + classroomErr.message);
    } else {
      steps.push('3-classroom-ok');
    }

    // ── Step 2b: Seed curriculum for classroom (non-blocking) ──
    if (classroom?.id) {
      steps.push('3b-curriculum');
      const seedResult = await seedCurriculumForClassroom(supabase, classroom.id);
      if (seedResult.success) {
        steps.push(`3b-curriculum-ok:${seedResult.worksCount}`);
      } else {
        steps.push('3b-curriculum-fail');
      }
    }

    // ── Step 3: Create user account ──
    if (role === 'teacher') {
      steps.push('4-teacher');
      const { data: teacher, error: teacherErr } = await supabase
        .from('montree_teachers')
        .insert({
          name: userName,
          school_id: school.id,
          classroom_id: classroom?.id || null,
          password_hash: codeHash,
        })
        .select()
        .single();

      if (teacherErr || !teacher) {
        const errDetail = teacherErr ? {
          message: teacherErr.message,
          code: teacherErr.code,
          details: teacherErr.details,
          hint: teacherErr.hint,
        } : 'no data returned';
        console.error('TEACHER FAIL:', JSON.stringify(errDetail, null, 2));
        await supabase.from('montree_schools').delete().eq('id', school.id);
        return NextResponse.json({
          error: 'Teacher creation failed',
          debug: errDetail,
          steps,
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
          school_name: userSchoolName,
          notes: `Instant trial - Code: ${code}\nName: ${userName}\nTeacher ID: ${teacher.id}\nSchool: ${userSchoolName} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        steps.push('5-lead-fail:' + message);
      }

      return NextResponse.json({
        success: true,
        code,
        role: 'teacher',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email || null,
          password_set_at: null,
        },
        classroom: classroom ? {
          id: classroom.id,
          name: classroom.name,
          icon: classroom.icon,
          color: classroom.color,
        } : null,
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
        },
        onboarded: false,
        userId: teacher.id,
      });

    } else {
      // Principal
      steps.push('4-principal');
      const { data: principal, error: principalErr } = await supabase
        .from('montree_school_admins')
        .insert({
          school_id: school.id,
          email: `trial-${code.toLowerCase()}@montree.app`,
          password_hash: codeHash,
          name: userName,
          role: 'principal',
        })
        .select()
        .single();

      if (principalErr || !principal) {
        const errDetail = principalErr ? {
          message: principalErr.message,
          code: principalErr.code,
          details: principalErr.details,
          hint: principalErr.hint,
        } : 'no data returned';
        console.error('PRINCIPAL FAIL:', JSON.stringify(errDetail, null, 2));
        await supabase.from('montree_schools').delete().eq('id', school.id);
        return NextResponse.json({
          error: 'Principal creation failed',
          debug: errDetail,
          steps,
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
          school_name: userSchoolName,
          notes: `Instant trial - Code: ${code}\nName: ${userName}\nPrincipal ID: ${principal.id}\nSchool: ${userSchoolName} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        steps.push('5-lead-fail:' + message);
      }

      return NextResponse.json({
        success: true,
        code,
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
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.name : undefined;
    const cause = err instanceof Error && err.cause ? String(err.cause) : undefined;
    const stack = err instanceof Error && err.stack ? err.stack.split('\n').slice(0, 5) : undefined;
    console.error('INSTANT TRIAL CRASH:', err);
    return NextResponse.json({
      error: 'Unexpected error',
      debug: {
        message: message || String(err),
        name,
        cause,
        stack,
      },
      steps,
    }, { status: 500 });
  }
}
