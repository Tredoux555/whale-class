// components/home/HomeMediaGallery.tsx
// Grid display of photos/videos with filters
// Filter by child, area, date; multi-select for bulk operations
// Responsive: 2 mobile, 3 tablet, 4 desktop

'use client';

import React, { useState, useMemo } from 'react';
import HomeMediaCard from './HomeMediaCard';

export interface HomeMediaItem {
  id: string;
  storage_path: string;
  thumbnail_path?: string;
  media_type: 'photo' | 'video';
  captured_at: string;
  child_id?: string;
  child_name?: string;
  work_id?: string;
  work_name?: string;
  area?: string;
  caption?: string;
}

interface HomeMediaGalleryProps {
  media: HomeMediaItem[];
  children?: Array<{ id: string; name: string }>;
  works?: Array<{ id: string; name: string; area: string }>;
  thumbnailUrls?: Record<string, string>;
  loading?: boolean;
  onMediaClick?: (media: HomeMediaItem) => void;
  onMediaEdit?: (media: HomeMediaItem) => void;
  onMediaDelete?: (media: HomeMediaItem) => void;
  emptyMessage?: string;
  emptyIcon?: string;
}

export default function HomeMediaGallery({
  media,
  children = [],
  works = [],
  thumbnailUrls = {},
  loading = false,
  onMediaClick,
  onMediaEdit,
  onMediaDelete,
  emptyMessage = 'No photos or videos yet',
  emptyIcon = '📷',
}: HomeMediaGalleryProps) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Build lookup maps
  const childNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    children.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [children]);

  const areas = useMemo(() => {
    return Array.from(new Set(media.map((m) => m.area).filter(Boolean)));
  }, [media]);

  // Filter media
  const filteredMedia = useMemo(() => {
    return media.filter((item) => {
      if (selectedChildId && item.child_id !== selectedChildId) return false;
      if (selectedArea && item.area !== selectedArea) return false;
      return true;
    });
  }, [media, selectedChildId, selectedArea]);

  // Handle selection
  const handleSelectionChange = (id: string, selected: boolean) => {
    const newSet = new Set(selectedIds);
    if (selected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMedia.map((m) => m.id)));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="text-5xl mb-4">{emptyIcon}</div>
        <p className="text-lg">{emptyMessage}</p>
        <p className="text-sm mt-2">Photos and videos you capture will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="space-y-4">
        {/* Child Filter */}
        {children.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Child:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedChildId(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedChildId === null
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildId(child.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedChildId === child.id
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Area Filter */}
        {areas.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Area:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedArea(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedArea === null
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {areas.map((area) => (
                <button
                  key={area}
                  onClick={() => setSelectedArea(area)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedArea === area
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selection Controls */}
        <div className="flex items-center justify-between">
          {filteredMedia.length > 0 && (
            <>
              <button
                onClick={() => setSelectionMode(!selectionMode)}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {selectionMode ? '✓ Done' : 'Select'}
              </button>

              {selectionMode && (
                <>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {selectedIds.size === filteredMedia.length ? 'Deselect All' : 'Select All'}
                  </button>

                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">
                        {selectedIds.size} selected
                      </span>
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-xs px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-full transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <p className="text-sm">No photos match your filters</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {filteredMedia.map((item) => (
            <HomeMediaCard
              key={item.id}
              media={item}
              childName={item.child_id ? childNameMap[item.child_id] : undefined}
              thumbnailUrl={
                thumbnailUrls[item.thumbnail_path || item.storage_path]
              }
              onClick={() => onMediaClick?.(item)}
              onEdit={() => onMediaEdit?.(item)}
              onDelete={() => onMediaDelete?.(item)}
              isSelected={selectedIds.has(item.id)}
              onSelectionChange={(selected) =>
                handleSelectionChange(item.id, selected)
              }
              selectionMode={selectionMode}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredMedia.length} of {media.length} items
      </div>
    </div>
  );
}
