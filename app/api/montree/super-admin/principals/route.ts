// /api/montree/super-admin/principals/route.ts
// Super-admin principal management for any school.
//
// Until this route, the only way to add or reset a principal was through the
// teacher-side /api/montree/invite-principal flow (which requires a teacher
// session) or by editing montree_school_admins by hand. This route exposes
// the same primitives — list, add, reset code, deactivate, delete — directly
// from the super-admin SchoolsTab.
//
// Architectural rules (from Session 84):
// - montree_school_admins now HAS a login_code column (Session 98 migration
//   194) — plain code stored alongside SHA-256 password_hash so super admin
//   can read codes back. Auth still goes through password_hash lookup.
// - The plain code is only ever returned in the JSON response — once shown,
//   it cannot be retrieved again.
// - The UNIQUE on the table is (school_id, email). Adding a principal with
//   the same email + school regenerates the code instead of erroring (matches
//   invite-principal semantics).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { legacySha256 } from '@/lib/montree/password';
import { generateSecureCode } from '@/lib/montree/secure-code';

export const maxDuration = 30;

// 6-char code, alphabet excludes I/O/0/1 (Session 84 invite-principal pattern).
function generateLoginCode(): string {
  return generateSecureCode();
}

const PRINCIPAL_FIELDS = 'id, school_id, email, name, role, is_active, last_login, created_at, updated_at';

// ---- GET ----
// /api/montree/super-admin/principals?school_id=<uuid>
// Returns the principal list for one school, OR all principals (no filter).
export async function GET(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabase();
    const schoolId = request.nextUrl.searchParams.get('school_id');

    let query = supabase
      .from('montree_school_admins')
      .select(PRINCIPAL_FIELDS)
      .eq('role', 'principal')
      .order('created_at', { ascending: false });

    if (schoolId) query = query.eq('school_id', schoolId);

    const { data, error } = await query;
    if (error) {
      console.error('[super-admin/principals GET] error:', error);
      return NextResponse.json({ error: 'Failed to load principals' }, { status: 500 });
    }

    return NextResponse.json({ principals: data || [] });
  } catch (err) {
    console.error('[super-admin/principals GET] exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ---- POST ----
// Create a new principal for a school. If (school_id, email) already exists,
// regenerate the code on the existing row (mirrors invite-principal).
// Body: { school_id, name, email }
// Returns: { principal: {...}, login_code: 'ABC123', reused_existing: bool }
export async function POST(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const schoolId = (body.school_id || '').trim();
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();

    if (!schoolId) return NextResponse.json({ error: 'school_id required' }, { status: 400 });
    if (!name || name.length < 2) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify school exists.
    const { data: school } = await supabase
      .from('montree_schools')
      .select('id')
      .eq('id', schoolId)
      .maybeSingle();
    if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

    // Check for existing (school_id, email) row — if found, regenerate code.
    const { data: existing } = await supabase
      .from('montree_school_admins')
      .select('id')
      .eq('school_id', schoolId)
      .eq('email', email)
      .eq('role', 'principal')
      .maybeSingle();

    const code = generateLoginCode();
    const codeHash = legacySha256(code);

    if (existing) {
      const { data: updated, error: updErr } = await supabase
        .from('montree_school_admins')
        .update({ name, login_code: code, password_hash: codeHash, is_active: true })
        .eq('id', existing.id)
        .select(PRINCIPAL_FIELDS)
        .single();
      if (updErr || !updated) {
        console.error('[super-admin/principals POST] update error:', updErr);
        return NextResponse.json({ error: 'Failed to update existing principal' }, { status: 500 });
      }
      return NextResponse.json({
        principal: updated,
        login_code: code,
        reused_existing: true,
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from('montree_school_admins')
      .insert({
        school_id: schoolId,
        email,
        name,
        login_code: code,
        password_hash: codeHash,
        role: 'principal',
        is_active: true,
      })
      .select(PRINCIPAL_FIELDS)
      .single();

    if (insErr || !inserted) {
      console.error('[super-admin/principals POST] insert error:', insErr);
      // Race: another super-admin inserted at the same moment.
      if (insErr && (insErr as { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'A principal with that email already exists for this school. Refresh and try again.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create principal' }, { status: 500 });
    }

    return NextResponse.json({
      principal: inserted,
      login_code: code,
      reused_existing: false,
    });
  } catch (err) {
    console.error('[super-admin/principals POST] exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ---- PATCH ----
// Body: { principal_id, action: 'reset_code' | 'deactivate' | 'activate' }
// reset_code → new code returned in response
// deactivate / activate → toggles is_active
export async function PATCH(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const principalId = (body.principal_id || '').trim();
    const action = body.action as 'reset_code' | 'deactivate' | 'activate' | undefined;

    if (!principalId) return NextResponse.json({ error: 'principal_id required' }, { status: 400 });
    if (!action || !['reset_code', 'deactivate', 'activate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = getSupabase();

    if (action === 'reset_code') {
      const code = generateLoginCode();
      const codeHash = legacySha256(code);
      const { data, error } = await supabase
        .from('montree_school_admins')
        .update({ login_code: code, password_hash: codeHash })
        .eq('id', principalId)
        .eq('role', 'principal')
        .select(PRINCIPAL_FIELDS)
        .single();
      if (error || !data) {
        console.error('[super-admin/principals PATCH reset_code] error:', error);
        return NextResponse.json({ error: 'Failed to reset code' }, { status: 500 });
      }
      return NextResponse.json({ principal: data, login_code: code });
    }

    // activate / deactivate
    const isActive = action === 'activate';
    const { data, error } = await supabase
      .from('montree_school_admins')
      .update({ is_active: isActive })
      .eq('id', principalId)
      .eq('role', 'principal')
      .select(PRINCIPAL_FIELDS)
      .single();
    if (error || !data) {
      console.error(`[super-admin/principals PATCH ${action}] error:`, error);
      return NextResponse.json({ error: 'Failed to update principal' }, { status: 500 });
    }
    return NextResponse.json({ principal: data });
  } catch (err) {
    console.error('[super-admin/principals PATCH] exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ---- DELETE ----
// /api/montree/super-admin/principals?id=<uuid>
// Hard delete. The principal-agent log rows reference principal_id but they
// don't enforce a foreign key (logging is best-effort), so deleting a row
// is safe. Use deactivate first if you want a soft-disable.
export async function DELETE(request: NextRequest) {
  try {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = getSupabase();
    const { error } = await supabase
      .from('montree_school_admins')
      .delete()
      .eq('id', id)
      .eq('role', 'principal');

    if (error) {
      console.error('[super-admin/principals DELETE] error:', error);
      return NextResponse.json({ error: 'Failed to delete principal' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[super-admin/principals DELETE] exception:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
