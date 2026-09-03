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
// CMS ("Harbor") locale plumbing. config.ts is pure constants with zero imports,
// so it is safe in the edge runtime. Imported rather than re-listed here so the
// CMS locale set has exactly one source of truth (lib/cms/i18n/config.ts).
import {
  LOCALE_HEADER as CMS_LOCALE_HEADER,
  LOCALE_QUERY as CMS_LOCALE_QUERY,
  isLocale as isCmsLocale,
} from '@/lib/cms/i18n/config';
// CMS phase 2 — the role gate. Both modules are edge-safe on purpose:
// mode.ts reads env and imports nothing, session.ts uses `jose` only (the same
// library verifyAdminToken already uses in this file). Neither pulls in
// next/headers or supabase-js, which would not run here.
import { isCmsLive } from '@/lib/cms/auth/mode';
import {
  CMS_AREA_ROLES,
  CMS_SESSION_COOKIE,
  cmsAreaFor,
  homePathForRole,
  verifyCmsSession,
} from '@/lib/cms/auth/session';

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

// Does this request carry a verified Supabase session holding one of the roles
// the /admin PAGE gate accepts (admin / super_admin / teacher)?
//
// The /api/* branch below returns before the page-level session logic ever
// runs, so an API route gated on the admin-token cookie ALONE would 401 the
// half of admin users who are signed in via Supabase rather than the legacy
// admin-token. Same token sources, same timeouts, same role list as the page
// gate further down — kept in step deliberately.
async function hasSupabaseAdminRole(req: NextRequest): Promise<boolean> {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  const authHeader = req.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '') ||
    req.cookies.get('sb-access-token')?.value ||
    req.cookies.get('supabase-auth-token')?.value;
  if (!accessToken) return false;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await withTimeout(
      supabase.auth.setSession({ access_token: accessToken, refresh_token: '' }),
      3000
    );
    const sessionResult = await withTimeout(supabase.auth.getSession(), 3000);
    const session = sessionResult?.data?.session || null;
    if (!session) return false;

    const userRolesResult = await withTimeout(
      Promise.resolve(
        supabase.from('user_roles').select('role_name').eq('user_id', session.user.id)
      ),
      3000
    );
    const roles = userRolesResult?.data?.map(r => r.role_name) || [];
    return roles.some(
      role => role === 'admin' || role === 'super_admin' || role === 'teacher'
    );
  } catch (error) {
    console.error('[MIDDLEWARE] Supabase admin-role check failed:', error);
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ============================================
  // STATIC-ASSET REWRITE PASSTHROUGH (Aug 2026)
  // The five asset directories + two splash-video files below used to be real
  // files under public/ and were moved out into Supabase Storage this week —
  // next.config.ts now serves them via afterFiles rewrites to
  // /api/montree/media/proxy/... (see the comment there). The broad matcher
  // below already excludes common image extensions (svg/png/jpg/...), but it
  // does NOT list pdf/mp4/etc., so non-image files under these prefixes (and
  // both splash videos, which are .mp4) still reach this function and fall
  // through every redirect/CSRF/CMS/auth branch below — turning a plain
  // public-media request into a 502 the moment any of that logic mishandles
  // an unmapped path. None of that logic applies to a public static asset, so
  // return immediately and let next.config.ts's rewrite do its job. Kept as
  // an exact literal match to the next.config.ts rewrite sources — extend
  // both together if a new asset prefix is ever added.
  // ============================================
  const STATIC_ASSET_PREFIXES = [
    '/dark-phonics-books/',
    '/dark-phonics-materials/',
    '/satpin-books/',
    '/satpin-materials/',
    '/shelf-packs/',
  ];
  if (
    STATIC_ASSET_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname === '/montree-splash-video.mp4' ||
    pathname === '/montree-splash-video-zh.mp4'
  ) {
    return NextResponse.next();
  }

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
  // Aug 7, 2026: '/potato' joins the list. Potato Snaps is a standalone product
  // that lives ONLY on www.teacherpotato.xyz — a montree.xyz visitor who lands
  // on /potato* is bounced to teacherpotato rather than served a second brand on
  // the wrong domain. ('/api/potato/*' starts with '/api', so the APIs are
  // untouched by this and gate themselves, exactly like '/api/story/*'.)
  const WHALE_ONLY_PREFIXES: string[] = ['/riddick', '/story', '/bayan', '/potato'];
  const isWhaleOnlyPath = WHALE_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );

  // Bare apex → www, for Potato Snaps paths only.
  //
  // WHY REDIRECT RATHER THAN SERVE: the Potato Snaps cookies (potato_teacher /
  // potato_parent) are host-only — they carry no `domain` attribute, so a
  // session minted on www.teacherpotato.xyz is invisible on the apex. If the
  // apex ever served /potato it would render a signed-out copy of the app and a
  // teacher would sign in, get bounced, and sign in again forever. All potato
  // traffic has to converge on ONE host, and that host is www.
  //
  // ⚠ TODAY THIS IS DEFENSIVE, NOT THE LIVE FIX. The apex still resolves to a
  // domain-parking service (15.197.225.128 / 3.33.251.168 — the same IPs named
  // below), which answers every request itself: it 301s only '/' to www and
  // 404s everything deeper. Those requests never reach Railway, so this
  // middleware never runs for them. The live apex 404 is fixed OFF the codebase,
  // either by making the registrar's forward preserve the path
  // (teacherpotato.xyz/* → https://www.teacherpotato.xyz/*) or by attaching the
  // apex to Railway. This guard is what makes that second option safe: the
  // moment the apex points here, /potato* bounces to www instead of serving a
  // cookie-less app.
  //
  // 307, not 301: same as the montree.xyz rule below, and a permanent redirect
  // would be cached by every browser that ever hit it — expensive to undo.
  const isApexTeacherPotato = isTeacherPotato && !hostname.startsWith('www.');
  const isPotatoPath =
    pathname === '/potato' ||
    pathname.startsWith('/potato/') ||
    pathname === '/api/potato' ||
    pathname.startsWith('/api/potato/');
  if (isApexTeacherPotato && isPotatoPath) {
    const target = new URL(pathname, 'https://www.teacherpotato.xyz');
    target.search = req.nextUrl.search;
    target.hash = req.nextUrl.hash;
    return NextResponse.redirect(target);
  }

  // Block Montree routes on teacherpotato.xyz — EXCEPT the public Library
  // (Tredoux, Jul 19 2026: his school's teachers get FULL Library access on
  // teacherpotato — Dark Phonics, Curriculum Studio, lesson launcher,
  // generators, photo bank — without ever being sent to montree.xyz. Product
  // routes like /montree/try, /montree/dashboard, marketing pages stay
  // blocked and bounce to montree.xyz as before.)
  if (
    isTeacherPotato &&
    pathname.startsWith('/montree') &&
    !pathname.startsWith('/montree/library')
  ) {
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
  // but kept as a fallback if that redirect doesn't fire). Middleware runs
  // BEFORE next.config.ts's redirects() in the Next.js request pipeline, so
  // in practice THIS is the redirect that actually fires for every request —
  // the "fallback" is the primary path.
  // 🚨 FIXED — this used to build the destination as new URL('/montree',
  // req.url), which drops the entire query string. Every ad landing on the
  // bare root (montree.xyz/?utm_source=facebook&...) lost its UTM params
  // here before the client ever saw them, which is why utm_source was null
  // on effectively 100% of visitor rows regardless of the tracking code
  // being correct. Preserve search + hash, same as the other redirects in
  // this file (see the WHALE_ONLY_PREFIXES / potato-apex blocks above).
  if (isMontree && pathname === '/') {
    const target = new URL('/montree', req.url);
    target.search = req.nextUrl.search;
    target.hash = req.nextUrl.hash;
    return NextResponse.redirect(target);
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
  // CMS only: let ?locale=xx override the cms_locale cookie for THIS request.
  // A layout cannot read searchParams, but it can read a request header — this
  // is the top rung of lib/cms/i18n/server.ts's resolution order, and it is what
  // makes /cms/teacher/today?locale=ar work for screenshot/QA tooling. Scoped to
  // /cms and to validated CMS locales, so no other surface can see this header.
  if (pathname.startsWith('/cms')) {
    const cmsLocale = req.nextUrl.searchParams.get(CMS_LOCALE_QUERY);
    if (isCmsLocale(cmsLocale)) requestHeaders.set(CMS_LOCALE_HEADER, cmsLocale);
  }

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
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|mp3|mp4|pdf|html|avif|json|webmanifest)$/i.test(pathname)
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
    // 🚨 Session 113 V3 audit HIGH — /api/media was a fully open mutation
    // surface (POST upload, PATCH parent-visibility, DELETE). Every caller is
    // an /app/admin/* page (child-media, classroom/[childId],
    // classroom/student/[id], hub). NOTE: the exact path '/api/media' has no
    // trailing slash, so it needs its own comparison.
    const isMediaApi = pathname === '/api/media' || pathname.startsWith('/api/media/');
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
      pathname.startsWith('/api/onboard/') ||
      isMediaApi;
    if (requiresAdminJWT) {
      const whaleAdminToken = req.cookies.get('admin-token')?.value;
      if (!whaleAdminToken || !(await verifyAdminToken(whaleAdminToken))) {
        // /api/media's callers are /app/admin/* pages, and that page gate
        // admits EITHER the admin-token cookie OR a verified Supabase session
        // holding admin / super_admin / teacher. Gating the API on the cookie
        // alone would 401 every Supabase-session admin mid-page. Only
        // /api/media gets this second door — the other groups above keep the
        // strict admin-token-only check they shipped with.
        if (!isMediaApi || !(await hasSupabaseAdminRole(req))) {
          return new NextResponse(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    return NextResponse.next();
  }

  // Static files already handled above (before CSRF check)
  
  // ============================================
  // CMS ROLE GATE (phase 2)
  // ============================================
  // /cms                     public — the front door, three doors on it
  // /cms/login               public — the lock itself
  // /cms/parent/**           parent (or a school_admin covering the office)
  // /cms/teacher/**          teacher (or a school_admin covering the floor)
  // /cms/org/**              org_admin
  // /cms/office/**           school_admin ONLY (phase 7 — accepting an enrolment
  //                          creates a child in Montree and mints a family a
  //                          login; a teacher and an org director may not)
  //
  // In DEMO MODE (no Supabase configured, or CMS_AUTH_ENFORCED=0) this block
  // does nothing at all and every layer stays walkable — that is the whole
  // point of demo mode, and it is why the check is `isCmsLive()` first.
  //
  // A signed-out visitor is sent to /cms/login?next=… so the door they knocked
  // on is the door they land on afterwards. A signed-IN visitor standing in the
  // wrong layer is sent to their OWN layer, never to the login page — being
  // bounced to a login form you are already through reads as "broken", not as
  // "not yours".
  if (pathname === '/cms' || pathname.startsWith('/cms/')) {
    const area = cmsAreaFor(pathname);
    if (area && isCmsLive()) {
      const session = await verifyCmsSession(req.cookies.get(CMS_SESSION_COOKIE)?.value);
      if (!session) {
        const target = new URL('/cms/login', req.url);
        target.searchParams.set('next', pathname);
        return NextResponse.redirect(target);
      }
      if (!CMS_AREA_ROLES[area].includes(session.role)) {
        return NextResponse.redirect(new URL(homePathForRole(session.role), req.url));
      }
    }
    // Falls through to the public-path list below, which carries '/cms' and
    // '/cms/login' so the legacy Supabase gate never sees a CMS request.
  }

  // Public pages - NO AUTH REQUIRED, NO REDIRECTS
  // These routes should load directly without any authentication checks
  const publicPaths = [
    '/',           // Home page - MUST be accessible
    '/play',       // Weekly parent-facing games page — QR/WeChat links, no login
    '/debug',      // Debug pages
    '/story',      // Story system (has its own auth)
    '/riddick',    // Riddick's sanctuary door (story-admin auth via the form)
    '/bayan',      // Bayan's sanctuary door (story-admin auth via the form)
    '/montree',    // Montree app - has its own auth system (teacher/parent/org-admin logins)
    // Phase 6 (organization tier) invite links. Already covered by the '/montree' entry
    // above, and listed explicitly on purpose: these two routes are the ONLY way a new
    // organisation or a new school inside one comes into existence, and they are opened
    // cold by someone with no session at all. If '/montree' is ever narrowed, these must
    // survive the narrowing — a gated invite link is a dead invite link.
    '/montree/org/join',
    '/montree/school/join',
    // …and the door an organization leader returns to for the rest of the relationship.
    // Listed for the same reason: it must load with no session at all.
    '/montree/org/login',
    '/lyf-coach',  // Lyf Coach web — public signup/login/coach + privacy pages (own client-side auth; APIs live under /api/lyf-coach)
    '/auth/login',
    '/auth/signup',
    '/auth/reset-password',
    '/auth/student-login', // Student login page
    '/auth/teacher',  // Teacher login page (moved here to avoid layout issues)
    '/admin/login', // Admin login page
    '/teacher',     // Simple teacher login (Jasmine, Ivan, John, etc.)
    // Shared week-tab manifest + renderer for every circle-time page
    // (public/circle-time-weeks.js). '.js' is NOT in the matcher's
    // static-extension exclusion below (svg|png|jpg|jpeg|gif|webp|html|
    // avif|json|webmanifest), so without this entry the legacy Supabase
    // gate 302s the script to '/' and every teachers page loses its tabs.
    '/circle-time-weeks.js',
    '/teachers',    // Weekly circle-time page (next.config.ts rewrite → public/circle-time.html) — carries its own client-side password gate, opened cold by teachers with no session
    '/circle-guide.pdf', // Weekly circle-guidance PDF linked from /teachers — top-level public/*.pdf, NOT covered by the matcher's extension exclusion below (.pdf isn't in the svg|png|... list) and not under any of the explicitly-excluded static-asset dirs, so without this entry it 302s to '/' for anyone without a session.
    '/teachers-next', // Week-2 circle-time page (next.config.ts rewrite → public/circle-time-week2.html) — same client-side password gate as /teachers, opened cold with no session.
    '/circle-guide-week2.pdf', // Week-2 circle-guidance PDF linked from /teachers-next — same rationale as /circle-guide.pdf above.
    '/teachers-week1', // Week-1 archive (next.config.ts rewrite → public/circle-time-week1.html) — superseded on /teachers by week 2, kept reachable for reference. Same client-side password gate.
    '/circle-guide-week1.pdf', // Week-1 circle-guidance PDF (the original /circle-guide.pdf book, archived under this name) linked from /teachers-week1 — same rationale as /circle-guide.pdf above.
    // Autumn term weeks 3–10 (next.config.ts rewrite ->
    // public/circle-time-week<N>.html, client-side password gate). Page AND
    // guide PDF each need a line — '.pdf' is not in the matcher's exclusion.
    '/teachers-w3',             // Week 3 · My 5 Senses (Sep 14–18)
    '/circle-guide-week3.pdf',  // its guide book
    '/teachers-w4',             // Week 4 · My Feeling (Sep 21–24)
    '/circle-guide-week4.pdf',  // its guide book
    '/teachers-w5',             // Week 5 · Autumn 1 (Sep 28–Oct 9, split by 国庆)
    '/circle-guide-week5.pdf',  // its guide book
    '/teachers-w6',             // Week 6 · Autumn 2 (Oct 12–16)
    '/circle-guide-week6.pdf',  // its guide book
    '/teachers-w7',             // Week 7 · Five Food Groups (Oct 19–23)
    '/circle-guide-week7.pdf',  // its guide book
    '/teachers-w8',             // Week 8 · Healthy Food & Healthy Habits (Oct 26–30)
    '/circle-guide-week8.pdf',  // its guide book
    '/teachers-w9',             // Week 9 · Family Members (Nov 2–6)
    '/circle-guide-week9.pdf',  // its guide book
    '/teachers-w10',            // Week 10 · My House (Nov 9–13)
    '/circle-guide-week10.pdf', // its guide book
    // May 2027 "Space" month (weeks 30–34). Each week needs BOTH lines: the page
    // (next.config.ts rewrite -> public/circle-time-week<NN>.html, client-side
    // password gate) and its guide PDF (top-level public/*.pdf is NOT covered by
    // the matcher's extension exclusion, so without it the PDF 302s to '/').
    '/teachers-w30',            // Week 30 · Big Bang and the Universe (May 6–7, two-day week)
    '/circle-guide-week30.pdf', // its guide book
    '/teachers-w31',            // Week 31 · Solar System (May 10–14)
    '/circle-guide-week31.pdf', // its guide book
    '/teachers-w32',            // Week 32 · Space Exploration (May 17–21)
    '/circle-guide-week32.pdf', // its guide book
    '/teachers-w33',            // Week 33 · Dinosaurs & Fossils 1 (May 24–28)
    '/circle-guide-week33.pdf', // its guide book
    '/teachers-w34',            // Week 34 · Dinosaurs & Fossils 2 (May 31–Jun 4)
    '/circle-guide-week34.pdf', // its guide book
    '/whale-class', // Parent-facing song page — QR codes link here, no login required
    '/pricing',     // Public pricing page — no login required
    '/privacy',     // Privacy policy — public (required by App Store / kids-data law)
    '/terms',       // Terms of service — public
    '/support',     // Support page — public (required by App Store; montree.xyz/support)
    '/welcome',     // Outreach landing pages (/welcome/[code]) — cold-email links, must load anonymously
    // Dark Phonics Live standalone-app distribution. '/dark-phonics-app' is the
    // poster/QR/WeChat landing page and '/downloads' serves the APK itself —
    // both are opened cold by a parent with no session, and '.apk' is not in the
    // static-file extension exclusion above, so without these entries the legacy
    // Supabase gate below 302s the page AND the download to '/'.
    '/dark-phonics-app',
    '/downloads',
    // Standalone self-contained HTML apps served straight out of public/apps —
    // today the Dark Phonics interactive lesson player, linked from /play and
    // opened cold by a parent with no session. The matcher below already
    // excludes '.html', so the player file itself never reaches this function;
    // this entry is the belt to that braces, and covers any non-.html sibling
    // (e.g. a manifest or a data file) added under /apps later.
    '/apps',
    // The parent-led Dark Phonics lesson (www.teacherpotato.xyz/parents) — the
    // Whale Class door to the digital teaching platform, linked from the
    // homepage "Parents" tab. Fully client-side, no auth, local state only.
    // Without this entry the legacy Supabase gate below 302s every anonymous
    // visitor to '/' — the same failure mode '/montree', '/potato' and '/cms'
    // are listed for.
    '/parents',
    // …and the path that tab used to point at. '/interactive' now only
    // redirects to '/parents', but it must stay public or the redirect never
    // runs and old links (QR codes, WeChat shares) 302 to '/' instead.
    '/interactive',
    // Potato Snaps (www.teacherpotato.xyz) — own auth system entirely: 6-char
    // class/child codes, own httpOnly cookies, every /api/potato/* route gates
    // itself. Without this entry the legacy Supabase-role gate at the bottom of
    // this file silently 302s every anonymous visitor to '/', which reads as
    // "the page doesn't exist". Same reason '/montree' is on this list.
    '/potato',
    // …and the Potato Snaps standalone-app landing page (poster / QR / WeChat
    // link, opened cold with no session). '/downloads' is already listed above
    // for the APK itself, same as Dark Phonics Live.
    '/potato-app',
    // CMS (Classroom Management System) — the "Harbor" brand surface at
    // /cms/**. Without an entry here the legacy Supabase-role gate at the
    // bottom of this file silently 302s every anonymous visitor to '/' — the
    // same failure mode '/montree' and '/potato' are listed for.
    //
    // 🚨 PHASE 2 NARROWED THIS, exactly as the phase-1 comment promised it
    // would: the bare '/cms' entry used to make the WHOLE surface public,
    // because the matcher below treats a listed path as covering all its
    // children. Now only the two public doors are listed, and the CMS gate
    // block above this list decides /cms/parent|teacher|org. Do not re-add a
    // bare '/cms' entry — it would silently un-gate every child's record.
    // NOTE: /api/cms/* needs no entry — the matcher below excludes `api` and
    // only names specific /api groups, so CMS's API routes never run through
    // this middleware at all. They gate themselves.
    // Both entries below mean "not the LEGACY gate's business". Role checks for
    // /cms/parent|teacher|org already happened in the CMS gate above and
    // returned a redirect if they failed, so reaching this list means the
    // request is either public or already authorised.
    '/cms',
    '/cms/login',
    // Montree Lens — the visiting observer's app, served ON montree.xyz at
    // /lens*. It has its own auth entirely (an 8-char invite code, its own
    // httpOnly `lens_observer` cookie with aud 'lens-observer'), and every
    // /api/lens/* route gates itself. Without this entry the legacy
    // Supabase-role gate at the bottom of this file silently 302s every
    // anonymous visitor to '/', which reads as "the page doesn't exist" — the
    // same failure mode '/montree', '/potato' and '/cms' are listed for.
    //
    // 🚨 DELIBERATELY NOT IN WHALE_ONLY_PREFIXES. Potato Snaps is bounced OFF
    // montree.xyz because it is a second brand on the wrong domain; Lens is a
    // Montree product with a Montree name and belongs here. Adding '/lens' to
    // that list would 307 every visitor to teacherpotato.xyz, where the app
    // does not belong and where its host-only cookie would not follow them.
    //
    // NOTE: /api/lens/* needs no entry — the matcher below excludes `api` and
    // names only specific /api groups, so Lens's API routes never run through
    // this middleware at all. They gate themselves, exactly like /api/potato/*.
    '/lens',
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
    // 🚨 Aug 2026: added the five static-asset directories + two splash-video
    // filenames (see next.config.ts afterFiles rewrites / STATIC_ASSET_PREFIXES
    // above) — pdf/mp4 files under them don't match the extension exclusion
    // below, so without this they still triggered a middleware invocation for
    // every public media request. The in-function early-return above is the
    // real safety net; this keeps them from invoking middleware at all.
    '/((?!api|_next/static|_next/image|favicon.ico|dark-phonics-books|dark-phonics-materials|satpin-books|satpin-materials|shelf-packs|montree-splash-video\\.mp4|montree-splash-video-zh\\.mp4|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|avif|json|webmanifest)$).*)',
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
    // 🚨 Session 113 V3 audit HIGH — /api/media had no auth of its own and was
    // never in this matcher: anyone could upload, retitle or delete child media.
    '/api/media',
    '/api/media/:path*',
  ],
};
