// =====================================================
// WHALE PLATFORM - GET USER PERMISSIONS API
// =====================================================
// Location: app/api/permissions/get-user-permissions/route.ts
// Purpose: API endpoint to get all permissions for current user
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserPermissions } from '@/lib/permissions/middleware';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Use Supabase auth helpers to get the user session from cookies
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated', details: authError?.message },
        { status: 401 }
      );
    }

    // Get user permissions using the user ID
    const permissions = await getUserPermissions(user.id);

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

