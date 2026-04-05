'use client';

// components/montree/shared/PhotoCropper.tsx
// Lightweight touch-friendly photo cropper — no external deps
// Uses canvas for the actual crop, renders a draggable/resizable overlay

import { useState, useRef, useCallback, useEffect } from 'react';

interface CropArea {
  x: number; // % from left (0-100)
  y: number; // % from top (0-100)
  w: number; // % width (0-100)
  h: number; // % height (0-100)
}

interface Props {
  imageUrl: string;
  onCrop: (blob: Blob, width: number, height: number) => void;
  onCancel: () => void;
}

export default function PhotoCropper({ imageUrl, onCrop, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [crop, setCrop] = useState<CropArea>({ x: 10, y: 10, w: 80, h: 80 });
  const [dragging, setDragging] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [dragStart, setDragStart] = useState({ px: 0, py: 0, crop: { x: 10, y: 10, w: 80, h: 80 } });
  const [processing, setProcessing] = useState(false);

  // Get pointer position as % of container
  const getPercent = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { px: 0, py: 0 };
    return {
      px: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      py: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const { px, py } = getPercent(e.clientX, e.clientY);
    setDragging(type);
    setDragStart({ px, py, crop: { ...crop } });
  }, [crop, getPercent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const { px, py } = getPercent(e.clientX, e.clientY);
    const dx = px - dragStart.px;
    const dy = py - dragStart.py;
    const c = dragStart.crop;
    const MIN = 10; // minimum crop size %

    if (dragging === 'move') {
      const nx = Math.max(0, Math.min(100 - c.w, c.x + dx));
      const ny = Math.max(0, Math.min(100 - c.h, c.y + dy));
      setCrop({ ...c, x: nx, y: ny });
    } else if (dragging === 'se') {
      const nw = Math.max(MIN, Math.min(100 - c.x, c.w + dx));
      const nh = Math.max(MIN, Math.min(100 - c.y, c.h + dy));
      setCrop({ ...c, w: nw, h: nh });
    } else if (dragging === 'sw') {
      const newX = Math.max(0, c.x + dx);
      const nw = Math.max(MIN, c.w - (newX - c.x));
      const nh = Math.max(MIN, Math.min(100 - c.y, c.h + dy));
      setCrop({ ...c, x: newX, w: nw, h: nh });
    } else if (dragging === 'ne') {
      const nw = Math.max(MIN, Math.min(100 - c.x, c.w + dx));
      const newY = Math.max(0, c.y + dy);
      const nh = Math.max(MIN, c.h - (newY - c.y));
      setCrop({ ...c, y: newY, w: nw, h: nh });
    } else if (dragging === 'nw') {
      const newX = Math.max(0, c.x + dx);
      const nw = Math.max(MIN, c.w - (newX - c.x));
      const newY = Math.max(0, c.y + dy);
      const nh = Math.max(MIN, c.h - (newY - c.y));
      setCrop({ x: newX, y: newY, w: nw, h: nh });
    }
  }, [dragging, dragStart, getPercent]);

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Perform the actual crop via canvas
  const doCrop = useCallback(async () => {
    const img = imgRef.current;
    if (!img || processing) return;
    setProcessing(true);

    try {
      // Use natural dimensions for high-quality crop
      const natW = img.naturalWidth;
      const natH = img.naturalHeight;

      const sx = Math.round((crop.x / 100) * natW);
      const sy = Math.round((crop.y / 100) * natH);
      const sw = Math.round((crop.w / 100) * natW);
      const sh = Math.round((crop.h / 100) * natH);

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
          'image/jpeg',
          0.92
        );
      });

      onCrop(blob, sw, sh);
    } catch (err) {
      console.error('Crop error:', err);
      alert('Failed to crop image');
    } finally {
      setProcessing(false);
    }
  }, [crop, onCrop, processing]);

  // Corner handle component
  const Handle = ({ pos, cursor }: { pos: 'nw' | 'ne' | 'sw' | 'se'; cursor: string }) => {
    const posStyles: Record<string, string> = {
      nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
      ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
      sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
      se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
    };
    return (
      <div
        onPointerDown={(e) => handlePointerDown(e, pos)}
        className={`absolute ${posStyles[pos]} w-6 h-6 bg-white border-2 border-emerald-500 rounded-full z-10 touch-none`}
        style={{ cursor }}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      {/* Image + crop overlay */}
      <div
        ref={containerRef}
        className="relative max-w-full max-h-[70vh] select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Crop"
          crossOrigin="anonymous"
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />

        {imgLoaded && (
          <>
            {/* Dark overlay outside crop area */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to right,
                  rgba(0,0,0,0.6) ${crop.x}%,
                  transparent ${crop.x}%,
                  transparent ${crop.x + crop.w}%,
                  rgba(0,0,0,0.6) ${crop.x + crop.w}%)`,
              }}
            />
            {/* Top dark band */}
            <div
              className="absolute left-0 right-0 top-0 bg-black/60 pointer-events-none"
              style={{ height: `${crop.y}%` }}
            />
            {/* Bottom dark band */}
            <div
              className="absolute left-0 right-0 bottom-0 bg-black/60 pointer-events-none"
              style={{ height: `${100 - crop.y - crop.h}%` }}
            />

            {/* Crop selection box */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              className="absolute border-2 border-white/90 touch-none"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.w}%`,
                height: `${crop.h}%`,
                cursor: dragging === 'move' ? 'grabbing' : 'grab',
              }}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
              </div>

              {/* Corner handles */}
              <Handle pos="nw" cursor="nw-resize" />
              <Handle pos="ne" cursor="ne-resize" />
              <Handle pos="sw" cursor="sw-resize" />
              <Handle pos="se" cursor="se-resize" />
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 bg-white/20 text-white rounded-lg font-semibold text-sm hover:bg-white/30 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={doCrop}
          disabled={processing || !imgLoaded}
          className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-semibold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {processing ? 'Cropping...' : 'Crop'}
        </button>
      </div>
    </div>
  );
}
