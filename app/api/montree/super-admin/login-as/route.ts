// /api/montree/super-admin/login-as/route.ts
// DEV ONLY: Allow super admin to login as any principal
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { checkRateLimit } from '@/lib/rate-limiter';
import { logAudit, getClientIP, getUserAgent } from '@/lib/montree/audit-logger';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const ip = getClientIP(req.headers);
    const userAgent = getUserAgent(req.headers);

    // Rate limiting
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/super-admin/login-as', 5, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const { schoolId, superAdminPassword } = await req.json();

    // Phase 9: Timing-safe password verification
    const { valid: passwordValid, error: passwordError } = verifySuperAdminPassword(superAdminPassword);
    if (passwordError === 'Server misconfiguration') {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    if (!passwordValid) {
      await logAudit(supabase, {
        adminIdentifier: ip,
        action: 'login_failed',
        resourceType: 'super_admin',
        ipAddress: ip,
        userAgent,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get school data
    const { data: school, error: schoolError } = await supabase
      .from('montree_schools')
      .select('*')
      .eq('id', schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Get principal data
    const { data: principal, error: principalError } = await supabase
      .from('montree_school_admins')
      .select('id, email, name, role')
      .eq('school_id', schoolId)
      .eq('role', 'principal')
      .single();

    if (principalError || !principal) {
      // Phase 8: Log dev-mode impersonation
      logAudit(supabase, {
        adminIdentifier: 'super_admin',
        action: 'login_as',
        resourceType: 'principal',
        resourceDetails: {
          endpoint: '/api/montree/super-admin/login-as',
          schoolId: school.id,
          schoolName: school.name,
          devMode: true,
          note: 'No principal found — dev principal session created',
        },
        ipAddress: ip,
        userAgent,
        isSensitive: true,
      });

      // No principal found, create a dev principal session
      return NextResponse.json({
        principal: {
          id: 'dev-admin',
          email: school.owner_email,
          name: school.owner_name || 'Dev Admin',
          role: 'principal'
        },
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
          subscription_status: school.subscription_status,
          subscription_tier: school.subscription_tier
        },
        devMode: true
      });
    }

    // Check if school needs setup
    const { count: classroomCount } = await supabase
      .from('montree_classrooms')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId);

    // Phase 8: Log principal impersonation
    logAudit(supabase, {
      adminIdentifier: 'super_admin',
      action: 'login_as',
      resourceType: 'principal',
      resourceId: principal.id,
      resourceDetails: {
        endpoint: '/api/montree/super-admin/login-as',
        schoolId: school.id,
        schoolName: school.name,
        principalName: principal.name,
        devMode: false,
      },
      ipAddress: ip,
      userAgent,
      isSensitive: true,
    });

    return NextResponse.json({
      principal: {
        id: principal.id,
        email: principal.email,
        name: principal.name,
        role: principal.role
      },
      school: {
        id: school.id,
        name: school.name,
        slug: school.slug,
        subscription_status: school.subscription_status,
        subscription_tier: school.subscription_tier
      },
      needsSetup: (classroomCount || 0) === 0,
      devMode: true
    });

  } catch (error) {
    console.error('Login-as error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
