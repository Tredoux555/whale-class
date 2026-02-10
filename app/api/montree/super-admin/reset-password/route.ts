// /api/montree/super-admin/reset-password/route.ts
// Developer tool: Reset principal password from super admin
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { hashPassword } from '@/lib/montree/password';
import { validatePassword } from '@/lib/password-policy';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { schoolId, newPassword, adminPassword } = await request.json();

    // Verify super admin password
    if (adminPassword !== process.env.SUPER_ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
    }

    if (!schoolId || !newPassword) {
      return NextResponse.json({ error: 'School ID and new password required' }, { status: 400 });
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { error: `Password does not meet requirements: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

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
