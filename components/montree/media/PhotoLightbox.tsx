'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '@/lib/montree/i18n';

/** A rectangle in ORIGINAL (natural) image pixels — integers, inside bounds. */
export interface PhotoCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

  // ── NEW, all optional ──
  /** Present ⇒ a 🗑 button renders at the RIGHT end of the top toolbar.
   *  The lightbox NEVER deletes anything itself — it just reports the index.
   *  The parent owns confirmation and the API call. */
  onDelete?: (index: number) => void;
  /** Accessible name / title for the bin. Parent passes t('gallery.deletePhoto'). */
  deleteLabel?: string;
  /** Parent is mid-delete: bin shows a spinner and is disabled. */
  deleting?: boolean;

  /** Present ⇒ a pill renders BOTTOM-RIGHT over the image. */
  onPrimaryAction?: () => void;
  /** Pill text. Parent passes `🎬 ${t('montageTracker.create.button')}`. */
  primaryActionLabel?: string;
  /** Greys the pill out and blocks the click (e.g. below the montage floor). */
  primaryActionDisabled?: boolean;

  /** Present ⇒ a ✂ pill renders BOTTOM-LEFT over the image, but only while the
   *  teacher is zoomed in (at 1× the whole photo is visible — nothing to crop).
   *  The lightbox NEVER crops anything itself: it reports the index and the
   *  CURRENTLY VISIBLE viewport in original-image pixels, and the parent owns
   *  the API call. Pinch/pan to frame, tap ✂ — what you see is the crop. */
  onCrop?: (index: number, crop: PhotoCropRect) => void;
  /** Pill text. Parent passes t('gallery.cropPhoto'). */
  cropLabel?: string;
  /** Parent is mid-save: pill shows a busy state and is disabled. */
  cropping?: boolean;
}

