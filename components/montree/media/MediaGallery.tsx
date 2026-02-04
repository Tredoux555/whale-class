// components/montree/media/MediaGallery.tsx
// Grid display of media items
// Phase 2 - Session 53

'use client';

import React from 'react';
import MediaCard from './MediaCard';
import type { MontreeMedia, MontreeChild } from '@/lib/montree/media/types';

interface MediaGalleryProps {
  media: MontreeMedia[];
  children?: MontreeChild[];
  thumbnailUrls?: Record<string, string>;
  loading?: boolean;
  onMediaClick?: (media: MontreeMedia) => void;
  onMediaEdit?: (media: MontreeMedia) => void;
  onMediaDelete?: (media: MontreeMedia) => void;
  emptyMessage?: string;
  emptyIcon?: string;
  columns?: 2 | 3 | 4;
  selectedIds?: Set<string>;
  onSelectionChange?: (id: string, selected: boolean) => void;
  selectionMode?: boolean;
  showActions?: boolean;
}

export default function MediaGallery({
  media,
  children = [],
  thumbnailUrls = {},
  loading = false,
  onMediaClick,
  onMediaEdit,
  onMediaDelete,
  emptyMessage = 'No photos yet',
  emptyIcon = '📷',
  columns = 3,
  selectedIds = new Set(),
  onSelectionChange,
  selectionMode = false,
  showActions = true,
}: MediaGalleryProps) {
  // Build child name lookup
  const childNameMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    children.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [children]);

  // Loading state
  if (loading) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-100 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-5xl mb-4">{emptyIcon}</div>
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }

  // Grid display
  const gridClass = columns === 2
    ? 'grid-cols-2'
    : columns === 4
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className={`grid gap-3 ${gridClass}`}>
      {media.map((item) => (
        <MediaCard
          key={item.id}
          media={item}
          childName={item.child_id ? childNameMap[item.child_id] : undefined}
          thumbnailUrl={thumbnailUrls[item.thumbnail_path || item.storage_path]}
          onClick={() => onMediaClick?.(item)}
          onEdit={() => onMediaEdit?.(item)}
          onDelete={() => onMediaDelete?.(item)}
          isSelected={selectedIds.has(item.id)}
          onSelectionChange={(selected) => onSelectionChange?.(item.id, selected)}
          selectionMode={selectionMode}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
