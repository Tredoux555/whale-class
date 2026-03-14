'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '@/lib/montree/i18n';

interface PhotoLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current photo URL */
  src: string;
  alt?: string;
  /** Optional: all photos for prev/next navigation */
  photos?: Array<{ url: string; caption?: string | null; date?: string }>;
  /** Index into photos array for current photo */
  currentIndex?: number;
  /** Called when user navigates to a different photo */
  onNavigate?: (index: number) => void;
}

export default function PhotoLightbox({
  isOpen,
  onClose,
  src,
  alt,
  photos,
  currentIndex = 0,
  onNavigate,
}: PhotoLightboxProps) {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  // Reset zoom/position when photo changes or lightbox opens
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && photos && currentIndex > 0) {
        onNavigate?.(currentIndex - 1);
      }
      if (e.key === 'ArrowRight' && photos && currentIndex < photos.length - 1) {
        onNavigate?.(currentIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, photos, currentIndex, onNavigate]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => {
      const next = prev - e.deltaY * 0.002;
      return Math.min(Math.max(next, 0.5), 5);
    });
  }, []);

  // Pinch zoom for touch devices
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchCenter.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    } else if (e.touches.length === 1 && scale > 1) {
      // Single finger drag when zoomed in
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  }, [scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scaleFactor = distance / lastTouchDistance.current;
      setScale(prev => Math.min(Math.max(prev * scaleFactor, 0.5), 5));
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    setIsDragging(false);
  }, []);

  // Mouse drag when zoomed
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double-tap/click to toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  // Download photo
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Extract filename from URL or use default
      const urlParts = src.split('/');
      const filename = urlParts[urlParts.length - 1]?.split('?')[0] || 'photo.jpg';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
    setDownloading(false);
  };

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.5, 5));
  const zoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.5, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  const currentPhoto = photos?.[currentIndex];
  const hasPrev = photos && currentIndex > 0;
  const hasNext = photos && currentIndex < photos.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          {/* Close button */}
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
          {/* Photo counter */}
          {photos && photos.length > 1 && (
            <span className="text-white/70 text-sm">
              {currentIndex + 1} / {photos.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={zoomOut}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-lg transition-colors"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={resetZoom}
            className="px-2 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors min-w-[3rem]"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={zoomIn}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-lg transition-colors"
            aria-label="Zoom in"
          >
            +
          </button>
          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-lg transition-colors disabled:opacity-50"
            aria-label="Download photo"
          >
            {downloading ? '...' : '⬇'}
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in', touchAction: 'none' }}
      >
        <img
          src={src}
          alt={alt || currentPhoto?.caption || 'Photo'}
          className="max-w-full max-h-full object-contain select-none pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
          draggable={false}
        />

        {/* Navigation arrows */}
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate?.(currentIndex - 1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl transition-colors"
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}
        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate?.(currentIndex + 1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl transition-colors"
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>

      {/* Caption bar */}
      {currentPhoto?.caption && (
        <div className="px-4 py-3 bg-black/60 backdrop-blur-sm text-center">
          <p className="text-white/80 text-sm">{currentPhoto.caption}</p>
          {currentPhoto.date && (
            <p className="text-white/50 text-xs mt-1">
              {new Date(currentPhoto.date).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
