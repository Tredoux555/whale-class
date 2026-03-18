'use client';

import { useI18n } from '@/lib/montree/i18n';
import { useEffect, useRef, useState } from 'react';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageDims {
  width: number;
  height: number;
}

type AspectRatioPreset = 'free' | '1:1' | '4:3' | '3:2';

const ASPECT_RATIO_MAP: Record<AspectRatioPreset, number | null> = {
  free: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
};

const HANDLE_SIZE = 10;
const MIN_CROP_SIZE = 50;

export default function PhotoCropModal({
  imageUrl,
  isOpen,
  onClose,
  onSave,
}: {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedBlob: Blob, width: number, height: number) => void;
}) {
  const { t } = useI18n();
  const [imageDims, setImageDims] = useState<ImageDims | null>(null);
  const [cropRect, setCropRect] = useState<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>('free');
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Drag state refs (avoid re-renders during drag)
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startRect: Rect;
    draggingHandle: string | null;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startRect: { x: 0, y: 0, width: 0, height: 0 },
    draggingHandle: null,
  });

  // Initialize crop rect when image loads
  useEffect(() => {
    if (!imageUrl || !isOpen) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const handleImageLoad = () => {
      setImageError(false);
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      setImageDims(dims);
      
      // Initialize crop to center 80% of image
      const initialWidth = Math.min(dims.width * 0.8, dims.width);
      const initialHeight = Math.min(dims.height * 0.8, dims.height);
      const initialX = (dims.width - initialWidth) / 2;
      const initialY = (dims.height - initialHeight) / 2;
      
      setCropRect({
        x: Math.max(0, initialX),
        y: Math.max(0, initialY),
        width: initialWidth,
        height: initialHeight,
      });
    };

    const handleImageError = () => {
      setImageError(true);
    };

    img.addEventListener('load', handleImageLoad);
    img.addEventListener('error', handleImageError);

    img.src = imageUrl;

    return () => {
      img.removeEventListener('load', handleImageLoad);
      img.removeEventListener('error', handleImageError);
    };
  }, [imageUrl, isOpen]);

  // Constrain crop rect to image bounds
  const constrainRect = (rect: Rect, dims: ImageDims): Rect => {
    const constrained = {
      x: Math.max(0, Math.min(rect.x, dims.width - MIN_CROP_SIZE)),
      y: Math.max(0, Math.min(rect.y, dims.height - MIN_CROP_SIZE)),
      width: Math.max(MIN_CROP_SIZE, Math.min(rect.width, dims.width)),
      height: Math.max(MIN_CROP_SIZE, Math.min(rect.height, dims.height)),
    };

    // Ensure rect doesn't exceed image bounds
    if (constrained.x + constrained.width > dims.width) {
      constrained.width = dims.width - constrained.x;
    }
    if (constrained.y + constrained.height > dims.height) {
      constrained.height = dims.height - constrained.y;
    }

    return constrained;
  };

  // Apply aspect ratio constraint to rect
  const applyAspectRatio = (rect: Rect, ratio: number | null, dims: ImageDims): Rect => {
    if (!ratio) return rect;

    let { x, y, width, height } = rect;
    const currentRatio = width / height;

    if (currentRatio > ratio) {
      // Width too large
      width = Math.round(height * ratio);
    } else {
      // Height too large
      height = Math.round(width / ratio);
    }

    return constrainRect({ x, y, width, height }, dims);
  };

  // Get pixel position from touch/mouse event relative to image container
  const getEventPosition = (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    if (!containerRef.current) return null;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : (e as MouseEvent).clientY;

    if (clientX === undefined || clientY === undefined) return null;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Determine which handle is being dragged (if any)
  const getHandleAtPosition = (px: number, py: number): string | null => {
    const threshold = HANDLE_SIZE + 10;

    // Corner handles (larger target area)
    if (
      Math.abs(px - cropRect.x) < threshold &&
      Math.abs(py - cropRect.y) < threshold
    ) {
      return 'tl'; // top-left
    }
    if (
      Math.abs(px - (cropRect.x + cropRect.width)) < threshold &&
      Math.abs(py - cropRect.y) < threshold
    ) {
      return 'tr'; // top-right
    }
    if (
      Math.abs(px - cropRect.x) < threshold &&
      Math.abs(py - (cropRect.y + cropRect.height)) < threshold
    ) {
      return 'bl'; // bottom-left
    }
    if (
      Math.abs(px - (cropRect.x + cropRect.width)) < threshold &&
      Math.abs(py - (cropRect.y + cropRect.height)) < threshold
    ) {
      return 'br'; // bottom-right
    }

    // Edge handles
    if (
      Math.abs(px - cropRect.x) < threshold &&
      py > cropRect.y + threshold &&
      py < cropRect.y + cropRect.height - threshold
    ) {
      return 'l'; // left
    }
    if (
      Math.abs(px - (cropRect.x + cropRect.width)) < threshold &&
      py > cropRect.y + threshold &&
      py < cropRect.y + cropRect.height - threshold
    ) {
      return 'r'; // right
    }
    if (
      Math.abs(py - cropRect.y) < threshold &&
      px > cropRect.x + threshold &&
      px < cropRect.x + cropRect.width - threshold
    ) {
      return 't'; // top
    }
    if (
      Math.abs(py - (cropRect.y + cropRect.height)) < threshold &&
      px > cropRect.x + threshold &&
      px < cropRect.x + cropRect.width - threshold
    ) {
      return 'b'; // bottom
    }

    // Inside rect = move
    if (
      px > cropRect.x &&
      px < cropRect.x + cropRect.width &&
      py > cropRect.y &&
      py < cropRect.y + cropRect.height
    ) {
      return 'move';
    }

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageDims) return;

    const pos = getEventPosition(e.nativeEvent);
    if (!pos) return;

    const handle = getHandleAtPosition(pos.x, pos.y);
    if (!handle) return;

    dragStateRef.current = {
      isDragging: true,
      startX: pos.x,
      startY: pos.y,
      startRect: { ...cropRect },
      draggingHandle: handle,
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!imageDims) return;

    const pos = getEventPosition(e.nativeEvent);
    if (!pos) return;

    const handle = getHandleAtPosition(pos.x, pos.y);
    if (!handle) return;

    dragStateRef.current = {
      isDragging: true,
      startX: pos.x,
      startY: pos.y,
      startRect: { ...cropRect },
      draggingHandle: handle,
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault(); // Prevent scroll while dragging
    const touch = e.touches[0];
    if (touch) handleDragMove(touch.clientX, touch.clientY);
  };

  const handleMouseUp = () => {
    dragStateRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleTouchEnd = () => {
    dragStateRef.current.isDragging = false;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
  };

  // Touch move handler — shared logic with mouse
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!imageDims || !dragStateRef.current.isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const { startX, startY, startRect, draggingHandle } = dragStateRef.current;
    const deltaX = px - startX;
    const deltaY = py - startY;

    let newRect = { ...startRect };

    if (draggingHandle === 'move') {
      newRect.x = startRect.x + deltaX;
      newRect.y = startRect.y + deltaY;
    } else if (draggingHandle === 'tl') {
      newRect.x = startRect.x + deltaX;
      newRect.y = startRect.y + deltaY;
      newRect.width = startRect.width - deltaX;
      newRect.height = startRect.height - deltaY;
    } else if (draggingHandle === 'tr') {
      newRect.y = startRect.y + deltaY;
      newRect.width = startRect.width + deltaX;
      newRect.height = startRect.height - deltaY;
    } else if (draggingHandle === 'bl') {
      newRect.x = startRect.x + deltaX;
      newRect.width = startRect.width - deltaX;
      newRect.height = startRect.height + deltaY;
    } else if (draggingHandle === 'br') {
      newRect.width = startRect.width + deltaX;
      newRect.height = startRect.height + deltaY;
    } else if (draggingHandle === 'l') {
      newRect.x = startRect.x + deltaX;
      newRect.width = startRect.width - deltaX;
    } else if (draggingHandle === 'r') {
      newRect.width = startRect.width + deltaX;
    } else if (draggingHandle === 't') {
      newRect.y = startRect.y + deltaY;
      newRect.height = startRect.height - deltaY;
    } else if (draggingHandle === 'b') {
      newRect.height = startRect.height + deltaY;
    }

    newRect = constrainRect(newRect, imageDims);
    const ratio = ASPECT_RATIO_MAP[aspectRatio];
    if (ratio) {
      newRect = applyAspectRatio(newRect, ratio, imageDims);
    }

    setCropRect(newRect);
  };

  const handleCrop = async () => {
    if (!imageDims || !imageRef.current || !canvasRef.current) return;

    setIsSaving(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const width = Math.round(cropRect.width);
      const height = Math.round(cropRect.height);

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(
        imageRef.current,
        Math.round(cropRect.x),
        Math.round(cropRect.y),
        width,
        height,
        0,
        0,
        width,
        height
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            onSave(blob, width, height);
          } else {
            console.error('Canvas toBlob returned null');
          }
          setIsSaving(false);
        },
        'image/jpeg',
        0.85
      );
    } catch (error) {
      console.error('Crop error:', error);
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const scale = imageDims && containerRef.current 
    ? containerRef.current.offsetWidth / imageDims.width
    : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col gap-4 p-4 bg-white rounded-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('gallery.cropPhoto')}
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error state */}
        {imageError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            Failed to load image. Please try again.
          </div>
        )}

        {/* Aspect ratio presets */}
        {!imageError && (
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm text-gray-600 self-center">
              {t('gallery.aspectRatio')}:
            </span>
            {(Object.keys(ASPECT_RATIO_MAP) as AspectRatioPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setAspectRatio(preset);
                  if (imageDims) {
                    const ratio = ASPECT_RATIO_MAP[preset];
                    if (ratio) {
                      const newRect = applyAspectRatio(cropRect, ratio, imageDims);
                      setCropRect(newRect);
                    }
                  }
                }}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  aspectRatio === preset
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={isSaving}
              >
                {preset === 'free' ? t('gallery.free') : preset}
              </button>
            ))}
          </div>
        )}

        {/* Crop canvas */}
        {!imageError && imageDims && (
          <div className="relative flex-1 overflow-auto bg-black/10 rounded">
            <div
              ref={containerRef}
              className="relative inline-block w-full touch-none"
              style={{
                paddingBottom: `${(imageDims.height / imageDims.width) * 100}%`,
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Hidden image ref for crop source */}
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop preview"
                className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
                crossOrigin="anonymous"
              />

              {/* Dark overlay outside crop area */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                {/* Top overlay */}
                <div
                  className="absolute left-0 right-0 bg-black/50"
                  style={{
                    top: 0,
                    height: `${cropRect.y * scale}px`,
                  }}
                />

                {/* Bottom overlay */}
                <div
                  className="absolute left-0 right-0 bg-black/50"
                  style={{
                    top: `${(cropRect.y + cropRect.height) * scale}px`,
                    bottom: 0,
                  }}
                />

                {/* Left overlay */}
                <div
                  className="absolute top-0 bottom-0 bg-black/50"
                  style={{
                    left: 0,
                    width: `${cropRect.x * scale}px`,
                    top: `${cropRect.y * scale}px`,
                    height: `${cropRect.height * scale}px`,
                  }}
                />

                {/* Right overlay */}
                <div
                  className="absolute top-0 bottom-0 bg-black/50"
                  style={{
                    left: `${(cropRect.x + cropRect.width) * scale}px`,
                    right: 0,
                    top: `${cropRect.y * scale}px`,
                    height: `${cropRect.height * scale}px`,
                  }}
                />
              </div>

              {/* Crop rect border */}
              <div
                className="absolute border-2 border-emerald-400 pointer-events-none"
                style={{
                  left: `${cropRect.x * scale}px`,
                  top: `${cropRect.y * scale}px`,
                  width: `${cropRect.width * scale}px`,
                  height: `${cropRect.height * scale}px`,
                }}
              >
                {/* Gridlines */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={`v${i}`}
                      className="absolute top-0 bottom-0 border-l border-emerald-400/30"
                      style={{
                        left: `${((i + 1) / 3) * 100}%`,
                      }}
                    />
                  ))}
                  {[...Array(2)].map((_, i) => (
                    <div
                      key={`h${i}`}
                      className="absolute left-0 right-0 border-t border-emerald-400/30"
                      style={{
                        top: `${((i + 1) / 3) * 100}%`,
                      }}
                    />
                  ))}
                </div>

                {/* Corner handles */}
                <div
                  className="absolute w-5 h-5 bg-emerald-400 rounded-full pointer-events-auto cursor-nwse-resize"
                  style={{
                    left: `${-10}px`,
                    top: `${-10}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
                <div
                  className="absolute w-5 h-5 bg-emerald-400 rounded-full pointer-events-auto cursor-nesw-resize"
                  style={{
                    right: `${-10}px`,
                    top: `${-10}px`,
                    transform: 'translate(50%, -50%)',
                  }}
                />
                <div
                  className="absolute w-5 h-5 bg-emerald-400 rounded-full pointer-events-auto cursor-nesw-resize"
                  style={{
                    left: `${-10}px`,
                    bottom: `${-10}px`,
                    transform: 'translate(-50%, 50%)',
                  }}
                />
                <div
                  className="absolute w-5 h-5 bg-emerald-400 rounded-full pointer-events-auto cursor-nwse-resize"
                  style={{
                    right: `${-10}px`,
                    bottom: `${-10}px`,
                    transform: 'translate(50%, 50%)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-end border-t pt-4">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCrop}
            disabled={isSaving || !imageDims}
            className="px-4 py-2 rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('gallery.cropSaving')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('gallery.crop')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
