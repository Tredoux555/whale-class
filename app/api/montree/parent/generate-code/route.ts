// /api/montree/parent/generate-code/route.ts
// Generate access code for parent to link to child
// Called by teacher from student detail page
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { child_id } = await request.json();
    
    if (!child_id) {
      return NextResponse.json({ success: false, error: 'Child ID required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Verify child exists
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name')
      .eq('id', child_id)
      .single();

    if (childError || !child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    // Generate unique 8-character code
    const code = generateAccessCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Code valid for 7 days

    // Create access code
    const { data: accessCode, error: codeError } = await supabase
      .from('parent_access_codes')
      .insert({
        code,
        child_id,
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select()
      .single();

    if (codeError) {
      console.error('Code generation error:', codeError);
      return NextResponse.json({ success: false, error: 'Failed to generate code' }, { status: 500 });
    }

    // Generate QR code URL (using a free QR service)
    const parentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://teacherpotato.xyz'}/montree/parent?code=${code}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(parentUrl)}`;

    return NextResponse.json({
      success: true,
      code,
      qr_url: qrUrl,
      parent_url: parentUrl,
      expires_at: expiresAt.toISOString(),
      child_name: child.name,
    });

  } catch (error) {
    console.error('Generate code error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

function generateAccessCode(): string {
  // Generate 8-character alphanumeric code (no ambiguous chars like 0/O, 1/I/L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
