import type { NextConfig } from "next";

/**
 * CAPACITOR BUILD CONFIG
 * 
 * Static export for native apps.
 * API routes are excluded - native uses SQLite directly.
 */
const nextConfig: NextConfig = {
  // Static export for Capacitor
  output: 'export',
  
  // Trailing slashes for static hosting
  trailingSlash: true,
  
  // No image optimization in static export
  images: {
    unoptimized: true,
  },
  
  // Ignore TypeScript errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Transpile server-only modules
  transpilePackages: ['jose', 'bcryptjs'],
};

export default nextConfig;
