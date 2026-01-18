// components/montree/media/MediaCard.tsx
// Single media item display card
// Phase 2 - Session 53

'use client';

import React, { useState, useEffect } from 'react';
import type { MontreeMedia } from '@/lib/montree/media/types';

interface MediaCardProps {
  media: MontreeMedia;
  childName?: string;
  thumbnailUrl?: string;
  onClick?: () => void;
  showDate?: boolean;
  showChild?: boolean;
}

export default function MediaCard({
  media,
  childName,
  thumbnailUrl,
  onClick,
  showDate = true,
  showChild = true,
}: MediaCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(thumbnailUrl || null);
  const [loading, setLoading] = useState(!thumbnailUrl);
  const [error, setError] = useState(false);

  // Fetch signed URL if not provided
  useEffect(() => {
    if (thumbnailUrl) return;

    const fetchUrl = async () => {
      try {
        const path = media.thumbnail_path || media.storage_path;
        const response = await fetch(`/api/montree/media/url?path=${encodeURIComponent(path)}`);
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
  }, [media.thumbnail_path, media.storage_path, thumbnailUrl]);

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
      day: 'numeric' 
    });
  };

  return (
    <button
      onClick={onClick}
      className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group hover:ring-2 hover:ring-blue-500 transition-all"
    >
      {/* Image */}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
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
          Untagged
        </div>
      )}
    </button>
  );
}
