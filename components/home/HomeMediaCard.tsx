// components/home/HomeMediaCard.tsx
// Single media card for gallery display
// Shows thumbnail, video indicator, info on hover, selection mode

'use client';

import React, { useState, useEffect } from 'react';

export interface HomeMediaItem {
  id: string;
  storage_path: string;
  thumbnail_path?: string;
  media_type: 'photo' | 'video';
  captured_at: string;
  child_id?: string;
  work_name?: string;
  area?: string;
  caption?: string;
}

interface HomeMediaCardProps {
  media: HomeMediaItem;
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
}

export default function HomeMediaCard({
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
}: HomeMediaCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(thumbnailUrl || null);
  const [loading, setLoading] = useState(!thumbnailUrl);
  const [error, setError] = useState(false);

  // Fetch signed URL if not provided
  useEffect(() => {
    if (thumbnailUrl) return;

    const fetchUrl = async () => {
      try {
        const path = media.storage_path;
        const response = await fetch(`/api/home/media/url?path=${encodeURIComponent(path)}`);
        const data = await response.json();

        if (data.url) {
          setImageUrl(data.url);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [media.storage_path, thumbnailUrl]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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
    <div className="relative aspect-square group">
      <button
        onClick={handleClick}
        className={`relative inset-0 w-full h-full bg-gray-100 rounded-xl overflow-hidden transition-all ${
          selectionMode ? 'cursor-pointer' : ''
        } ${
          isSelected
            ? 'ring-2 ring-emerald-500 ring-offset-2'
            : 'hover:ring-2 hover:ring-emerald-500'
        }`}
      >
        {/* Image */}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : error || !imageUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <span className="text-3xl">📷</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={media.caption || 'Photo'}
            className="absolute inset-0 w-full h-full object-cover"
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
        {!selectionMode && (onEdit || onDelete) && (
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
            <p className="text-white text-xs font-semibold truncate">{childName}</p>
          )}
          {media.work_name && (
            <p className="text-white/80 text-xs truncate">{media.work_name}</p>
          )}
          {showDate && (
            <p className="text-white/70 text-[10px]">{formatDate(media.captured_at)}</p>
          )}
        </div>

        {/* Untagged indicator */}
        {!media.child_id && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 text-white text-xs font-medium rounded-full">
            Untagged
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
            className="w-full h-full cursor-pointer accent-emerald-500"
          />
        </div>
      )}
    </div>
  );
}
