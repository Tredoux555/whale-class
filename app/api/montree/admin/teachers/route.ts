// /api/montree/admin/teachers/route.ts
// CRUD for teachers + code regeneration
//
// 🚨 AUTHORITY (audit fix Aug 2026): the mutating verbs here MINT credentials — POST issues a
// teacher login code, PATCH {regenerate_code} rewrites both login_code AND password_hash. They
// used to run for ANY authenticated session in the school (a teacher, an assistant, even a
// homeschool-parent role could regenerate a colleague's code and silently reset their password).
// Every mutating branch now requires a PRINCIPAL session. GET (the roster read the teacher-
// management page needs) stays open to any school session. An org director acting through a
// school carries role 'principal' (enter-school mints a principal token), so God's-Eye writes
// pass this gate exactly like a real principal's — that is intended.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest, type VerifiedRequest } from '@/lib/montree/verify-request';
import { legacySha256 } from '@/lib/montree/password';
import { MINIMAL_DEFAULT_MENU } from '@/lib/montree/menu/config';
import { generateSecureCode } from '@/lib/montree/secure-code';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';

function generateLoginCode(): string {
  // Crypto-safe 6-char credential (no 0/O/1/I).
  return generateSecureCode();
}

/** Credentials in the body — never let a proxy or the browser cache them. */
const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;

/**
 * Require a principal session. Returns the verified request on success, or a NextResponse to
 * send straight back (401 unauthenticated, 403 wrong role). Kept tiny and local — the three
 * mutating verbs share it, GET does not use it.
 */
function requirePrincipal(auth: VerifiedRequest | NextResponse): VerifiedRequest | NextResponse {
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Only a principal can manage teachers.', code: 'not_principal' },
      { status: 403 },
    );
  }
  return auth;
}

// List teachers for school
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const schoolId = auth.schoolId;

    // Get teachers directly (simpler query, matches overview API)
    const { data: teachers, error } = await supabase
      .from('montree_teachers')
      .select('id, name, email, classroom_id, is_active, created_at')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Get classrooms to map names
    const { data: classrooms } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    const classroomMap = new Map((classrooms || []).map(c => [c.id, c]));

    // Transform to include classroom info
    const transformedTeachers = (teachers || []).map(t => {
      const classroom = t.classroom_id ? classroomMap.get(t.classroom_id) : null;
      return {
        id: t.id,
        name: t.name,
        email: t.email,
        is_active: t.is_active,
        created_at: t.created_at,
        classrooms: classroom ? [classroom] : []
      };
    });

    return NextResponse.json({ teachers: transformedTeachers }, {
      headers: { 'Cache-Control': 'private, max-age=120, stale-while-revalidate=300' }
    });
  } catch (error) {
    console.error('List teachers error:', error);
    return NextResponse.json({ error: 'Failed to list teachers' }, { status: 500 });
  }
}

// Create new teacher
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const gated = requirePrincipal(await verifySchoolRequest(request));
    if (gated instanceof NextResponse) return gated;
    const auth = gated;

    const schoolId = auth.schoolId;

    const { name, email, classroom_id } = await request.json();
    
    const loginCode = generateLoginCode();
    const passwordHash = legacySha256(loginCode);

    const { data: teacher, error } = await supabase
      .from('montree_teachers')
      .insert({
        school_id: schoolId,
        classroom_id,
        name,
        email: email || null,
        password_hash: passwordHash,
        login_code: loginCode.toUpperCase(),
        role: 'teacher',
        is_active: true,
        // Seed the minimal default menu (Wrap Up / Parent Manager / Notes /
        // Guru / Manage Students) — Jul 3 2026 menu cleanup.
        settings: { menu: MINIMAL_DEFAULT_MENU },
      })
      .select()
      .single();

    if (error) throw error;

    await logAudit(supabase, {
      adminIdentifier: auth.userId,
      action: 'teacher_created',
      resourceType: 'teacher',
      resourceId: teacher?.id,
      resourceDetails: { schoolId, actingOrgAdminId: auth.actingOrgAdminId || undefined },
      ipAddress: getClientIP(request.headers),
      userAgent: getUserAgent(request.headers),
      isSensitive: true,
    });

    // Return with plaintext code (only shown once!) — no-store, it is a live credential.
    return NextResponse.json(
      { success: true, teacher: { ...teacher, login_code: loginCode } },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}

// Update teacher
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const gated = requirePrincipal(await verifySchoolRequest(request));
    if (gated instanceof NextResponse) return gated;
    const auth = gated;

    const schoolId = auth.schoolId;

    const { id, name, email, classroom_id, is_active, role, regenerate_code } = await request.json();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (classroom_id !== undefined) updateData.classroom_id = classroom_id;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (role !== undefined && ['lead_teacher', 'teacher', 'assistant_teacher'].includes(role)) updateData.role = role;

    let newCode: string | null = null;
    if (regenerate_code) {
      newCode = generateLoginCode();
      updateData.password_hash = legacySha256(newCode);
      updateData.login_code = newCode.toUpperCase();
    }

    const { data: teacher, error } = await supabase
      .from('montree_teachers')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;

    // A regenerated code is a live credential: audit it isSensitive and mark the response
    // no-store. An ordinary field edit (name/role/classroom) is neither.
    if (newCode) {
      await logAudit(supabase, {
        adminIdentifier: auth.userId,
        action: 'teacher_code_regenerated',
        resourceType: 'teacher',
        resourceId: id,
        resourceDetails: { schoolId, actingOrgAdminId: auth.actingOrgAdminId || undefined },
        ipAddress: getClientIP(request.headers),
        userAgent: getUserAgent(request.headers),
        isSensitive: true,
      });
    }

    return NextResponse.json(
      {
        success: true,
        teacher,
        new_login_code: newCode, // Only returned if regenerated
      },
      newCode ? { headers: NO_STORE } : undefined,
    );
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
  }
}

// Delete (soft delete) teacher
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const gated = requirePrincipal(await verifySchoolRequest(request));
    if (gated instanceof NextResponse) return gated;
    const auth = gated;

    const schoolId = auth.schoolId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Teacher ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('montree_teachers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 });
  }
}
