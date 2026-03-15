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
  
  // Exclude dynamic routes from static export
  ...(isCapacitorBuild ? {
    experimental: {
      // Exclude these pages from static export - they use query params in native
      excludeDefaultMomentLocales: true,
    }
  } : {}),
  
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

  // DOMAIN ISOLATION:
  // montree.xyz root → /montree (Montree landing page)
  // teacherpotato.xyz stays as-is (Whale Class video site)
  // NOTE: Using 302 (temporary) instead of 301 (permanent) to prevent
  // browser caching issues if domains are reconfigured in future.
  // Middleware also enforces domain isolation as a secondary check.
  // Security headers — applied to all responses
  async headers() {
    return [
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
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://dmfncjjtsoxrnvcdnvjq.supabase.co",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://dmfncjjtsoxrnvcdnvjq.supabase.co https://www.googleapis.com",
              "media-src 'self' blob: https://dmfncjjtsoxrnvcdnvjq.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
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
  
  // Enable Turbopack
  turbopack: {},

  // View Transitions API for smooth page navigation
  experimental: {
    viewTransition: true,
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
