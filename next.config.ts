import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  // Use webpack instead of Turbopack for PWA compatibility
  webpack: (config, { isServer }) => {
    // Optimize bundle size by externalizing large JSON files when possible
    if (isServer) {
      // Externalize native modules for serverless compatibility
      // Note: jose and bcryptjs are pure JS, so they should be bundled
      if (!config.externals) {
        config.externals = [];
      }
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
