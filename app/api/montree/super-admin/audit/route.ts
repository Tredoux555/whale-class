// /api/montree/super-admin/audit/route.ts
// Simple audit logging endpoint for super admin actions

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const { action, details, timestamp } = await request.json();

    // Log to database
    const { error } = await supabase
      .from('montree_super_admin_audit')
      .insert({
        admin_identifier: 'super_admin',
        action: action,
        resource_type: details?.resourceType || 'system',
        resource_id: details?.resourceId || null,
        resource_details: details,
        ip_address: ip,
        user_agent: userAgent,
        is_sensitive: details?.sensitive || false,
        requires_review: action === 'delete' || action === 'login_as',
      });

    if (error) {
      console.error('[Audit] Failed to log:', error);
      // Don't fail the request - audit logging shouldn't block operations
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Audit] Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// GET: Retrieve audit logs (for viewing history)
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const { data: logs, error } = await supabase
      .from('montree_super_admin_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error('[Audit] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
