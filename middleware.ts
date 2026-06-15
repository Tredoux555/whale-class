// =====================================================
// WHALE PLATFORM - ROUTE PROTECTION MIDDLEWARE
// =====================================================
// Location: middleware.ts (root level)
// Purpose: Protect routes based on user roles and permissions
// UPDATED: 2026-01-10 00:30 - Force teacher simple login
// =====================================================

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken } from '@/lib/auth';
import { localeForCountry, localeFromAcceptLanguage } from '@/lib/montree/i18n/country-locale';

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
  const pathname = req.nextUrl.pathname;
  const hostname = req.headers.get('host') || '';
  
  // ============================================
  // DOMAIN ISOLATION — Separate teacherpotato.xyz and montree.xyz
  // teacherpotato.xyz = Whale Class (videos, games, admin, teacher, story,
  //                     whale-class song page, legacy /auth pages)
  // montree.xyz       = Montree SaaS (classroom management, home program —
  //                     everything under /montree/*)
  //
  // Cross-domain bleed is a trust + brand failure: a parent who scans a
  // Whale Class song QR should land on teacherpotato.xyz, never on
  // montree.xyz. A Montree principal who follows an invite link should
  // land on montree.xyz, never on teacherpotato.xyz. The product split
  // must hold at the URL bar, not just at the layout level.
  // ============================================
  const isTeacherPotato = hostname.includes('teacherpotato.xyz');
  const isMontree = hostname.includes('montree.xyz');

  // Whale-Class-only top-level routes that should redirect from montree.xyz
  // to teacherpotato.xyz when teacherpotato is actually serving the deploy.
  //
  // ⚠ As of May 4, 2026 teacherpotato.xyz DNS points at a legacy parking
  // server (15.197.225.128 / 3.33.251.168) and returns 405/404 for every
  // path — it is NOT routing to the Railway service that fronts montree.xyz
  // (Cloudflare 172.67.196.225 / 104.21.68.162). Until the Railway custom-
  // domain alias is re-attached to teacherpotato.xyz, redirecting visitors
  // there sends them to a dead host. So this list is empty for now and
  // /whale-class etc. continue to render on montree.xyz unchanged.
  //
  // To restore the product split: re-attach teacherpotato.xyz in Railway →
  // Settings → Domains, verify DNS points to Railway/Cloudflare, then add
  // entries back here ('/whale-class', '/admin', '/teacher', '/story',
  // '/games', '/auth'). /api/* must stay excluded — APIs are gated by
  // per-route auth handlers and serve both products.
  // Jun 15, 2026: teacherpotato.xyz is serving the Railway deploy again, so the
  // private sanctuary is isolated to it — /riddick (Riddick's door) and /story
  // (the personal platform + story system) now redirect OFF montree.xyz to
  // teacherpotato.xyz. The family sanctuary must never be reachable on the public
  // product domain. The rest of the split (/admin, /teacher, /games, /auth,
  // /whale-class) stays deferred. NOTE: '/story' here only matches page routes —
  // '/api/story/*' starts with '/api', so the APIs are untouched and serve both.
  const WHALE_ONLY_PREFIXES: string[] = ['/riddick', '/story'];
  const isWhaleOnlyPath = WHALE_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );

  // Block Montree routes on teacherpotato.xyz
  if (isTeacherPotato && pathname.startsWith('/montree')) {
    return NextResponse.redirect(new URL(pathname, 'https://montree.xyz'));
  }

  // Block Whale-Class routes on montree.xyz — preserve query + hash so
  // song deep links (e.g. /whale-class#song-animal-habitats) survive the redirect.
  if (isMontree && isWhaleOnlyPath) {
    // Redirect to the WWW host: the apex teacherpotato.xyz still points at a dead
    // parking server (15.197.225.128 / 3.33.251.168), but www.teacherpotato.xyz is
    // attached to Railway and serves the app. (Jun 15, 2026.)
    const target = new URL(pathname, 'https://www.teacherpotato.xyz');
    target.search = req.nextUrl.search;
    target.hash = req.nextUrl.hash;
    return NextResponse.redirect(target);
  }

  // Force montree.xyz root → /montree (redundant with next.config.ts redirect,
  // but kept as a fallback if that redirect doesn't fire).
  if (isMontree && pathname === '/') {
    return NextResponse.redirect(new URL('/montree', req.url));
  }
  
  // EXPLICIT: /teacher routes use simple localStorage auth, not Montree
  // Return immediately - no redirects, no auth checks
  if (pathname === '/teacher' || pathname.startsWith('/teacher/')) {
    return NextResponse.next();
  }
  
  // Create response with pathname header for layouts to read
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);
  // Pass hostname to layouts for domain-aware rendering
  requestHeaders.set('x-hostname', hostname);
  
  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // ============================================
  // FIRST-VISIT LANGUAGE DETECTION (Montree app)
  // A brand-new visitor to the Montree app gets a default UI language, chosen
  // by this precedence:
  //   1. Their browser's Accept-Language (best intent signal — a German
  //      speaker abroad still wants German),
  //   2. else the country Cloudflare reports via `cf-ipcountry` (a German IP
  //      → German), 
  //   3. else English.
  // We ONLY seed this when no `mt_locale` cookie exists yet, so a returning
  // visitor's manual language-switcher choice ALWAYS wins. The Montree layout
  // reads `mt_locale` server-side, so the correct language paints on first
  // load with no English flash.
  // ============================================
  if (isMontree && pathname.startsWith('/montree') && !req.cookies.get('mt_locale')) {
    const locale =
      localeFromAcceptLanguage(req.headers.get('accept-language')) ??
      localeForCountry(req.headers.get('cf-ipcountry'));
    res.cookies.set('mt_locale', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });
  }

  // ============================================
  // EARLY EXIT: Static files, Next.js internals, SEO files
  // Must be BEFORE CSRF check to avoid unnecessary URL parsing on every asset
  // ============================================
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/audio/') ||
    pathname.startsWith('/audio-new/') ||
    pathname.startsWith('/images/') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|mp3|mp4|html|avif|json|webmanifest)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ============================================
  // PHASE 7: CSRF PROTECTION
  // Block cross-origin state-changing requests
  // ============================================
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.get('origin');
    if (origin) {
      let requestHost = '';
      try {
        // Use URL parser for both sides to handle IPv6 brackets correctly
        requestHost = new URL(`https://${req.headers.get('host') || ''}`).hostname;
      } catch {
        requestHost = req.headers.get('host')?.split(':')[0] || '';
      }
      try {
        const originHostname = new URL(origin).hostname;
        if (originHostname !== requestHost) {
          // Phase 8: Log CSRF block attempt
          console.warn('[CSRF] Blocked cross-origin request:', {
            method: req.method,
            path: pathname,
            originHostname,
            requestHost,
          });
          return new NextResponse(
            JSON.stringify({ error: 'Cross-origin request blocked' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        // Phase 8: Log invalid origin
        console.warn('[CSRF] Invalid origin header:', { method: req.method, path: pathname, origin });
        return new NextResponse(
          JSON.stringify({ error: 'Invalid origin' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    // No Origin header = same-origin or non-browser client (curl, Postman) — allowed
  }

  // ============================================
  // ALWAYS ALLOW THESE ROUTES (no auth, no redirects)
  // ============================================

  // CRITICAL: API routes - NEVER redirect, let them handle their own auth
  // This MUST be first to ensure API routes are never intercepted
  if (pathname.startsWith('/api/')) {
    // 🚨 Session 113 V2 Whale-Class admin audit CRITICAL — extend the
    // admin-JWT gate to ALL /api/admin/* and /api/whale/* routes. Until
    // this fix, /api/admin/video-manager, /api/admin/media-library, and
    // /api/admin/curriculum/sync-all (and every other /api/admin/* route)
    // were completely unauthenticated — anyone with the URL could wipe
    // homepage videos, upload arbitrary files into Supabase Storage, or
    // corrupt the curriculum for every Whale Class student.
    //
    // 🚨 Session 113 V2 LEGACY-API audit CRITICAL — extended again to
    // cover the legacy /api/* groups that predate the multi-tenant
    // /api/montree/* and /api/whale/* layout and were never explicitly
    // gated. Three CRITICAL anyone-can-mutate-production-data routes
    // close at once:
    //   - /api/classroom/[id]/curriculum (PATCH could rewrite any
    //     work in any classroom)
    //   - /api/students/[id]/quick-place (POST forged child_work_progress)
    //   - /api/weekly-planning/upload (Sonnet burn + DB wipe per call)
    //
    // Exception: /api/whale/parent/* and /api/whale/teacher/* have their
    // own Supabase auth.
    // Exception: /api/admin/login MUST stay public — it's the auth
    // entrypoint itself.
    // Exception: /api/auth/* is the auth entrypoint suite (login, logout).
    // Exception: /api/health, /api/warm, /api/public, /api/stripe,
    // /api/guides — public-by-design.
    const requiresAdminJWT =
      (pathname.startsWith('/api/admin/') && !pathname.startsWith('/api/admin/login')) ||
      (
        pathname.startsWith('/api/whale/') &&
        !pathname.startsWith('/api/whale/parent/') &&
        !pathname.startsWith('/api/whale/teacher/')
      ) ||
      pathname.startsWith('/api/weekly-planning/') ||
      pathname.startsWith('/api/curriculum-import/') ||
      pathname.startsWith('/api/students/') ||
      pathname.startsWith('/api/classroom/') ||
      pathname.startsWith('/api/onboard/');
    if (requiresAdminJWT) {
      const whaleAdminToken = req.cookies.get('admin-token')?.value;
      if (!whaleAdminToken || !(await verifyAdminToken(whaleAdminToken))) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    return NextResponse.next();
  }

  // Static files already handled above (before CSRF check)
  
  // Public pages - NO AUTH REQUIRED, NO REDIRECTS
  // These routes should load directly without any authentication checks
  const publicPaths = [
    '/',           // Home page - MUST be accessible
    '/games',      // Games hub and all game routes
    '/debug',      // Debug pages
    '/story',      // Story system (has its own auth)
    '/riddick',    // Riddick's sanctuary door (story-admin auth via the form)
    '/montree',    // Montree app - has its own auth system (teacher/parent logins)
    '/auth/login',
    '/auth/signup',
    '/auth/reset-password',
    '/auth/student-login', // Student login page
    '/auth/teacher',  // Teacher login page (moved here to avoid layout issues)
    '/admin/login', // Admin login page
    '/teacher',     // Simple teacher login (Jasmine, Ivan, John, etc.)
    '/whale-class', // Parent-facing song page — QR codes link here, no login required
    '/pricing',     // Public pricing page — no login required
    '/privacy',     // Privacy policy — public (required by App Store / kids-data law)
    '/terms',       // Terms of service — public
    '/support',     // Support page — public (required by App Store; montree.xyz/support)
  ];
  
  // Check if pathname matches exactly or starts with a public path
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
  
  // If public path, return immediately - NO AUTH CHECKS, NO REDIRECTS
  if (isPublicPath) {
    return res;
  }
  
  // Only verify admin JWT for /admin routes (skip crypto work for all other routes)
  let hasAdminAuth = false;
  if (pathname.startsWith('/admin')) {
    const adminToken = req.cookies.get('admin-token')?.value;
    if (adminToken) {
      try {
        hasAdminAuth = !!(await verifyAdminToken(adminToken));
        if (hasAdminAuth) return res;
      } catch (error) {
        console.error('[MIDDLEWARE] Error verifying admin token:', error);
      }
    }
  }

  // Skip auth check if Supabase not configured (build time)
  if (!supabaseUrl || !supabaseAnonKey) {
    return res;
  }

  // Get session from cookies
  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '') ||
    req.cookies.get('sb-access-token')?.value ||
    req.cookies.get('supabase-auth-token')?.value;

  let session = null;

  // Only create Supabase client and fetch session if we have an access token
  // This avoids unnecessary DB calls for unauthenticated requests
  if (accessToken) {
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
      // If Supabase client creation fails, treat as no session
      session = null;
    }

    if (supabase) {
      // OPTIMIZATION: Combine setSession + getSession into single operation
      // setSession sets the auth context, then getSession retrieves it
      // No need for two separate DB calls with separate timeouts
      try {
        await withTimeout(
          supabase.auth.setSession({ access_token: accessToken, refresh_token: '' }),
          3000
        );
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          3000
        );
        session = sessionResult?.data?.session || null;
      } catch (error) {
        console.error('[MIDDLEWARE] Session fetch timeout or error:', error);
        session = null;
      }
    }
  }

  // If not authenticated and trying to access protected route
  if (!session && !hasAdminAuth) {
    // If trying to access admin route, redirect to admin login
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    // Otherwise redirect to home page
    return NextResponse.redirect(new URL('/', req.url));
  }

  // If authenticated, check role-based access
  if (session) {
    let roles: string[] = [];

    // Recreate Supabase client if needed (for role check)
    // This only happens if we have a valid session from above
    let supabase;
    try {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (error) {
      console.error('[MIDDLEWARE] Error creating Supabase client for role check:', error);
      supabase = null;
    }

    // CRITICAL FIX #4: Add 3-second timeout to database query
    // CRITICAL FIX #5: Wrap in try/catch so errors don't break middleware
    if (supabase) {
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

    // Teacher routes - allow access for teachers, admins, and super_admins
    if (pathname.startsWith('/teacher')) {
      const hasTeacherAccess = roles.some(role => 
        role === 'admin' || role === 'super_admin' || role === 'teacher'
      );
      
      if (!hasTeacherAccess) {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }
  }

  return res;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    // All non-API routes (pages, etc.)
    '/((?!api|_next/static|_next/image|favicon.ico|games|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|avif|json|webmanifest)$).*)',
    // Whale admin API routes — middleware enforces admin JWT auth
    '/api/whale/:path*',
    // 🚨 Session 113 V2 Whale-Class admin audit CRITICAL — also gate
    // /api/admin/* so route handlers that forgot to check auth don't
    // expose the operation to anonymous callers.
    '/api/admin/:path*',
    // 🚨 Session 113 V2 LEGACY-API audit CRITICAL — gate legacy top-level
    // groups that predate /api/admin and were never explicitly authed.
    // Closes 3 CRITICAL anyone-can-mutate-production-data routes at once.
    '/api/weekly-planning/:path*',
    '/api/curriculum-import/:path*',
    '/api/students/:path*',
    '/api/classroom/:path*',
    '/api/onboard/:path*',
  ],
};
