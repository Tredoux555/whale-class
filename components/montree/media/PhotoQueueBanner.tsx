// components/montree/media/PhotoQueueBanner.tsx
// Shows upload queue status in gallery: pending count, progress, retry button
'use client';

import { usePhotoQueue } from '@/hooks/usePhotoQueue';
import { useI18n } from '@/lib/montree/i18n';

interface PhotoQueueBannerProps {
  childId?: string;
}

export default function PhotoQueueBanner({ childId }: PhotoQueueBannerProps) {
  const { t } = useI18n();
  const { stats, sync, syncing } = usePhotoQueue(childId);

  if (!stats) return null;

  const pendingCount = stats.pending + stats.uploading + stats.failed;
  if (pendingCount === 0 && stats.permanent_failure === 0) return null;

  const totalActive = pendingCount + stats.uploaded;
  const progressPct = totalActive > 0 ? Math.round((stats.uploaded / totalActive) * 100) : 0;
  const pendingMB = (stats.total_bytes_pending / 1024 / 1024).toFixed(1);

  return (
    <div className="mx-4 mb-3">
      {/* Pending/uploading banner */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              {syncing ? (
                <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full" />
              ) : (
                <span className="text-amber-600 text-sm">📷</span>
              )}
              <span className="text-sm font-medium text-amber-800">
                {syncing
                  ? `${t('offline.uploading') || 'Uploading'} ${stats.uploading} ${t('offline.photo') || 'photo'}${stats.uploading !== 1 ? 's' : ''}...`
                  : `${pendingCount} ${t('offline.photo') || 'photo'}${pendingCount !== 1 ? 's' : ''} ${t('offline.waitingToUpload') || 'waiting to upload'}`
                }
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600">{pendingMB} MB</span>
              {!syncing && (
                <button
                  onClick={() => sync()}
                  className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded hover:bg-amber-200 transition-colors"
                >
                  {t('offline.syncNow') || 'Sync now'}
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {totalActive > 0 && (
            <div className="bg-white rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Permanent failure banner */}
      {stats.permanent_failure > 0 && (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${pendingCount > 0 ? 'mt-2' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">
              {stats.permanent_failure} {t('offline.photo') || 'photo'}{stats.permanent_failure !== 1 ? 's' : ''} {t('offline.failedToUpload') || 'failed to upload'}
            </span>
            <button
              onClick={() => sync()}
              className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded hover:bg-red-200 transition-colors"
            >
              {t('offline.retryAll') || 'Retry all'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
