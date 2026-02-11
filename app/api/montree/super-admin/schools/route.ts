// /api/montree/super-admin/schools/route.ts
// Session 105: Super Admin API - List all schools with stats
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Phase 9: Rate limiting
    try {
      const ip = getClientIP(request.headers);
      const { allowed, retryAfterSeconds } = await checkRateLimit(
        supabase, ip, '/api/montree/super-admin/schools', 10, 15
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
        );
      }
    } catch (e) {
      console.error('[Schools] Rate limit check failed (non-blocking):', e);
    }

    // Phase 9: Require super-admin auth for school listing
    const { searchParams } = new URL(request.url);
    const password = request.headers.get('x-super-admin-password') || searchParams.get('password');
    const { valid } = verifySuperAdminPassword(password);
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('montree_schools')
      .select('*')
      .order('created_at', { ascending: false });

    if (schoolsError) {
      console.error('Schools fetch error:', schoolsError);
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }

    // Fetch classroom counts per school
    const { data: classroomCounts } = await supabase
      .from('montree_classrooms')
      .select('school_id');

    // Fetch teacher counts per school
    const { data: teacherCounts } = await supabase
      .from('montree_teachers')
      .select('school_id');

    // Fetch student counts per school
    const { data: studentCounts } = await supabase
      .from('montree_children')
      .select('school_id');

    // Aggregate counts
    const schoolStats = (schools || []).map(school => {
      const classrooms = (classroomCounts || []).filter(c => c.school_id === school.id).length;
      const teachers = (teacherCounts || []).filter(t => t.school_id === school.id).length;
      const students = (studentCounts || []).filter(s => s.school_id === school.id).length;

      return {
        ...school,
        classroom_count: classrooms,
        teacher_count: teachers,
        student_count: students,
      };
    });

    return NextResponse.json({ schools: schoolStats });

  } catch (error) {
    console.error('Super admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update school status (subscription tier)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Phase 9 audit fix: Rate limiting on PATCH
    try {
      const ip = getClientIP(request.headers);
      const { allowed, retryAfterSeconds } = await checkRateLimit(
        supabase, ip, '/api/montree/super-admin/schools/patch', 10, 15
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
        );
      }
    } catch (e) {
      console.error('[Schools PATCH] Rate limit check failed (non-blocking):', e);
    }

    const body = await request.json();
    const { schoolId, subscription_tier, subscription_status, password } = body;

    // Phase 9: Timing-safe password verification
    const { valid: patchPasswordValid } = verifySuperAdminPassword(password);
    if (!patchPasswordValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (subscription_tier) updateData.subscription_tier = subscription_tier;
    if (subscription_status) updateData.subscription_status = subscription_status;

    const { data, error } = await supabase
      .from('montree_schools')
      .update(updateData)
      .eq('id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update school:', error);
      return NextResponse.json({ error: 'Failed to update school' }, { status: 500 });
    }

    return NextResponse.json({ school: data });

  } catch (error) {
    console.error('Update school error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a school and all its data
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Phase 9 audit fix: Rate limiting on DELETE (stricter: 5 per 15 min)
    try {
      const ip = getClientIP(request.headers);
      const { allowed, retryAfterSeconds } = await checkRateLimit(
        supabase, ip, '/api/montree/super-admin/schools/delete', 5, 15
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
        );
      }
    } catch (e) {
      console.error('[Schools DELETE] Rate limit check failed (non-blocking):', e);
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const password = request.headers.get('x-super-admin-password') || searchParams.get('password');

    // Phase 9: Timing-safe password verification
    const { valid: deletePasswordValid } = verifySuperAdminPassword(password);
    if (!deletePasswordValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    // Phase 8: Log school deletion BEFORE cascade (captures intent even if delete fails)
    logAudit(supabase, {
      adminIdentifier: 'super_admin',
      action: 'school_delete',
      resourceType: 'school',
      resourceId: schoolId,
      resourceDetails: { endpoint: '/api/montree/super-admin/schools' },
      ipAddress: getClientIP(request.headers),
      userAgent: getUserAgent(request.headers),
      isSensitive: true,
    });

    // Delete in order to respect foreign keys
    // 1. Delete student aliases
    await supabase.from('montree_student_aliases').delete().eq('school_id', schoolId);

    // 2. Delete children
    await supabase.from('montree_children').delete().eq('school_id', schoolId);

    // 3. Delete teachers
    await supabase.from('montree_teachers').delete().eq('school_id', schoolId);

    // 4. Delete curriculum imports
    await supabase.from('montree_curriculum_imports').delete().eq('school_id', schoolId);
    await supabase.from('montree_work_imports').delete().eq('school_id', schoolId);
    await supabase.from('montree_custom_curriculum').delete().eq('school_id', schoolId);

    // 5. Delete classrooms
    await supabase.from('montree_classrooms').delete().eq('school_id', schoolId);

    // 6. Delete school admins
    await supabase.from('montree_school_admins').delete().eq('school_id', schoolId);

    // 7. Finally delete the school
    const { error: schoolError } = await supabase
      .from('montree_schools')
      .delete()
      .eq('id', schoolId);

    if (schoolError) {
      console.error('Failed to delete school:', { message: schoolError.message, code: (schoolError as Record<string, unknown>).code });
      return NextResponse.json({ error: 'Failed to delete school' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete school error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
