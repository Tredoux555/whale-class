'use client';

import { useEffect, useCallback } from 'react';

interface VaultImageViewerProps {
  imageUrl: string;
  filename: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  albumIndex?: number;
  albumTotal?: number;
  loading?: boolean;
}

export function VaultImageViewer({
  imageUrl,
  filename,
  onClose,
  onPrev,
  onNext,
  albumIndex,
  albumTotal,
  loading,
}: VaultImageViewerProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && onPrev) onPrev();
    if (e.key === 'ArrowRight' && onNext) onNext();
  }, [onClose, onPrev, onNext]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const hasAlbum = typeof albumTotal === 'number' && albumTotal > 1;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          {hasAlbum && (
            <span className="text-white/50 text-sm font-medium whitespace-nowrap">
              {(albumIndex ?? 0) + 1} / {albumTotal}
            </span>
          )}
          <p className="text-white/80 text-sm truncate">{filename}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-white/70 hover:text-white transition-colors text-2xl font-light w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
        >
          ×
        </button>
      </div>

      {/* Main image area with nav arrows */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-2 pb-4">
        {/* Prev arrow */}
        {hasAlbum && onPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-all text-2xl"
            aria-label="Previous"
          >
            ‹
          </button>
        )}

        {/* Image */}
        <div className="flex items-center justify-center w-full h-full" onClick={e => e.stopPropagation()}>
          {loading ? (
            <div className="text-white/60 text-lg">Loading...</div>
          ) : (
            <img
              src={imageUrl}
              alt={filename}
              className="max-w-full max-h-full object-contain rounded-lg select-none"
              draggable={false}
            />
          )}
        </div>

        {/* Next arrow */}
        {hasAlbum && onNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-all text-2xl"
            aria-label="Next"
          >
            ›
          </button>
        )}
      </div>

      {/* Bottom hint */}
      <div className="text-center text-white/30 text-xs pb-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {hasAlbum ? '← → to browse · ESC to close' : 'ESC to close'}
      </div>
    </div>
  );
}
