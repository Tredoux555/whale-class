// /api/montree/try/instant/route.ts
// Zero-friction instant trial - generates account + code in one shot

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(`Missing env vars: URL=${!!url}, KEY=${!!key}`);
  }
  return createClient(url, key);
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
    const { role } = await req.json();

    if (!role || !['teacher', 'principal'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const code = generateCode();
    const codeHash = hashCode(code);
    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // ── Step 1: Create trial school ──
    steps.push('2-school');
    const schoolSlug = generateSlug(`trial-${role}-${code}`);
    const { data: school, error: schoolErr } = await supabase
      .from('montree_schools')
      .insert({
        name: `Trial ${role === 'principal' ? 'School' : 'Classroom'}`,
        slug: schoolSlug,
        owner_email: `trial-${code.toLowerCase()}@montree.app`,
        owner_name: role === 'principal' ? 'Principal' : 'Teacher',
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

    // ── Step 3: Create user account ──
    if (role === 'teacher') {
      steps.push('4-teacher');
      const { data: teacher, error: teacherErr } = await supabase
        .from('montree_teachers')
        .insert({
          name: 'Teacher',
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
          notes: `Instant trial - Code: ${code}\nTeacher ID: ${teacher.id}\nSchool: ${school.name} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: any) {
        steps.push('5-lead-fail:' + e?.message);
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
          name: 'Principal',
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
          notes: `Instant trial - Code: ${code}\nPrincipal ID: ${principal.id}\nSchool: ${school.name} (${school.id})`,
        });
        steps.push('5-lead-ok');
      } catch (e: any) {
        steps.push('5-lead-fail:' + e?.message);
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

  } catch (err: any) {
    console.error('INSTANT TRIAL CRASH:', err);
    return NextResponse.json({
      error: 'Unexpected error',
      debug: {
        message: err?.message || String(err),
        name: err?.name,
        cause: err?.cause ? String(err.cause) : undefined,
        stack: err?.stack?.split('\n').slice(0, 5),
      },
      steps,
    }, { status: 500 });
  }
}
