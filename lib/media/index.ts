// lib/media/index.ts
// Public API - everything components need
// Session 54: Clean, simple interface

export * from './types';
export * from './capture';
export { initSync, subscribeSyncState, getSyncState, syncNow, retryFailedUploads } from './sync';
export { getStorageUsage, cleanupOldMedia } from './db';
