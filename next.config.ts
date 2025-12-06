import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  // Use webpack instead of Turbopack for PWA compatibility
  webpack: (config, { isServer }) => {
    // Optimize bundle size by externalizing large JSON files when possible
    if (isServer) {
      config.externals = config.externals || [];
      // Don't bundle large JSON files into serverless functions unnecessarily
      // They'll be loaded dynamically at runtime
    }
    return config;
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

export default pwaConfig(nextConfig);
