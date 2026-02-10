// /api/montree/admin/settings/route.ts
// School settings - update school name, principal info, etc.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { hashPassword } from '@/lib/montree/password';

// Get school settings
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const schoolId = auth.schoolId;

    const { data: school, error } = await supabase
      .from('montree_schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (error) throw error;

    const { data: principal } = await supabase
      .from('montree_school_admins')
      .select('id, name, email, role')
      .eq('school_id', schoolId)
      .eq('role', 'principal')
      .single();

    return NextResponse.json({ school, principal });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// Update school settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const schoolId = auth.schoolId;
    const principalId = request.headers.get('x-principal-id');

    const body = await request.json();
    const { school_name, principal_name, principal_email, new_password } = body;

    // Update school if name changed
    if (school_name) {
      const { error: schoolError } = await supabase
        .from('montree_schools')
        .update({ 
          name: school_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', schoolId);

      if (schoolError) throw schoolError;
    }

    // Update principal if info changed
    if (principalId && (principal_name || principal_email || new_password)) {
      const principalUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (principal_name) principalUpdate.name = principal_name;
      if (principal_email) principalUpdate.email = principal_email;
      if (new_password) principalUpdate.password_hash = await hashPassword(new_password);

      const { error: principalError } = await supabase
        .from('montree_school_admins')
        .update(principalUpdate)
        .eq('id', principalId)
        .eq('school_id', schoolId);

      if (principalError) throw principalError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
