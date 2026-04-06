"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from './types';

interface CropOverlayProps {
  card: Card | undefined;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string) => void;
}

/**
 * Fixed-frame crop overlay.
 * Shows a fixed square frame in the center. User drags the image behind it
 * and uses scroll/pinch to zoom. "Apply" extracts the visible square region.
 */
const CropOverlay: React.FC<CropOverlayProps> = ({ card, onClose, onApplyCrop }) => {
  // Frame size — the fixed square the user sees
  const FRAME_SIZE = 300;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Image transform state
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Drag state
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Load image
  useEffect(() => {
    if (!card) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      // Initial zoom: fit the shorter dimension to the frame
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const initialZoom = FRAME_SIZE / minDim;
      setZoom(initialZoom);
      // Center the image
      setOffsetX((FRAME_SIZE - img.naturalWidth * initialZoom) / 2);
      setOffsetY((FRAME_SIZE - img.naturalHeight * initialZoom) / 2);
      setImgLoaded(true);
    };
    img.src = card.originalImage;
  }, [card]);

  // Draw on canvas whenever state changes
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const img = imgRef.current;

    ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
    // Draw the image at its current offset + zoom
    ctx.drawImage(
      img,
      0, 0, img.naturalWidth, img.naturalHeight,
      offsetX, offsetY,
      img.naturalWidth * zoom, img.naturalHeight * zoom
    );
  }, [imgLoaded, offsetX, offsetY, zoom]);

  // --- Drag handlers ---
  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('clientX' in e) return { x: e.clientX, y: e.clientY };
    return { x: 0, y: 0 };
  };

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    dragging.current = true;
    const pos = getPos(e);
    dragStart.current = { x: pos.x, y: pos.y, ox: offsetX, oy: offsetY };

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      ev.preventDefault();
      const p = getPos(ev);
      setOffsetX(dragStart.current.ox + (p.x - dragStart.current.x));
      setOffsetY(dragStart.current.oy + (p.y - dragStart.current.y));
    };
    const handleUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
  }, [offsetX, offsetY]);

  // --- Zoom via scroll ---
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!imgRef.current) return;
    const img = imgRef.current;
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const minZoom = FRAME_SIZE / Math.max(img.naturalWidth, img.naturalHeight);
    const maxZoom = (FRAME_SIZE / minDim) * 4;

    // Zoom centered on the frame center
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * factor));

    // Adjust offset so center stays fixed
    const cx = FRAME_SIZE / 2;
    const cy = FRAME_SIZE / 2;
    const newOffX = cx - (cx - offsetX) * (newZoom / zoom);
    const newOffY = cy - (cy - offsetY) * (newZoom / zoom);

    setZoom(newZoom);
    setOffsetX(newOffX);
    setOffsetY(newOffY);
  }, [zoom, offsetX, offsetY]);

  // --- Zoom buttons ---
  const handleZoomBtn = useCallback((direction: 1 | -1) => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const minZoom = FRAME_SIZE / Math.max(img.naturalWidth, img.naturalHeight);
    const maxZoom = (FRAME_SIZE / minDim) * 4;

    const factor = direction === 1 ? 1.25 : 1 / 1.25;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * factor));

    const cx = FRAME_SIZE / 2;
    const cy = FRAME_SIZE / 2;
    const newOffX = cx - (cx - offsetX) * (newZoom / zoom);
    const newOffY = cy - (cy - offsetY) * (newZoom / zoom);

    setZoom(newZoom);
    setOffsetX(newOffX);
    setOffsetY(newOffY);
  }, [zoom, offsetX, offsetY]);

  // --- Apply: extract what's visible in the square ---
  const handleApply = useCallback(() => {
    if (!imgRef.current) return;
    const img = imgRef.current;

    // The canvas shows the image at (offsetX, offsetY) with scale=zoom.
    // The visible square is [0, 0, FRAME_SIZE, FRAME_SIZE] in canvas coords.
    // In image coords: srcX = -offsetX / zoom, srcY = -offsetY / zoom, srcSize = FRAME_SIZE / zoom
    const srcX = -offsetX / zoom;
    const srcY = -offsetY / zoom;
    const srcW = FRAME_SIZE / zoom;
    const srcH = FRAME_SIZE / zoom;

    const output = document.createElement('canvas');
    // Output at a nice resolution
    const outSize = Math.min(800, Math.max(FRAME_SIZE, srcW));
    output.width = outSize;
    output.height = outSize;
    const ctx = output.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outSize, outSize);
    const dataUrl = output.toDataURL('image/png');
    onApplyCrop(dataUrl);
  }, [offsetX, offsetY, zoom, onApplyCrop]);

  if (!card) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1a1a2e',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}>
          <h3 style={{ margin: 0, color: '#fff', fontFamily: 'system-ui' }}>
            ✂️ Crop: {card.label}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#fff',
              fontSize: '24px', cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: '#aaa', margin: 0, fontFamily: 'system-ui', fontSize: '14px' }}>
          Drag to reposition · Scroll or use +/− to zoom
        </p>

        {/* The fixed square frame */}
        <div style={{
          position: 'relative',
          width: `${FRAME_SIZE}px`,
          height: `${FRAME_SIZE}px`,
          borderRadius: '8px',
          overflow: 'hidden',
          border: '3px solid #4CAF50',
          cursor: 'grab',
          backgroundColor: '#000',
        }}>
          <canvas
            ref={canvasRef}
            width={FRAME_SIZE}
            height={FRAME_SIZE}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onWheel={handleWheel}
            style={{
              width: `${FRAME_SIZE}px`,
              height: `${FRAME_SIZE}px`,
              display: 'block',
              userSelect: 'none',
            }}
          />
          {/* Corner indicators */}
          {[
            { top: 0, left: 0 },
            { top: 0, right: 0 },
            { bottom: 0, left: 0 },
            { bottom: 0, right: 0 },
          ].map((pos, i) => (
            <div key={i} style={{
              position: 'absolute',
              ...pos,
              width: '20px',
              height: '20px',
              borderTop: pos.top === 0 ? '3px solid #fff' : 'none',
              borderBottom: pos.bottom === 0 ? '3px solid #fff' : 'none',
              borderLeft: pos.left === 0 ? '3px solid #fff' : 'none',
              borderRight: pos.right === 0 ? '3px solid #fff' : 'none',
              pointerEvents: 'none',
            } as React.CSSProperties} />
          ))}
          {!imgLoaded && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#666', fontFamily: 'system-ui'
            }}>
              Loading...
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => handleZoomBtn(-1)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '1px solid #555', backgroundColor: 'transparent',
              color: '#fff', fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            −
          </button>
          <span style={{ color: '#aaa', fontFamily: 'system-ui', fontSize: '13px', minWidth: '50px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => handleZoomBtn(1)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '1px solid #555', backgroundColor: 'transparent',
              color: '#fff', fontSize: '18px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            +
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: '8px',
              border: '1px solid #555', backgroundColor: 'transparent',
              color: '#fff', cursor: 'pointer', fontFamily: 'system-ui'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              padding: '10px 20px', borderRadius: '8px',
              border: 'none', backgroundColor: '#4CAF50',
              color: '#fff', cursor: 'pointer', fontWeight: 'bold',
              fontFamily: 'system-ui'
            }}
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default CropOverlay;
