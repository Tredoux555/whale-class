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
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
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
              "media-src 'self' https://dmfncjjtsoxrnvcdnvjq.supabase.co",
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
  buildExcludes: [
    /chunks\/app\/admin/,
    /chunks\/app\/api\/circle-plans\/generate/,
    /chunks\/app\/api\/phonics-plans\/generate/,
    /chunks\/app\/api\/circle-plans\/settings/,
  ],
});

export default isCapacitorBuild ? nextConfig : pwaConfig(nextConfig);
