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

  // Both www and non-www work now via Railway custom domains
  // Redirect temporarily disabled for debugging mobile access issue
  // async redirects() {
  //   return [
  //     {
  //       source: '/:path*',
  //       has: [{ type: 'host', value: 'teacherpotato.xyz' }],
  //       destination: 'https://www.teacherpotato.xyz/:path*',
  //       permanent: true,
  //     },
  //   ];
  // },
  
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
