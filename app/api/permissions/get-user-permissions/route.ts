// =====================================================
// WHALE PLATFORM - GET USER PERMISSIONS API
// =====================================================
// Location: app/api/permissions/get-user-permissions/route.ts
// Purpose: API endpoint to get all permissions for current user
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserPermissions } from '@/lib/permissions/middleware';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Use Supabase auth helpers to get the user session from cookies
    const cookieStore = await cookies();
    
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Not authenticated', details: authError?.message },
        { status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // Get user permissions using the user ID
    const permissions = await getUserPermissions(user.id);

    console.log('Permissions fetched:', {
      roles: permissions.roles,
      featuresCount: permissions.features?.length || 0,
    });

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
    },
  });
}

