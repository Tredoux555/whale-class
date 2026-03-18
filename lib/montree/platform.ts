// lib/montree/platform.ts
// Platform detection for Capacitor native vs web browser
//
// Usage:
//   import { isNative, getPlatform } from '@/lib/montree/platform';
//   if (isNative()) { /* use Capacitor plugins */ }

/**
 * Detect if running inside Capacitor native shell (iOS/Android)
 * Uses feature detection, not user agent sniffing
 */
export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/**
 * Get the current platform
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return 'web';
  const platform = cap.getPlatform?.();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Check if the Capacitor Camera plugin is available
 */
export function hasNativeCamera(): boolean {
  if (!isNative()) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor?.Plugins?.Camera;
}

/**
 * Check if the Capacitor Filesystem plugin is available
 */
export function hasNativeFilesystem(): boolean {
  if (!isNative()) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor?.Plugins?.Filesystem;
}

/**
 * Check if the Capacitor Network plugin is available
 */
export function hasNativeNetwork(): boolean {
  if (!isNative()) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).Capacitor?.Plugins?.Network;
}
