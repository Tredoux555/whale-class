/**
 * PLATFORM DETECTION
 * 
 * Detects whether we're running on web or native (Capacitor)
 * Used to decide which data layer to use:
 * - Web: Supabase (cloud)
 * - Native: SQLite (local)
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if running in a native app (iOS/Android)
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if running on web
 */
export function isWeb(): boolean {
  return !isNative();
}

/**
 * Get the current platform
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  const platform = Capacitor.getPlatform();
  return platform as 'ios' | 'android' | 'web';
}

/**
 * Check if a specific plugin is available
 */
export function isPluginAvailable(name: string): boolean {
  return Capacitor.isPluginAvailable(name);
}

/**
 * Platform info object
 */
export const platform = {
  isNative: isNative(),
  isWeb: isWeb(),
  name: getPlatform(),
  hasSQLite: isPluginAvailable('CapacitorSQLite'),
  hasFilesystem: isPluginAvailable('Filesystem'),
};
