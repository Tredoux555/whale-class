declare module "next-pwa" {
  import { NextConfig } from "next";

  /**
   * One Workbox runtime-caching rule, as next-pwa forwards them to
   * `workbox-build`. Only the fields next.config.ts actually uses are named —
   * the index signature keeps any other Workbox option assignable rather than
   * making this declaration a second place to maintain the full Workbox API.
   */
  interface PWARuntimeCaching {
    urlPattern: RegExp | string;
    handler:
      | "CacheFirst"
      | "CacheOnly"
      | "NetworkFirst"
      | "NetworkOnly"
      | "StaleWhileRevalidate";
    method?: string;
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      networkTimeoutSeconds?: number;
      cacheableResponse?: { statuses?: number[]; headers?: Record<string, string> };
      [option: string]: unknown;
    };
  }

  interface PWAConfig {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    buildExcludes?: RegExp[];
    /**
     * Workbox runtime-caching rules. next.config.ts has passed these since the
     * PWA was set up; this declaration simply did not list the option, so the
     * whole config object failed its excess-property check.
     */
    runtimeCaching?: PWARuntimeCaching[];
  }

  function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  export default withPWA;
}
