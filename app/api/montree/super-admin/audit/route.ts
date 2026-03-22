// /api/montree/super-admin/audit/route.ts
// Phase 9: Added super-admin auth to both GET and POST
// Previously completely unauthenticated — anyone could read/write audit logs

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { checkRateLimit } from '@/lib/rate-limiter';

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

    // Allow login-related audit events without auth (they happen before/during auth)
    const AUTH_EXEMPT_ACTIONS = ['login_failed', 'login_success', 'session_timeout'];
    if (!AUTH_EXEMPT_ACTIONS.includes(action)) {
      const { valid } = await verifySuperAdminAuth(request.headers);
      if (!valid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

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

  // Phase 9: Rate limiting on audit reads
  try {
    const ip = getClientIP(request);
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/super-admin/audit', 10, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }
  } catch (e) {
    console.error('[Audit] Rate limit check failed (non-blocking):', e);
  }

  // Phase 9→10: Require super-admin auth for audit reads (JWT token or password fallback)
  const { valid: getValid } = await verifySuperAdminAuth(request.headers);
  if (!getValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500);

  try {
    const { data: logs, error } = await supabase
      .from('montree_super_admin_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[Audit] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] });
  } catch (error) {
    console.error('[Audit] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
