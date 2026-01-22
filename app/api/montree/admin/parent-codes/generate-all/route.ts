// /api/montree/admin/parent-codes/generate-all/route.ts
// Generate access codes for all children who don't have one
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function generateAccessCode(): string {
  // Generate 8-character alphanumeric code (no ambiguous chars like 0/O, 1/I/L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get all children
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name');

    if (childrenError) {
      return NextResponse.json({ success: false, error: childrenError.message }, { status: 500 });
    }

    // Get existing valid codes
    const { data: existingCodes } = await supabase
      .from('parent_access_codes')
      .select('child_id')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString());

    const childrenWithCodes = new Set((existingCodes || []).map(c => c.child_id));

    // Find children without codes
    const childrenNeedingCodes = (children || []).filter(c => !childrenWithCodes.has(c.id));

    if (childrenNeedingCodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All children already have access codes',
        generated: 0,
      });
    }

    // Generate codes for each child
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year expiry

    const newCodes = childrenNeedingCodes.map(child => ({
      code: generateAccessCode(),
      child_id: child.id,
      expires_at: expiresAt.toISOString(),
      used: false,
    }));

    // Insert all codes
    const { error: insertError } = await supabase
      .from('parent_access_codes')
      .insert(newCodes);

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${newCodes.length} new access codes`,
      generated: newCodes.length,
    });

  } catch (error) {
    console.error('Generate all codes error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
