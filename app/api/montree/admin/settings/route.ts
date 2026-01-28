// /api/montree/admin/settings/route.ts
// School settings - update school name, principal info, etc.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Get school settings
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

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
    const schoolId = request.headers.get('x-school-id');
    const principalId = request.headers.get('x-principal-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

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
      const principalUpdate: any = { updated_at: new Date().toISOString() };
      if (principal_name) principalUpdate.name = principal_name;
      if (principal_email) principalUpdate.email = principal_email;
      if (new_password) principalUpdate.password_hash = hashPassword(new_password);

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