export default function PhotoLightbox({
  isOpen,
  onClose,
  src,
  alt,
  photos,
  currentIndex = 0,
  onNavigate,
  onDelete,
  deleteLabel,
  deleting = false,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionDisabled = false,
  onCrop,
  cropLabel,
  cropping = false,
}: PhotoLightboxProps) {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const [swipeDx, setSwipeDx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
  const swipeRef = useRef<{ x: number; y: number; dx: number; dy: number } | null>(null);

  // Reset zoom/position when photo changes or lightbox opens
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setSwipeDx(0);
    swipeRef.current = null;
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
      // A second finger promotes the gesture to a pinch — abandon any swipe
      // already in progress, or its stale dx offsets the image for the whole
      // zoom and could still commit a navigation on release.
      if (swipeRef.current) {
        swipeRef.current = null;
        setSwipeDx(0);
      }
    } else if (e.touches.length === 1 && scale > 1) {
      // Single finger drag when zoomed in
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    } else if (e.touches.length === 1 && scale === 1) {
      // Single finger swipe to navigate (only when not zoomed)
      swipeRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        dx: 0,
        dy: 0,
      };
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
    } else if (e.touches.length === 1 && swipeRef.current) {
      const dx = e.touches[0].clientX - swipeRef.current.x;
      const dy = e.touches[0].clientY - swipeRef.current.y;
      swipeRef.current.dx = dx;
      swipeRef.current.dy = dy;
      setSwipeDx(dx);
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    setIsDragging(false);

    const swipe = swipeRef.current;
    swipeRef.current = null;
    setSwipeDx(0);
    if (swipe && Math.abs(swipe.dx) > 60 && Math.abs(swipe.dx) > Math.abs(swipe.dy) * 1.5) {
      if (swipe.dx < 0 && photos && currentIndex < photos.length - 1) {
        onNavigate?.(currentIndex + 1);
      } else if (swipe.dx > 0 && photos && currentIndex > 0) {
        onNavigate?.(currentIndex - 1);
      }
    }
  }, [photos, currentIndex, onNavigate]);

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

  // ── viewport → ORIGINAL-pixel mapping ────────────────────────────────────
  // Layout: the <img> is centred in the container by flex and carries
  // `object-contain` inside its own layout box; on top of that sits
  // `transform: translate(tx,ty) scale(s)` with the DEFAULT transform-origin
  // (the element's centre). For a point p measured from that centre the matrix
  // T·S gives p' = t + s·p — so scaling never moves the centre, only t does.
  //
  //   LW,LH = img.offsetWidth/Height   layout box, unaffected by the transform
  //   nW,nH = img.naturalWidth/Height  the original pixels we must report
  //   CW,CH = the container box        = exactly what the teacher can see
  //
  //   contentScale = min(LW/nW, LH/nH)   css px per natural px at s = 1
  //   q            = contentScale · s    css px per natural px on screen
  //   centre on screen:  cx = CW/2 + tx ,  cy = CH/2 + ty
  //   object-position defaults to 50% 50%, so the letterboxed CONTENT box is
  //   concentric with the element box — its centre is (cx,cy) too, and the
  //   letterbox offsets cancel out. Its top-left is therefore
  //     contentLeft = cx − nW·q/2 ,  contentTop = cy − nH·q/2
  //   The visible region, in natural pixels, is the container box expressed in
  //   that space:  x0 = −contentLeft/q ,  y0 = −contentTop/q ,
  //                x1 = (CW − contentLeft)/q ,  y1 = (CH − contentTop)/q
  //   …then clamped to [0,nW]×[0,nH], because when zoomed the viewport usually
  //   spills past the image edges (and at low zoom it always does).
  //
  // Deliberately computed from STATE, not getBoundingClientRect(): the image
  // carries a 0.2s transform transition, so a rect read right after a pinch
  // would be a mid-animation lie.
  /** The visible viewport in original image pixels, or null if unmeasurable. */
  const computeVisibleCrop = (): PhotoCropRect | null => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return null;

    const nW = img.naturalWidth;
    const nH = img.naturalHeight;
    const LW = img.offsetWidth;
    const LH = img.offsetHeight;
    const box = container.getBoundingClientRect();
    const CW = box.width;
    const CH = box.height;
    if (!nW || !nH || !LW || !LH || !CW || !CH || !(scale > 0)) return null;

    const q = Math.min(LW / nW, LH / nH) * scale;
    if (!(q > 0)) return null;

    const tx = position.x + swipeDx * 0.4;
    const ty = position.y;
    const contentLeft = CW / 2 + tx - (nW * q) / 2;
    const contentTop = CH / 2 + ty - (nH * q) / 2;

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
    const x = Math.round(clamp(-contentLeft / q, 0, nW));
    const y = Math.round(clamp(-contentTop / q, 0, nH));
    const right = Math.round(clamp((CW - contentLeft) / q, 0, nW));
    const bottom = Math.round(clamp((CH - contentTop) / q, 0, nH));

    const width = Math.min(right - x, nW - x);
    const height = Math.min(bottom - y, nH - y);
    if (width < 1 || height < 1) return null;
    return { x, y, width, height };
  };

  const handleCropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cropping || !onCrop) return;
    const rect = computeVisibleCrop();
    if (!rect) {
      console.warn('[PhotoLightbox] crop skipped — viewport not measurable yet');
      return;
    }
    onCrop(currentIndex, rect);
  };

  if (!isOpen) return null;

  const currentPhoto = photos?.[currentIndex];
  const hasPrev = photos && currentIndex > 0;
  const hasNext = photos && currentIndex < photos.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      {/* Top toolbar — padded for iOS safe area (notch/dynamic island) */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm z-10" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
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
          {/* Delete button — only when the parent wants a bin here */}
          {onDelete && (
            <button
              onClick={() => onDelete(currentIndex)}
              disabled={deleting}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/80 text-white text-lg transition-colors disabled:opacity-50"
              aria-label={deleteLabel || 'Delete'}
              title={deleteLabel || 'Delete'}
            >
              {deleting ? '...' : '🗑'}
            </button>
          )}
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
          ref={imgRef}
          src={src}
          alt={alt || currentPhoto?.caption || 'Photo'}
          className="max-w-full max-h-full object-contain select-none pointer-events-none"
          style={{
            transform: `translate(${position.x + swipeDx * 0.4}px, ${position.y}px) scale(${scale})`,
            transition: isDragging || swipeDx !== 0 ? 'none' : 'transform 0.2s ease-out',
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

        {/* Primary action pill — only when the parent wants one (e.g. "Create montage") */}
        {onPrimaryAction && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!primaryActionDisabled) onPrimaryAction();
            }}
            disabled={primaryActionDisabled}
            className="absolute z-10 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            style={{
              right: 16,
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
              backgroundColor: primaryActionDisabled ? 'rgba(52,211,153,0.30)' : '#34d399',
              color: '#062015',
              pointerEvents: primaryActionDisabled ? 'none' : 'auto',
            }}
          >
            {primaryActionLabel || 'Create'}
          </button>
        )}

        {/* Crop pill — BOTTOM-LEFT, the only free corner (✕ top-left in the
            toolbar, 🗑 at the toolbar's right end, the primary pill
            bottom-right). Hidden at 1× on purpose: the whole photo is visible
            there, so a "crop to what you see" would be a no-op. It lives INSIDE
            the image container exactly like the Create pill, so the swipe
            handlers keep working around it; e.stopPropagation() in the handler
            is required because the container carries onDoubleClick zoom. */}
        {onCrop && scale > 1 && (
          <button
            onClick={handleCropClick}
            disabled={cropping}
            className="absolute z-10 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            style={{
              left: 16,
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
              backgroundColor: 'rgba(255,255,255,0.14)',
              color: '#fff',
              opacity: cropping ? 0.6 : 1,
              pointerEvents: cropping ? 'none' : 'auto',
            }}
            aria-label={cropLabel || 'Crop'}
            title={cropLabel || 'Crop'}
          >
            {cropping ? '…' : `✂ ${cropLabel || 'Crop'}`}
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
