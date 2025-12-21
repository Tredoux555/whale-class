// =====================================================
// WHALE PLATFORM - ROUTE PROTECTION MIDDLEWARE
// =====================================================
// Location: middleware.ts (root level)
// Purpose: Protect routes based on user roles and permissions
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper function to create timeout promise
function createTimeout(ms: number) {
  return new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  );
}

// Helper function to race with timeout
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, createTimeout(ms)]) as Promise<T>;
}

export async function middleware(req: NextRequest) {
  // CRITICAL FIX #1: FIRST LINE - Explicit /api/ bypass BEFORE any other code
  // This prevents middleware from running on API routes even if matcher fails
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // CRITICAL FIX #2: SECOND - Bypass static files and assets explicitly
  const pathname = req.nextUrl.pathname;
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  
  // Public routes that don't require authentication
  const publicPaths = [
    '/auth/login',
    '/auth/signup',
    '/auth/reset-password',
    '/story', // Story system (has its own auth)
    '/games', // Public games access
    '/admin/login', // Admin login page
    '/', // Public homepage
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // If public path, skip all auth checks
  if (isPublicPath) {
    return res;
  }
  
  // CRITICAL FIX #3: Check admin-token BEFORE Supabase (faster, no network)
  // This allows admin routes to bypass Supabase entirely if admin-token is valid
  const adminToken = req.cookies.get('admin-token')?.value;
  let hasAdminAuth = false;
  
  if (adminToken) {
    try {
      hasAdminAuth = await verifyAdminToken(adminToken);
    } catch (error) {
      console.error('[MIDDLEWARE] Error verifying admin token:', error);
      hasAdminAuth = false;
    }
  }

  // If admin-token is valid, allow access to admin routes immediately
  if (hasAdminAuth && pathname.startsWith('/admin')) {
    return res;
  }

  // Skip auth check if Supabase not configured (build time)
  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }
  
  // Create Supabase client for middleware (only for protected routes)
  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (error) {
    console.error('[MIDDLEWARE] Error creating Supabase client:', error);
    // If Supabase client creation fails, allow request through
    return res;
  }
  
  // Get session from cookies
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || 
    req.cookies.get('sb-access-token')?.value ||
    req.cookies.get('supabase-auth-token')?.value;
  
  let session = null;
  
  // CRITICAL FIX #4: Add 3-second timeout to setSession
  if (accessToken) {
    try {
      await withTimeout(
        supabase.auth.setSession({ access_token: accessToken, refresh_token: '' }),
        3000
      );
    } catch (error) {
      console.error('[MIDDLEWARE] setSession timeout or error:', error);
      // Continue without session if setSession fails
    }
  }

  // CRITICAL FIX #4: Add 3-second timeout to getSession
  try {
    const sessionResult = await withTimeout(
      supabase.auth.getSession(),
      3000
    );
    session = sessionResult?.data?.session || null;
  } catch (error) {
    console.error('[MIDDLEWARE] getSession timeout or error:', error);
    session = null;
  }

  // If not authenticated and trying to access protected route
  if (!session && !hasAdminAuth) {
    // If trying to access admin route, redirect to admin login
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    // Otherwise redirect to home page (protected routes removed)
    return NextResponse.redirect(new URL('/', req.url));
  }

  // If authenticated, check role-based access
  if (session) {
    let roles: string[] = [];
    
    // CRITICAL FIX #4: Add 3-second timeout to database query
    // CRITICAL FIX #5: Wrap in try/catch so errors don't break middleware
    try {
      const userRolesResult = await withTimeout(
        Promise.resolve(
          supabase
            .from('user_roles')
            .select('role_name')
            .eq('user_id', session.user.id)
        ),
        3000
      );
      roles = userRolesResult?.data?.map(r => r.role_name) || [];
    } catch (error) {
      console.error('[MIDDLEWARE] Database query timeout or error:', error);
      // If query fails, continue with empty roles array
      roles = [];
    }

    // Admin routes - require admin, super_admin, or teacher role OR admin-token cookie
    if (pathname.startsWith('/admin')) {
      // Check if user has admin-token cookie (bypasses Supabase role check)
      if (hasAdminAuth) {
        // Allow access with admin-token
        return res;
      }
      
      // Otherwise check Supabase roles
      const hasAdminAccess = roles.some(role => 
        role === 'admin' || role === 'super_admin' || role === 'teacher'
      );
      
      if (!hasAdminAccess) {
        // Redirect non-admins/non-teachers to home page
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Parent routes - require parent role
    if (pathname.startsWith('/parent')) {
      const hasParentAccess = roles.includes('parent');
      
      if (!hasParentAccess) {
        // Redirect non-parents to appropriate dashboard based on role
        if (roles.includes('admin') || roles.includes('super_admin')) {
          return NextResponse.redirect(new URL('/admin', req.url));
        }
        if (roles.includes('teacher')) {
          return NextResponse.redirect(new URL('/admin', req.url));
        }
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    // Teacher routes - removed, redirect to admin or home
    if (pathname.startsWith('/teacher')) {
      // Teacher dashboard removed, redirect based on role
      if (roles.includes('admin') || roles.includes('super_admin')) {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      if (roles.includes('parent')) {
        return NextResponse.redirect(new URL('/parent/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return res;
}

// Configure which routes use this middleware
// CRITICAL FIX #6: Keep the matcher config as backup
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
