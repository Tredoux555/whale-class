// /api/montree/super-admin/login-as/route.ts
// DEV ONLY: Allow super admin to login as any principal
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { schoolId, superAdminPassword } = await req.json();

    // Verify super admin password
    const expectedPassword = process.env.SUPER_ADMIN_PASSWORD;
    if (!expectedPassword) {
      console.error('SUPER_ADMIN_PASSWORD environment variable is not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (superAdminPassword !== expectedPassword) {
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
