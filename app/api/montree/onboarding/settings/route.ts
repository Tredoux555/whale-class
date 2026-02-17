import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';

export async function GET() {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('montree_onboarding_settings')
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// Whitelist of allowed setting fields
const ALLOWED_FIELDS = [
  'enabled_for_teachers',
  'enabled_for_principals',
  'enabled_for_parents',
  'enabled_for_homeschool_parents',
] as const;

export async function PATCH(request: NextRequest) {
  const supabase = getSupabase();

  // Phase 9: Timing-safe password verification
  const password = request.headers.get('x-super-admin-password');
  const { valid } = verifySuperAdminPassword(password);
  if (!valid) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    // Only allow whitelisted fields (prevent mass-assignment)
    const sanitized: Record<string, boolean> = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body && typeof body[field] === 'boolean') {
        sanitized[field] = body[field];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('montree_onboarding_settings')
      .update({
        ...sanitized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, settings: data });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
