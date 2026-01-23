// components/media/SyncStatus.tsx
// Shows sync status - minimal, unobtrusive
// Session 54: Deep audit - cleaner UI

'use client';

import { useMedia } from '@/lib/media/useMedia';

interface SyncStatusProps {
  className?: string;
  showLabel?: boolean;
}

export default function SyncStatus({ className = '', showLabel = true }: SyncStatusProps) {
  const { isOnline, isSyncing, pendingCount, failedCount, sync, retryFailed } = useMedia();

  // Show nothing if all good
  if (isOnline && pendingCount === 0 && failedCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Offline */}
      {!isOnline && (
        <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
          {showLabel && 'Offline'}
        </span>
      )}
      
      {/* Syncing */}
      {isSyncing && (
        <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          {showLabel && 'Syncing'}
        </span>
      )}
      
      {/* Pending */}
      {pendingCount > 0 && !isSyncing && (
        <button
          onClick={sync}
          className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium hover:bg-slate-200 transition-colors"
        >
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
          {pendingCount}
        </button>
      )}
      
      {/* Failed */}
      {failedCount > 0 && (
        <button
          onClick={retryFailed}
          className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium hover:bg-red-200 transition-colors"
        >
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          {failedCount} failed
        </button>
      )}
    </div>
  );
}
