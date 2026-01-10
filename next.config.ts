import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  // Ignore TypeScript errors during builds (fix later)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Allow external images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dmfncjjtsoxrnvcdnvjq.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Transpile server-only modules (bcryptjs v3 is ESM-only)
  transpilePackages: ['jose', 'bcryptjs'],
  // Explicitly disable turbopack to use webpack (PostCSS needs webpack)
  // turbopack: {},
  // Use webpack instead of Turbopack for PWA compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Only externalize optional native dependencies
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('pg-native');
      }
    }
    return config;
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Exclude admin routes and API generate routes from precaching
  // This prevents the service worker from trying to fetch admin-related resources
  // which could trigger Great Firewall issues in China
  buildExcludes: [
    /chunks\/app\/admin/,
    /chunks\/app\/api\/circle-plans\/generate/,
    /chunks\/app\/api\/phonics-plans\/generate/,
    /chunks\/app\/api\/circle-plans\/settings/,
  ],
});

export default pwaConfig(nextConfig);
