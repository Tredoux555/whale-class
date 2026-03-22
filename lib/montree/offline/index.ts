// lib/montree/offline/index.ts
// Barrel exports for the offline photo queue system

export type { PhotoQueueEntry, PhotoQueueStats, SyncResult, UploadProgress } from './types';
export { MAX_RETRIES, MAX_QUEUE_SIZE } from './types';

export {
  enqueuePhoto,
  syncQueue,
  retryEntry,
  isSyncing,
  addSyncListener,
} from './sync-manager';
export type { EnqueueOptions, SyncEvent } from './sync-manager';

export {
  getQueueStats,
  getEntriesForChild,
  getAllEntries,
  getBlob,
} from './queue-store';

export { registerSyncTriggers } from './sync-triggers';
