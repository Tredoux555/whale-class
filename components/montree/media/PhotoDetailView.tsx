// components/montree/media/PhotoDetailView.tsx
// Simple read-only photo viewer modal
'use client';

import React, { useState, useEffect } from 'react';
import type { MontreeMedia } from '@/lib/montree/media/types';
import { AREA_CONFIG } from '@/lib/montree/types';

interface PhotoDetailViewProps {
  media: MontreeMedia | null;
  childName?: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMediaUpdated?: (updatedMedia: MontreeMedia) => void;
}

export default function PhotoDetailView({
  media,
  childName,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onMediaUpdated,
}: PhotoDetailViewProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load image URL
  useEffect(() => {
    if (!media || !isOpen) return;

    setLoading(true);
    const fetchUrl = async () => {
      try {
        const response = await fetch(
          `/api/montree/media/url?path=${encodeURIComponent(media.storage_path)}`
        );
        const data = await response.json();
        if (data.url) {
          setImageUrl(data.url);
        }
      } catch (err) {
        console.error('Failed to fetch image URL:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [media, isOpen]);

  if (!isOpen || !media) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAreaConfig = (area: string | null | undefined) => {
    if (!area) return { name: 'Untagged', icon: '📋', color: '#888' };
    return AREA_CONFIG[area as keyof typeof AREA_CONFIG] || { name: area, icon: '📋', color: '#888' };
  };

  const areaConfig = getAreaConfig(media.area);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <h2 className="text-lg font-bold text-gray-800">Photo Details</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-white/50 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Image */}
        <div className="bg-gray-900 aspect-video relative overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={media.caption || 'Photo'}
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-600">
              <span className="text-4xl">📷</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>📅</span>
            <span>{formatDate(media.captured_at)}</span>
          </div>

          {/* Captured by */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>👤</span>
            <span>Captured by {media.captured_by}</span>
          </div>

          {/* Area and Work */}
          {(media.area || media.work_id) && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-3 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{areaConfig.icon}</span>
                <div className="flex-1">
                  {media.area && (
                    <p className="text-sm font-semibold text-emerald-900">{areaConfig.name}</p>
                  )}
                  {media.work_id && (
                    <p className="text-xs text-emerald-700">Work: {media.work_id}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Child assignment */}
          {childName && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Child:</span> {childName}
              </p>
            </div>
          )}

          {/* Caption */}
          {media.caption && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-900 mb-1">Caption:</p>
              <p className="text-sm text-amber-900">{media.caption}</p>
            </div>
          )}

          {/* Tags */}
          {media.tags && media.tags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Tags:</p>
              <div className="flex flex-wrap gap-2">
                {media.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-gray-500 pt-2 border-t">
            <p>ID: {media.id}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          {(onEdit || onDelete) && (
            <>
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  ✏️ Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete();
                    onClose();
                  }}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                >
                  🗑️ Delete
                </button>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className={`px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors ${
              (onEdit || onDelete) ? 'flex-1' : 'w-full'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
