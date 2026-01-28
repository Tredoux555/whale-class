// /api/montree/super-admin/reset-password/route.ts
// Developer tool: Reset principal password from super admin
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

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { schoolId, newPassword, adminPassword } = await request.json();

    // Verify super admin password
    if (adminPassword !== '870602') {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    if (!schoolId || !newPassword) {
      return NextResponse.json({ error: 'School ID and new password required' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const passwordHash = hashPassword(newPassword);

    // Update the principal's password
    const { data, error } = await supabase
      .from('montree_school_admins')
      .update({ password_hash: passwordHash })
      .eq('school_id', schoolId)
      .eq('role', 'owner')
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Password reset for ${data.email}`,
      email: data.email,
    });

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
