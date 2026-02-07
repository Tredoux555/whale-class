// /api/montree/super-admin/secure/route.ts
// Maximum security super admin API with full audit trail

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import {
  logAudit,
  validateSession,
  createSession,
  hashSessionToken,
  maskLoginCode,
  maskEmail,
  isIPAllowed,
  sendAlert,
  verifyTOTP,
} from '@/lib/montree/super-admin-security';

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

// ============================================
// AUTHENTICATION & SESSION
// ============================================

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const body = await request.json();
    const { action, password, totpCode, sessionToken } = body;

    // Get config
    const { data: config } = await supabase
      .from('montree_super_admin_config')
      .select('*')
      .single();

    // Check IP allowlist
    if (config?.ip_allowlist_enabled && !isIPAllowed(ip, config.allowed_ips || [])) {
      await logAudit(supabase, {
        adminIdentifier: ip,
        action: 'login_failed',
        resourceType: 'system',
        resourceDetails: { reason: 'IP not allowed' },
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ========================
    // ACTION: LOGIN
    // ========================
    if (action === 'login') {
      // Verify password
      if (password !== process.env.ADMIN_PASSWORD) {
        await logAudit(supabase, {
          adminIdentifier: ip,
          action: 'login_failed',
          resourceType: 'system',
          resourceDetails: { reason: 'Invalid password' },
          ipAddress: ip,
          userAgent,
        });
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Check if 2FA is required
      if (config?.totp_enabled) {
        // Create session but mark as not TOTP verified
        const token = await createSession(supabase, ip, userAgent, config.session_timeout_minutes || 15);

        await logAudit(supabase, {
          adminIdentifier: 'super_admin',
          action: 'login',
          resourceType: 'system',
          resourceDetails: { step: 'password_verified', requires_totp: true },
          ipAddress: ip,
          userAgent,
        });

        return NextResponse.json({
          success: true,
          requiresTOTP: true,
          sessionToken: token,
        });
      }

      // No 2FA - create fully verified session
      const token = await createSession(supabase, ip, userAgent, config?.session_timeout_minutes || 15);

      // Mark session as TOTP verified (since 2FA is not enabled)
      await supabase
        .from('montree_super_admin_sessions')
        .update({ totp_verified: true })
        .eq('token_hash', hashSessionToken(token));

      await logAudit(supabase, {
        adminIdentifier: 'super_admin',
        action: 'login',
        resourceType: 'system',
        resourceDetails: { step: 'complete', totp_enabled: false },
        ipAddress: ip,
        userAgent,
      });

      // Send alert
      if (config?.alert_on_login) {
        await sendAlert('login', { ip, userAgent }, {
          email: config.alert_email,
          webhookUrl: config.alert_webhook_url,
        });
      }

      return NextResponse.json({
        success: true,
        sessionToken: token,
      });
    }

    // ========================
    // ACTION: VERIFY TOTP
    // ========================
    if (action === 'verify_totp') {
      if (!sessionToken || !totpCode) {
        return NextResponse.json({ error: 'Missing session or TOTP code' }, { status: 400 });
      }

      // Validate session exists
      const sessionValid = await validateSession(supabase, sessionToken, ip);
      if (!sessionValid.valid) {
        return NextResponse.json({ error: sessionValid.reason }, { status: 401 });
      }

      // Verify TOTP
      if (!config?.totp_secret || !verifyTOTP(config.totp_secret, totpCode)) {
        await logAudit(supabase, {
          adminIdentifier: 'super_admin',
          action: 'login_failed',
          resourceType: 'system',
          resourceDetails: { reason: 'Invalid TOTP code' },
          ipAddress: ip,
          userAgent,
        });
        return NextResponse.json({ error: 'Invalid TOTP code' }, { status: 401 });
      }

      // Mark session as TOTP verified
      await supabase
        .from('montree_super_admin_sessions')
        .update({ totp_verified: true })
        .eq('token_hash', hashSessionToken(sessionToken));

      await logAudit(supabase, {
        adminIdentifier: 'super_admin',
        action: 'login',
        resourceType: 'system',
        resourceDetails: { step: 'totp_verified' },
        ipAddress: ip,
        userAgent,
      });

      // Send alert
      if (config?.alert_on_login) {
        await sendAlert('login', { ip, userAgent, totp_verified: true }, {
          email: config.alert_email,
          webhookUrl: config.alert_webhook_url,
        });
      }

      return NextResponse.json({ success: true });
    }

    // ========================
    // ACTION: LOGOUT
    // ========================
    if (action === 'logout') {
      if (sessionToken) {
        await supabase
          .from('montree_super_admin_sessions')
          .update({ revoked: true, revoked_reason: 'User logout' })
          .eq('token_hash', hashSessionToken(sessionToken));

        await logAudit(supabase, {
          adminIdentifier: 'super_admin',
          action: 'login', // Using 'login' type but details show logout
          resourceType: 'system',
          resourceDetails: { step: 'logout' },
          ipAddress: ip,
          userAgent,
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('[SuperAdmin] Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ============================================
// DATA ACCESS (Protected)
// ============================================

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Get session token from header
  const sessionToken = request.headers.get('x-super-admin-token');
  if (!sessionToken) {
    return NextResponse.json({ error: 'No session token' }, { status: 401 });
  }

  // Validate session
  const sessionValid = await validateSession(supabase, sessionToken, ip);
  if (!sessionValid.valid) {
    return NextResponse.json({ error: sessionValid.reason }, { status: 401 });
  }

  if (!sessionValid.totpVerified) {
    return NextResponse.json({ error: 'TOTP verification required' }, { status: 401 });
  }

  // Get config for IP check
  const { data: config } = await supabase
    .from('montree_super_admin_config')
    .select('*')
    .single();

  if (config?.ip_allowlist_enabled && !isIPAllowed(ip, config.allowed_ips || [])) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource');
  const id = searchParams.get('id');
  const reveal = searchParams.get('reveal') === 'true';

  try {
    // ========================
    // RESOURCE: SCHOOLS
    // ========================
    if (resource === 'schools') {
      const { data: schools } = await supabase
        .from('montree_schools')
        .select('*')
        .order('created_at', { ascending: false });

      await logAudit(supabase, {
        adminIdentifier: 'super_admin',
        action: 'view',
        resourceType: 'school',
        resourceDetails: { count: schools?.length || 0 },
        ipAddress: ip,
        userAgent,
      });

      return NextResponse.json({ schools: schools || [] });
    }

    // ========================
    // RESOURCE: SCHOOL DETAIL
    // ========================
    if (resource === 'school' && id) {
      const { data: school } = await supabase
        .from('montree_schools')
        .select('*')
        .eq('id', id)
        .single();

      const { data: classrooms } = await supabase
        .from('montree_classrooms')
        .select('*')
        .eq('school_id', id);

      const { data: teachers } = await supabase
        .from('montree_teachers')
        .select('*')
        .eq('school_id', id);

      const { data: children } = await supabase
        .from('montree_children')
        .select('*')
        .eq('school_id', id);

      // Mask sensitive data unless reveal is requested
      const maskedTeachers = (teachers || []).map(t => ({
        ...t,
        login_code: reveal ? t.login_code : maskLoginCode(t.login_code),
        email: reveal ? t.email : (t.email ? maskEmail(t.email) : null),
      }));

      const maskedChildren = (children || []).map(c => ({
        ...c,
        // Children names are always shown (needed for support)
        // But other PII would be masked here
      }));

      const isSensitive = reveal;

      await logAudit(supabase, {
        adminIdentifier: 'super_admin',
        action: reveal ? 'reveal' : 'view',
        resourceType: 'school',
        resourceId: id,
        resourceDetails: {
          school_name: school?.name,
          classrooms_count: classrooms?.length || 0,
          teachers_count: teachers?.length || 0,
          children_count: children?.length || 0,
          revealed_sensitive: reveal,
        },
        ipAddress: ip,
        userAgent,
        isSensitive,
      });

      // Alert on sensitive access
      if (reveal && config?.alert_on_sensitive_access) {
        await sendAlert('sensitive_access', {
          ip,
          school_id: id,
          school_name: school?.name,
          action: 'revealed login codes',
        }, {
          email: config.alert_email,
          webhookUrl: config.alert_webhook_url,
        });
      }

      return NextResponse.json({
        school,
        classrooms: classrooms || [],
        teachers: maskedTeachers,
        children: maskedChildren,
      });
    }

    // ========================
    // RESOURCE: AUDIT LOGS
    // ========================
    if (resource === 'audit') {
      const limit = parseInt(searchParams.get('limit') || '100');

      const { data: logs } = await supabase
        .from('montree_super_admin_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      await logAudit(supabase, {
        adminIdentifier: 'super_admin',
        action: 'view',
        resourceType: 'system',
        resourceDetails: { viewed: 'audit_logs', count: logs?.length || 0 },
        ipAddress: ip,
        userAgent,
      });

      return NextResponse.json({ logs: logs || [] });
    }

    // ========================
    // RESOURCE: DASHBOARD STATS
    // ========================
    if (resource === 'stats') {
      const { count: schoolCount } = await supabase
        .from('montree_schools')
        .select('*', { count: 'exact', head: true });

      const { count: teacherCount } = await supabase
        .from('montree_teachers')
        .select('*', { count: 'exact', head: true });

      const { count: childrenCount } = await supabase
        .from('montree_children')
        .select('*', { count: 'exact', head: true });

      const { count: classroomCount } = await supabase
        .from('montree_classrooms')
        .select('*', { count: 'exact', head: true });

      await logAudit(supabase, {
        adminIdentifier: 'super_admin',
        action: 'view',
        resourceType: 'system',
        resourceDetails: { viewed: 'dashboard_stats' },
        ipAddress: ip,
        userAgent,
      });

      return NextResponse.json({
        stats: {
          schools: schoolCount || 0,
          classrooms: classroomCount || 0,
          teachers: teacherCount || 0,
          children: childrenCount || 0,
        },
      });
    }

    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });

  } catch (error) {
    console.error('[SuperAdmin] Data access error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
