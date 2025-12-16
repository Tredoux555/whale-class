// =====================================================
// WHALE PLATFORM - GET USER PERMISSIONS API
// =====================================================
// Location: app/api/permissions/get-user-permissions/route.ts
// Purpose: API endpoint to get all permissions for current user
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getUserPermissions } from '@/lib/permissions/middleware';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    // Get cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Find Supabase auth cookie (format: sb-<project-ref>-auth-token)
    let accessToken: string | undefined;
    
    // Check Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.replace('Bearer ', '');
    } else {
      // Look for Supabase session cookie
      for (const cookie of allCookies) {
        if (cookie.name.includes('sb-') && cookie.name.includes('auth-token')) {
          try {
            const sessionData = JSON.parse(cookie.value);
            if (sessionData?.access_token) {
              accessToken = sessionData.access_token;
              break;
            }
          } catch {
            // If not JSON, might be the token directly
            if (cookie.value.length > 50) {
              accessToken = cookie.value;
              break;
            }
          }
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated', details: 'No valid session found' },
        { status: 401 }
      );
    }

    // Create Supabase client and verify user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Get user from access token
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

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

