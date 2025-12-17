// =====================================================
// WHALE PLATFORM - ROUTE PROTECTION MIDDLEWARE
// =====================================================
// Location: middleware.ts (root level)
// Purpose: Protect routes based on user roles and permissions
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Skip auth check if Supabase not configured (build time)
  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }
  
  // Create Supabase client for middleware
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  
  // Get session from cookies
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || 
    req.cookies.get('sb-access-token')?.value ||
    req.cookies.get('supabase-auth-token')?.value;
  
  if (accessToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
  }

  // Get session
  const { data: { session } } = await supabase.auth.getSession();

  // Public routes that don't require authentication
  const publicPaths = [
    '/auth/teacher-login',
    '/auth/student-login',
    '/auth/student-signup',
    '/auth/login',
    '/auth/signup',
    '/auth/reset-password',
    '/api/auth',
    '/api/story/auth',
    '/api/student',
    '/story',
    '/games', // Public games access
    '/', // Public homepage
  ];

  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path));

  // If not authenticated and trying to access protected route
  if (!session && !isPublicPath) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/auth/teacher-login';
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated, check role-based access
  if (session) {
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', session.user.id);

    const roles = userRoles?.map(r => r.role_name) || [];

    // Admin routes - require admin, super_admin, or teacher role
    // Teachers can access admin pages if they have the appropriate permissions
    // Individual pages will check permissions at the component level
    if (req.nextUrl.pathname.startsWith('/admin')) {
      const hasAdminAccess = roles.some(role => 
        role === 'admin' || role === 'super_admin' || role === 'teacher'
      );
      
      if (!hasAdminAccess) {
        // Redirect non-admins/non-teachers to teacher dashboard
        return NextResponse.redirect(new URL('/teacher/dashboard', req.url));
      }
    }

    // Teacher routes - require teacher role (or admin)
    if (req.nextUrl.pathname.startsWith('/teacher')) {
      const hasTeacherAccess = roles.some(role => 
        role === 'teacher' || role === 'admin' || role === 'super_admin'
      );
      
      if (!hasTeacherAccess) {
        // Redirect to appropriate dashboard based on role
        if (roles.includes('parent')) {
          return NextResponse.redirect(new URL('/parent/dashboard', req.url));
        }
        return NextResponse.redirect(new URL('/auth/teacher-login', req.url));
      }
    }

    // If user is logged in but accessing login page, redirect to appropriate dashboard
    if (req.nextUrl.pathname === '/auth/teacher-login') {
      if (roles.includes('admin') || roles.includes('super_admin')) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      if (roles.includes('teacher')) {
        return NextResponse.redirect(new URL('/teacher/dashboard', req.url));
      }
      if (roles.includes('parent')) {
        return NextResponse.redirect(new URL('/parent/dashboard', req.url));
      }
    }
  }

  return res;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

