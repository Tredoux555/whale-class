// /api/montree/admin/parent-codes/route.ts
// List all parent access codes for children
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get all children with their access codes
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('id, name')
      .order('name');

    if (childrenError) {
      return NextResponse.json({ success: false, error: childrenError.message }, { status: 500 });
    }

    // Get all access codes
    const { data: codes, error: codesError } = await supabase
      .from('parent_access_codes')
      .select('*')
      .eq('used', false)
      .gt('expires_at', new Date().toISOString());

    if (codesError) {
      console.error('Codes error:', codesError);
    }

    // Map children to their codes
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://teacherpotato.xyz';
    
    const result = (children || []).map(child => {
      const code = (codes || []).find(c => c.child_id === child.id);
      const codeStr = code?.code || '';
      const parentUrl = codeStr ? `${baseUrl}/montree/parent?code=${codeStr}` : '';
      const qrUrl = codeStr ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(parentUrl)}` : '';

      return {
        child_id: child.id,
        child_name: child.name,
        code: codeStr,
        parent_url: parentUrl,
        qr_url: qrUrl,
        expires_at: code?.expires_at || null,
        used: code?.used || false,
      };
    });

    return NextResponse.json({
      success: true,
      codes: result,
    });

  } catch (error) {
    console.error('Parent codes API error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
