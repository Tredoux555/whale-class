import type { NextConfig } from "next";
import withPWA from "next-pwa";

/**
 * NEXT.JS CONFIG
 * 
 * Supports two modes:
 * - Web (default): output: 'standalone' for Railway/Vercel with API routes
 * - Native (CAPACITOR_BUILD=true): output: 'export' for static Capacitor build
 */
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  // Standalone for web (API routes), export for native (static)
  output: isCapacitorBuild ? 'export' : 'standalone',
  
  // Trailing slashes needed for static export
  trailingSlash: isCapacitorBuild,

  // Ignore TypeScript errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Image config
  images: isCapacitorBuild
    ? { unoptimized: true }
    : {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'dmfncjjtsoxrnvcdnvjq.supabase.co',
            pathname: '/storage/v1/object/public/**',
          },
        ],
        formats: ['image/webp', 'image/avif'],
        minimumCacheTTL: 86400,
        deviceSizes: [640, 750, 828, 1080],
        imageSizes: [16, 32, 48, 64, 96, 128, 256],
      },
  
  // Transpile server-only modules
  transpilePackages: ['jose', 'bcryptjs'],

  // The Montree Lens paper path serves the printable milestone packs from
  // evaluation-kit/paper/ (see app/api/lens/assessment/paper-pack/route.ts).
  // Those PDFs are ~40 MB in total and deliberately do NOT live in public/ —
  // they would be in every build's static payload for a feature one observer
  // uses. Naming the route here is what puts them in the standalone bundle;
  // without it the route deploys and then 404s on a file that exists in git.
  outputFileTracingIncludes: {
    '/api/lens/assessment/paper-pack': ['./evaluation-kit/paper/**'],
  },

  // DOMAIN ISOLATION:
  // montree.xyz root → /montree (Montree landing page)
  // teacherpotato.xyz stays as-is (Whale Class video site)
  // NOTE: Using 302 (temporary) instead of 301 (permanent) to prevent
  // browser caching issues if domains are reconfigured in future.
  // Middleware also enforces domain isolation as a secondary check.
  // Security headers — applied to all responses
  async headers() {
    const entries = [
      // Cache static assets aggressively (JS, CSS, images, fonts)
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/audio-new/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Service-worker scripts must NEVER be HTTP/edge-cached. Cloudflare was
      // serving montree-sw.js with `public, max-age=14400`, so for up to 4h
      // after each deploy existing clients kept running the OLD worker — the
      // exact mechanism that lets a pre-v4 SW (which fabricated synthetic 503s
      // on Next.js RSC prefetches) stay alive on real devices. `no-cache`
      // forces the browser AND Cloudflare to revalidate every load, so a new
      // SW lands immediately; its own skipWaiting()+clients.claim() then evict
      // the stale one. (Session 140.)
      {
        source: '/montree-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/montree/' },
        ],
      },
      {
        source: '/story-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/story/' },
        ],
      },
      // (Session 140 convention, extended to coach-sw + workbox — health check
      // Aug 18.) The three workers below were missed by the original pass and
      // were still being edge-cached with the default TTL, so they carry the
      // exact same no-cache treatment as montree-sw/story-sw above.
      //   /coach-sw.js       — Lyf Coach web-push worker, registered with
      //                        scope '/lyf-coach/' (components/story/lyf-coach/
      //                        EnableRemindersBell.tsx), so it needs the
      //                        matching Service-Worker-Allowed to claim it.
      //   /sw.js             — the next-pwa generated root worker. Root scope
      //                        is its default; the header is stated explicitly
      //                        to match the entries above.
      //   /workbox-:hash.js  — the runtime sw.js pulls in via importScripts.
      //                        Content-hashed per build, so the ':hash' named
      //                        param (standard Next.js header source syntax,
      //                        same family as ':path*' used further down)
      //                        matches whichever hash the current build emits.
      //                        Not a registered worker itself → no
      //                        Service-Worker-Allowed. Without no-cache a stale
      //                        edge copy can pair a NEW sw.js with an OLD
      //                        workbox runtime.
      {
        source: '/coach-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/lyf-coach/' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/workbox-:hash.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
      // ────────────────────────────────────────────────────────────────────
      // EDGE-CACHE PUBLIC, PER-USER-FREE PAGES (Session: SSR locale-cookie pass)
      // The root app/layout.tsx reads headers() (x-hostname) for domain-aware
      // metadata, which opts the WHOLE page tree into Next.js dynamic rendering.
      // As a result every page — including pure static-content pages — emits
      //   Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
      // so Cloudflare reports cf-cache-status: DYNAMIC and serves the Railway
      // origin on every request (514–615ms TTFB; far worse from China). See
      // docs/PERF_PASS_JUN13.md "SSR edge-caching options".
      //
      // These three paths are SAFE to edge-cache: they are pure server/client
      // components with NO per-user content, NO cookies()/headers()/session
      // reads of their own, and they are NOT under /montree, so the middleware's
      // mt_locale Set-Cookie NEVER fires on them (that seed is gated on
      // pathname.startsWith('/montree')). Verified live: /pricing + /privacy
      // carry no Set-Cookie. Overriding Cache-Control here lets Cloudflare cache
      // the HTML at a PoP near the user while still revalidating in the
      // background. s-maxage = CDN TTL; stale-while-revalidate keeps it warm.
      // NOTE: scoped to these exact paths only — do NOT widen to /montree/* or
      // any authed surface, which would risk serving one user's locale/session
      // from a shared cache.
      {
        source: '/pricing',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/support',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/privacy',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      // API mutation routes: no browser caching (POST/PATCH/DELETE are not cached by browsers anyway,
      // but this ensures no proxy caching). Read-only GET routes set their own Cache-Control per-route.
      // NOTE: Removed blanket max-age=0 on /api/montree/(.*) — it was overriding per-route
      // Cache-Control headers on GET endpoints (children, observations, works/search, reports).
      {
        source: '/api/montree/:path*/upload',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
      {
        source: '/api/montree/auth/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
      // PSS ("Potato Snaps" / "PSS by Teacher Potato") is a private tool for a
      // fixed 4-person team, not a public product surface — it should never
      // show up in search results. app/potato/layout.tsx already sets a
      // page-level `robots` meta tag for the HTML routes, but that does
      // nothing for the /api/potato/* JSON responses, so this adds the header
      // form (which a crawler honours even without ever rendering the page)
      // across both.
      {
        source: '/potato/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/api/potato/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          // DNS prefetch + preconnect for external origins (Supabase, Google Fonts)
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Link', value: '<https://dmfncjjtsoxrnvcdnvjq.supabase.co>; rel=preconnect, <https://fonts.googleapis.com>; rel=preconnect; crossorigin, <https://fonts.gstatic.com>; rel=preconnect; crossorigin' },
          // Security headers
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(self), camera=(self)' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          // Phase 6: Content Security Policy
          // NOTE: 'unsafe-inline' required for script-src because Next.js uses inline scripts
          // for hydration, page data, and client-side routing. Without it, the entire site breaks.
          // A nonce-based approach would be more secure but requires significant Next.js configuration.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // script-src adds:
              //   - cloudflareinsights.com   → CF Web Analytics beacon (auto-injected when CF proxies the site)
              "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://dmfncjjtsoxrnvcdnvjq.supabase.co",
              "font-src 'self' https://fonts.gstatic.com",
              // connect-src adds:
              //   - cloudflareinsights.com                              → CF analytics beacon endpoint
              //   - *.agora.io + wss://*.agora.io                       → Agora load balancer + signalling
              //   - *.sd-rtn.com + wss://*.sd-rtn.com                   → Agora's newer SDX network (replaces agora.io edges)
              //   - *.agoraio.cn + wss://*.agoraio.cn                   → Agora's in-China endpoints
              //   - uni-webcollector.agora.io                           → Agora telemetry (without it, SDK logs noisy warnings)
              // Without these, the SDK's join() retries 'multi unilbs network error' forever
              // and never reaches the camera/mic permission prompt (Beijing user diagnosis, 2026-05-18).
              //
              // 🚨 Session 119 — CRITICAL FIX: every Agora host source has ":*"
              // appended. Per CSP spec, a host-source with NO port matches only
              // the scheme's default port (443 for wss/https). Agora's SDK first
              // probes non-standard ports (4710, 4714, etc.) which the spec
              // then BLOCKS with "violates the following Content Security Policy
              // directive". The SDK falls back to port 443 but burns 5–7s per
              // device per retry — with two devices doing this dance, they
              // rarely converge in the join window. ":*" port-wildcard fixes
              // it. Diagnosed from Tredoux's iPhone+Mac call log 2026-05-19.
              // mvgen local daemon — /admin/mvgen talks to a renderer on the operator's own machine; loopback is mixed-content-exempt in Chrome
              "connect-src 'self' https://dmfncjjtsoxrnvcdnvjq.supabase.co https://www.googleapis.com https://static.cloudflareinsights.com https://*.agora.io:* wss://*.agora.io:* https://*.sd-rtn.com:* wss://*.sd-rtn.com:* https://*.agoraio.cn:* wss://*.agoraio.cn:* http://127.0.0.1:8787 http://localhost:8787",
              // mvgen local daemon — the /admin/mvgen Library plays rendered mp4s via a native
              // <video src="http://127.0.0.1:8787/api/media">; a <video> element's src is governed by
              // media-src (NOT connect-src), so the loopback origins must be listed here too or Chrome
              // blocks playback. Same operator-own-machine / loopback rationale as connect-src above.
              // montree.xyz → dark-phonics-lesson-player.html plays <video src="https://montree.xyz/api/montree/media/proxy/videos/...">; without this the media-src block rejects it (MediaError code 4).
              "media-src 'self' blob: https://dmfncjjtsoxrnvcdnvjq.supabase.co https://montree.xyz http://127.0.0.1:8787 http://localhost:8787",
              // worker-src 'self' blob: required by Agora SDK for its audio-processing AudioWorklet
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];

    // ────────────────────────────────────────────────────────────────────
    // /tools/* FRAMING OVERRIDE (Jul 27, 2026)
    // The blanket '/(.*)' entry above sends `frame-ancestors 'none'`, and per
    // CSP spec frame-ancestors SUPERSEDES the X-Frame-Options: SAMEORIGIN sent
    // alongside it. That silently blocked the Picture Library hub from
    // same-origin-iframing the static Picture Bingo generator at
    // /tools/picture-bingo-generator.html.
    //
    // Next.js applies EVERY matching headers() entry in source order and, for a
    // duplicated header key, the LAST matching entry wins — so this must be
    // pushed AFTER the blanket entry. It reuses the blanket CSP value verbatim
    // and flips ONLY the frame-ancestors directive to 'self'; every other
    // directive, and the global 'none' on every non-/tools path, is unchanged.
    const blanketCsp = entries
      .find((e) => e.source === '/(.*)')
      ?.headers.find((h) => h.key === 'Content-Security-Policy')?.value;

    if (blanketCsp) {
      entries.push({
        source: '/tools/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: blanketCsp.replace("frame-ancestors 'none'", "frame-ancestors 'self'"),
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      });
    }

    return entries;
  },

  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'host', value: 'montree.xyz' }],
        destination: '/montree',
        statusCode: 302,
      },
    ];
  },

  // ────────────────────────────────────────────────────────────────────
  // STATIC ASSET MIGRATION — public/ → Supabase Storage (Aug 2026)
  // The five large asset directories below (books, materials, packs) and the
  // two splash video files were moved out of git/public and into the
  // `static-assets` bucket on the same Supabase project already configured
  // in images.remotePatterns (dmfncjjtsoxrnvcdnvjq.supabase.co). They are no
  // longer shipped in the Docker build context (see .dockerignore).
  //
  // These rewrites keep every existing in-app reference
  // (`/dark-phonics-books/...`, `/satpin-materials/...`,
  // `/montree-splash-video.mp4`, etc.) working unchanged — no component/page
  // code had to change.
  //
  // 🚨 Destinations point at the app's OWN /api/montree/media/proxy route,
  // NOT straight at supabase.co. An external rewrite destination (the
  // original approach) is fetched directly by the requester's browser in
  // production, and montree.xyz sits behind Cloudflare: pointing an
  // afterFiles rewrite at *.supabase.co made Cloudflare return
  // "Error 1000: DNS points to prohibited IP" naming the supabase host,
  // even though the same supabase.co URL loads fine when hit directly
  // (verified 200s outside the rewrite). Routing through
  // /api/montree/media/proxy instead makes the ORIGIN (Railway) do the
  // supabase.co fetch server-side — the exact same proxy already used in
  // production for montree-media/story-uploads/etc — so the browser/
  // Cloudflare never talks to supabase.co directly for these paths.
  // `static-assets` was added to that route's bucket allowlist for this.
  //
  // `afterFiles` placement: Next.js checks the filesystem (public/, pages)
  // FIRST and only falls through to these rewrites on a miss. That means if
  // any of these files are ever restored locally under public/ (e.g. during
  // rollback), they win over the proxy automatically.
  //
  // 🚨 Destinations route through /api/montree/media/proxy/bucket/static-assets/...
  // (a `[bucket]/[...path]` route), NOT .../proxy/:path*?bucket=static-assets.
  // The query-string form 502'd every one of these paths in production: a
  // rewritten request's `request.url`/`request.nextUrl` reflects the ORIGINAL
  // client URL, so `?bucket=static-assets` tacked onto a rewrite destination
  // never reached the route handler — confirmed for both this afterFiles form
  // and a middleware NextResponse.rewrite(), with or without a `:path*`
  // wildcard in the destination. Route PARAMS (path segments), unlike query
  // strings, DO survive a rewrite, so the bucket now travels as a path segment
  // instead. See app/api/montree/media/proxy/bucket/[bucket]/[...path]/route.ts.
  async rewrites() {
    return {
      afterFiles: [
        // Teachers tab (Aug 29, 2026): clean URL for the weekly circle-time
        // page (a static file in public/). Password gate lives in the page.
        {
          source: '/teachers',
          destination: '/circle-time.html',
        },
        {
          source: '/teachers-next',
          destination: '/circle-time-week2.html',
        },
        // Week 1 archive (superseded by week 2 going live on /teachers Sep 2,
        // 2026). Same shape as the /teachers-next entry above: clean URL ->
        // static file in public/. Needs a matching middleware.ts publicPaths
        // entry (page AND guide PDF) — see /teachers-week1 there.
        {
          source: '/teachers-week1',
          destination: '/circle-time-week1.html',
        },
        // Autumn term weeks 3–10. Same shape as the entries above:
        // clean URL -> static file in public/. Each also needs a middleware.ts
        // publicPaths entry (page AND guide PDF).
        {
          source: '/teachers-w3',
          destination: '/circle-time-week3.html',
        },
        {
          source: '/teachers-w4',
          destination: '/circle-time-week4.html',
        },
        {
          source: '/teachers-w5',
          destination: '/circle-time-week5.html',
        },
        {
          source: '/teachers-w6',
          destination: '/circle-time-week6.html',
        },
        {
          source: '/teachers-w7',
          destination: '/circle-time-week7.html',
        },
        {
          source: '/teachers-w8',
          destination: '/circle-time-week8.html',
        },
        {
          source: '/teachers-w9',
          destination: '/circle-time-week9.html',
        },
        {
          source: '/teachers-w10',
          destination: '/circle-time-week10.html',
        },
        {
          source: '/teachers-w11',
          destination: '/circle-time-week11.html',
        },
        {
          source: '/teachers-w12',
          destination: '/circle-time-week12.html',
        },
        {
          source: '/teachers-w13',
          destination: '/circle-time-week13.html',
        },
        {
          source: '/teachers-w14',
          destination: '/circle-time-week14.html',
        },
        {
          source: '/teachers-w15',
          destination: '/circle-time-week15.html',
        },
        // January 2027 (weeks 16–20): Winter, Weather, Beijing, China, Chinese
        // New Year — the run through 除夕 (Fri 5 Feb) into the 春节 holiday.
        // Each also needs a middleware.ts publicPaths entry (page AND guide PDF).
        {
          source: '/teachers-w16',
          destination: '/circle-time-week16.html',
        },
        {
          source: '/teachers-w17',
          destination: '/circle-time-week17.html',
        },
        {
          source: '/teachers-w18',
          destination: '/circle-time-week18.html',
        },
        {
          source: '/teachers-w19',
          destination: '/circle-time-week19.html',
        },
        {
          source: '/teachers-w20',
          destination: '/circle-time-week20.html',
        },
        // May 2027 "Space" month (weeks 30–34 of the principal's plan). Same
        // shape as the two entries above: clean URL -> static file in public/.
        // Each also needs a middleware.ts publicPaths entry (page AND guide PDF).
        {
          source: '/teachers-w30',
          destination: '/circle-time-week30.html',
        },
        {
          source: '/teachers-w31',
          destination: '/circle-time-week31.html',
        },
        {
          source: '/teachers-w32',
          destination: '/circle-time-week32.html',
        },
        {
          source: '/teachers-w33',
          destination: '/circle-time-week33.html',
        },
        {
          source: '/teachers-w34',
          destination: '/circle-time-week34.html',
        },
        {
          source: '/dark-phonics-books/:path*',
          destination: '/api/montree/media/proxy/bucket/static-assets/dark-phonics-books/:path*',
        },
        {
          source: '/dark-phonics-materials/:path*',
          destination: '/api/montree/media/proxy/bucket/static-assets/dark-phonics-materials/:path*',
        },
        {
          source: '/satpin-books/:path*',
          destination: '/api/montree/media/proxy/bucket/static-assets/satpin-books/:path*',
        },
        {
          source: '/satpin-materials/:path*',
          destination: '/api/montree/media/proxy/bucket/static-assets/satpin-materials/:path*',
        },
        {
          source: '/shelf-packs/:path*',
          destination: '/api/montree/media/proxy/bucket/static-assets/shelf-packs/:path*',
        },
        {
          source: '/montree-splash-video.mp4',
          destination: '/api/montree/media/proxy/bucket/static-assets/videos/montree-splash-video.mp4',
        },
        {
          source: '/montree-splash-video-zh.mp4',
          destination: '/api/montree/media/proxy/bucket/static-assets/videos/montree-splash-video-zh.mp4',
        },
      ],
    };
  },

  // Enable Turbopack
  turbopack: {},

  // Experimental — merged into a single block. Capacitor builds get
  // excludeDefaultMomentLocales added; web + native both get
  // viewTransition (smooth nav) and optimizePackageImports (Tier 0.7
  // tree-shake for lucide-react).
  experimental: {
    viewTransition: true,
    optimizePackageImports: ['lucide-react'],
    ...(isCapacitorBuild ? { excludeDefaultMomentLocales: true } : {}),
  },

  // Webpack config for PWA
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('pg-native');
      }
    }
    return config;
  },

  // Turbopack: Resolve fflate dynamic Worker issue (jspdf dependency)
  // fflate/lib/node.cjs uses dynamic Worker creation that Turbopack can't statically analyze
  serverExternalPackages: ['jspdf', 'fflate', 'onnxruntime-node', 'sharp'],
};

// Only apply PWA for web builds
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" || isCapacitorBuild,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\//,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-images',
        expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: { maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
  ],
  buildExcludes: [
    /chunks\/app\/admin/,
    /chunks\/app\/api\/circle-plans\/generate/,
    /chunks\/app\/api\/phonics-plans\/generate/,
    /chunks\/app\/api\/circle-plans\/settings/,
  ],
});

export default isCapacitorBuild ? nextConfig : pwaConfig(nextConfig);
