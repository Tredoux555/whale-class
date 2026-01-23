// components/media/SyncStatus.tsx
// Shows sync status badge with pending count
// Session 54: Visual feedback for offline-first system

'use client';

import { useMedia } from '@/lib/media/useMedia';

interface SyncStatusProps {
  className?: string;
  showLabel?: boolean;
}

export default function SyncStatus({ className = '', showLabel = true }: SyncStatusProps) {
  const { isOnline, isSyncing, pendingCount, failedCount, sync, retryFailed } = useMedia();

  // Nothing to show if all synced and online
  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Offline indicator */}
      {!isOnline && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
          <span className="w-2 h-2 bg-amber-500 rounded-full" />
          {showLabel && 'Offline'}
        </span>
      )}
      
      {/* Syncing indicator */}
      {isSyncing && (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          {showLabel && 'Syncing...'}
        </span>
      )}
      
      {/* Pending count */}
      {pendingCount > 0 && !isSyncing && (
        <button
          onClick={sync}
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
          title="Tap to sync now"
        >
          <span className="w-2 h-2 bg-blue-500 rounded-full" />
          {pendingCount} pending
        </button>
      )}
      
      {/* Failed uploads */}
      {failedCount > 0 && (
        <button
          onClick={retryFailed}
          className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
          title="Tap to retry"
        >
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          {failedCount} failed
        </button>
      )}
    </div>
  );
}
