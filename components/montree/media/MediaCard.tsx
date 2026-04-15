// components/montree/media/MediaCard.tsx
// Single media item display card
// Phase 2 - Session 53

'use client';

import React, { useState } from 'react';
import type { MontreeMedia } from '@/lib/montree/media/types';
import { useI18n } from '@/lib/montree/i18n';
import { getThumbnailUrl, getThumbnailSrcSet } from '@/lib/montree/media/proxy-url';

interface MediaCardProps {
  media: MontreeMedia;
  childName?: string;
  thumbnailUrl?: string;
  onClick?: () => void;
  showDate?: boolean;
  showChild?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  selectionMode?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

export default function MediaCard({
  media,
  childName,
  thumbnailUrl,
  onClick,
  showDate = true,
  showChild = true,
  isSelected = false,
  onSelectionChange,
  selectionMode = false,
  onEdit,
  onDelete,
  showActions = true,
}: MediaCardProps) {
  const { t, locale } = useI18n();
  // Proxy URL is deterministic from storage_path (public bucket, Cloudflare-cached).
  // No network round-trip needed — skip the fetch entirely.
  const thumbPath = media.thumbnail_path || media.storage_path;
  const imageUrl = thumbnailUrl || (thumbPath ? getThumbnailUrl(thumbPath, 400) : null);
  const imageSrcSet = !thumbnailUrl && thumbPath ? getThumbnailSrcSet(thumbPath, 400) : undefined;
  const [error, setError] = useState(false);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('media.justNow');
    if (diffMins < 60) return t('media.minutesAgo').replace('{m}', diffMins.toString());
    if (diffHours < 24) return t('media.hoursAgo').replace('{h}', diffHours.toString());
    if (diffDays < 7) return t('media.daysAgo').replace('{d}', diffDays.toString());

    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode) {
      e.preventDefault();
      onSelectionChange?.(!isSelected);
    } else {
      onClick?.();
    }
  };

  return (
    <div
      className="relative aspect-square group"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 200px' }}
    >
      <button
        onClick={handleClick}
        className={`relative inset-0 w-full h-full bg-gray-100 rounded-xl overflow-hidden transition-all ${
          selectionMode ? 'cursor-pointer' : ''
        } ${
          isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:ring-2 hover:ring-blue-500'
        }`}
      >
        {/* Image */}
        {error || !imageUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <span className="text-3xl">📷</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            srcSet={imageSrcSet}
            sizes="(max-width: 640px) 50vw, 400px"
            alt={media.caption || 'Photo'}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setError(true)}
          />
        )}

        {/* Video indicator */}
        {media.media_type === 'video' && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">▶</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Action buttons */}
        {showActions && !selectionMode && (onEdit || onDelete) && (
          <div className="absolute top-2 left-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="flex-1 px-2 py-1 bg-emerald-500 text-white rounded text-xs font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1"
              >
                ✏️ Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex-1 px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        )}

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {showChild && childName && (
            <p className="text-white text-sm font-medium truncate">{childName}</p>
          )}
          {showDate && (
            <p className="text-white/70 text-xs">{formatDate(media.captured_at)}</p>
          )}
        </div>

        {/* Untagged indicator */}
        {!media.child_id && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 text-white text-xs font-medium rounded-full">
            {t('media.untagged')}
          </div>
        )}
      </button>

      {/* Selection checkbox */}
      {selectionMode && (
        <div className="absolute top-2 right-2 w-6 h-6">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectionChange?.(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full cursor-pointer accent-blue-500"
          />
        </div>
      )}
    </div>
  );
}
