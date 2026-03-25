'use client';

import { useI18n } from '@/lib/montree/i18n';
import { useEffect, useRef, useState } from 'react';

// --- Types ---

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

type AspectPreset = 'free' | '1:1' | '4:3' | '3:2';
type HandleId = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

type Interaction =
  | { mode: 'resize'; handle: HandleId; startCrop: CropRect; anchor: Point }
  | { mode: 'move'; startCrop: CropRect; anchor: Point }
  | { mode: 'pan'; startPan: Point; anchor: Point }
  | {
      mode: 'pinch';
      startDist: number;
      startZoom: number;
      startPan: Point;
      startMid: Point;
    };

// --- Constants ---

const ASPECTS: Record<AspectPreset, number | null> = {
  free: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
};

const MIN_CROP = 30; // minimum crop in image pixels
const HANDLE_R = 28; // touch-friendly hit radius in screen px
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

// --- Component ---

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

  // --- State ---
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contW, setContW] = useState(0);
  const [contH, setContH] = useState(0);
  const [crop, setCrop] = useState<CropRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [aspect, setAspect] = useState<AspectPreset>('free');
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [dragging, setDragging] = useState(false);

  // --- Refs ---
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interRef = useRef<Interaction | null>(null);
  const lastTapRef = useRef(0);

  // Fresh-value ref (all event handlers read from here to avoid stale closures)
  const v = useRef({
    crop,
    zoom,
    panX,
    panY,
    imgW,
    imgH,
    contW,
    contH,
    aspect,
  });
  v.current = { crop, zoom, panX, panY, imgW, imgH, contW, contH, aspect };

  // --- Helpers (use refs, safe in event handlers) ---

  const getTransform = () => {
    const { imgW, imgH, contW, contH, zoom, panX, panY } = v.current;
    if (!imgW || !contW) return { s: 1, ox: 0, oy: 0 };
    const bs = Math.min(contW / imgW, contH / imgH);
    const s = bs * zoom;
    return {
      s,
      ox: (contW - imgW * s) / 2 + panX,
      oy: (contH - imgH * s) / 2 + panY,
    };
  };

  const constrain = (rect: CropRect): CropRect => {
    const iw = v.current.imgW;
    const ih = v.current.imgH;
    let { x, y, width, height } = rect;
    width = Math.max(MIN_CROP, Math.min(width, iw));
    height = Math.max(MIN_CROP, Math.min(height, ih));
    x = Math.max(0, Math.min(x, iw - width));
    y = Math.max(0, Math.min(y, ih - height));
    return { x, y, width, height };
  };

  const applyAspect = (
    rect: CropRect,
    ratio: number | null
  ): CropRect => {
    if (!ratio) return rect;
    let { x, y, width, height } = rect;
    if (width / height > ratio) width = height * ratio;
    else height = width / ratio;
    return constrain({ x, y, width, height });
  };

  const containerXY = (
    clientX: number,
    clientY: number
  ): Point | null => {
    const el = containerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const hitTest = (sx: number, sy: number): HandleId | 'move' | null => {
    const c = v.current.crop;
    const t = getTransform();
    const lx = c.x * t.s + t.ox;
    const ly = c.y * t.s + t.oy;
    const rx = (c.x + c.width) * t.s + t.ox;
    const ry = (c.y + c.height) * t.s + t.oy;
    const H = HANDLE_R;

    // Corners first (highest priority)
    if (Math.abs(sx - lx) < H && Math.abs(sy - ly) < H) return 'tl';
    if (Math.abs(sx - rx) < H && Math.abs(sy - ly) < H) return 'tr';
    if (Math.abs(sx - lx) < H && Math.abs(sy - ry) < H) return 'bl';
    if (Math.abs(sx - rx) < H && Math.abs(sy - ry) < H) return 'br';

    // Edges
    if (Math.abs(sx - lx) < H && sy > ly + H && sy < ry - H) return 'l';
    if (Math.abs(sx - rx) < H && sy > ly + H && sy < ry - H) return 'r';
    if (Math.abs(sy - ly) < H && sx > lx + H && sx < rx - H) return 't';
    if (Math.abs(sy - ry) < H && sx > lx + H && sx < rx - H) return 'b';

    // Inside crop = move crop
    if (sx > lx && sx < rx && sy > ly && sy < ry) return 'move';

    return null;
  };

  // --- Image loading ---

  useEffect(() => {
    if (!imageUrl || !isOpen) return;
    setImgError(false);
    setImgLoaded(false);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setAspect('free');
    interRef.current = null;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setImgW(w);
      setImgH(h);
      setImgLoaded(true);
      // Initial crop: centered 80%
      const cw = w * 0.8;
      const ch = h * 0.8;
      setCrop({
        x: (w - cw) / 2,
        y: (h - ch) / 2,
        width: cw,
        height: ch,
      });
    };
    img.onerror = () => {
      if (!cancelled) setImgError(true);
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl, isOpen]);

  // --- Container resize tracking ---

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;
    // Sync measure immediately (ResizeObserver callback is async)
    setContW(el.offsetWidth);
    setContH(el.offsetHeight);

    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) {
        setContW(e.contentRect.width);
        setContH(e.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  // --- Gesture handlers (native event listeners for proper preventDefault) ---

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen || !imgLoaded) return;

    let docMoveHandler: ((e: MouseEvent) => void) | null = null;
    let docUpHandler: (() => void) | null = null;

    // --- Shared drag logic ---

    const startDrag = (sx: number, sy: number) => {
      const hit = hitTest(sx, sy);
      if (!hit) {
        // Outside crop → pan if zoomed
        if (v.current.zoom > 1) {
          interRef.current = {
            mode: 'pan',
            startPan: { x: v.current.panX, y: v.current.panY },
            anchor: { x: sx, y: sy },
          };
          setDragging(true);
        }
        return;
      }
      if (hit === 'move') {
        interRef.current = {
          mode: 'move',
          startCrop: { ...v.current.crop },
          anchor: { x: sx, y: sy },
        };
      } else {
        interRef.current = {
          mode: 'resize',
          handle: hit,
          startCrop: { ...v.current.crop },
          anchor: { x: sx, y: sy },
        };
      }
      setDragging(true);
    };

    const updateDrag = (sx: number, sy: number) => {
      const inter = interRef.current;
      if (!inter) return;
      const t = getTransform();
      const dx = sx - inter.anchor.x;
      const dy = sy - inter.anchor.y;

      if (inter.mode === 'pan') {
        setPanX(inter.startPan.x + dx);
        setPanY(inter.startPan.y + dy);
      } else if (inter.mode === 'move') {
        const dix = dx / t.s;
        const diy = dy / t.s;
        setCrop(
          constrain({
            ...inter.startCrop,
            x: inter.startCrop.x + dix,
            y: inter.startCrop.y + diy,
          })
        );
      } else if (inter.mode === 'resize') {
        const dix = dx / t.s;
        const diy = dy / t.s;
        let { x, y, width, height } = inter.startCrop;

        switch (inter.handle) {
          case 'tl':
            x += dix;
            y += diy;
            width -= dix;
            height -= diy;
            break;
          case 'tr':
            y += diy;
            width += dix;
            height -= diy;
            break;
          case 'bl':
            x += dix;
            width -= dix;
            height += diy;
            break;
          case 'br':
            width += dix;
            height += diy;
            break;
          case 'l':
            x += dix;
            width -= dix;
            break;
          case 'r':
            width += dix;
            break;
          case 't':
            y += diy;
            height -= diy;
            break;
          case 'b':
            height += diy;
            break;
        }

        let nc = constrain({ x, y, width, height });
        const ratio = ASPECTS[v.current.aspect];
        if (ratio) nc = applyAspect(nc, ratio);
        setCrop(nc);
      }
    };

    const endDrag = () => {
      interRef.current = null;
      setDragging(false);
    };

    // --- Zoom at a point (keeps that image point fixed under cursor) ---

    const zoomAt = (cx: number, cy: number, factor: number) => {
      const { imgW, imgH, contW, contH, zoom, panX, panY } = v.current;
      if (!imgW || !contW) return;

      const bs = Math.min(contW / imgW, contH / imgH);
      const oldS = bs * zoom;
      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, zoom * factor)
      );
      const newS = bs * newZoom;

      // Image coord under the cursor
      const oldOx = (contW - imgW * oldS) / 2 + panX;
      const oldOy = (contH - imgH * oldS) / 2 + panY;
      const ix = (cx - oldOx) / oldS;
      const iy = (cy - oldOy) / oldS;

      // New pan to keep that image point under the cursor
      const newPx = cx - ix * newS - (contW - imgW * newS) / 2;
      const newPy = cy - iy * newS - (contH - imgH * newS) / 2;

      setZoom(newZoom);
      setPanX(newPx);
      setPanY(newPy);
    };

    // --- Touch handlers ---

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 2) {
        // Start pinch zoom
        const p1 = containerXY(e.touches[0].clientX, e.touches[0].clientY);
        const p2 = containerXY(e.touches[1].clientX, e.touches[1].clientY);
        if (!p1 || !p2) return;

        interRef.current = {
          mode: 'pinch',
          startDist: Math.hypot(p2.x - p1.x, p2.y - p1.y),
          startZoom: v.current.zoom,
          startPan: { x: v.current.panX, y: v.current.panY },
          startMid: {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
          },
        };
        setDragging(true);
        return;
      }

      if (e.touches.length === 1) {
        // Double-tap detection → reset zoom
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          setZoom(1);
          setPanX(0);
          setPanY(0);
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;

        const p = containerXY(
          e.touches[0].clientX,
          e.touches[0].clientY
        );
        if (p) startDrag(p.x, p.y);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const inter = interRef.current;

      if (e.touches.length === 2 && inter?.mode === 'pinch') {
        const p1 = containerXY(
          e.touches[0].clientX,
          e.touches[0].clientY
        );
        const p2 = containerXY(
          e.touches[1].clientX,
          e.touches[1].clientY
        );
        if (!p1 || !p2) return;

        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const mid = {
          x: (p1.x + p2.x) / 2,
          y: (p1.y + p2.y) / 2,
        };
        const newZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, inter.startZoom * (dist / inter.startDist))
        );

        // Keep the pinch midpoint's image coord fixed
        const { imgW, imgH, contW, contH } = v.current;
        if (imgW && contW) {
          const bs = Math.min(contW / imgW, contH / imgH);
          const oldS = bs * inter.startZoom;
          const oldOx =
            (contW - imgW * oldS) / 2 + inter.startPan.x;
          const oldOy =
            (contH - imgH * oldS) / 2 + inter.startPan.y;
          const ix = (inter.startMid.x - oldOx) / oldS;
          const iy = (inter.startMid.y - oldOy) / oldS;
          const newS = bs * newZoom;
          setPanX(mid.x - ix * newS - (contW - imgW * newS) / 2);
          setPanY(mid.y - iy * newS - (contH - imgH * newS) / 2);
        }
        setZoom(newZoom);
        return;
      }

      if (
        e.touches.length === 1 &&
        inter &&
        inter.mode !== 'pinch'
      ) {
        const p = containerXY(
          e.touches[0].clientX,
          e.touches[0].clientY
        );
        if (p) updateDrag(p.x, p.y);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        endDrag();
      } else if (
        e.touches.length === 1 &&
        interRef.current?.mode === 'pinch'
      ) {
        // Went from 2→1 fingers: end pinch cleanly
        endDrag();
      }
    };

    // --- Mouse handlers ---

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();

      // Double-click → reset zoom
      if (e.detail === 2) {
        setZoom(1);
        setPanX(0);
        setPanY(0);
        return;
      }

      const p = containerXY(e.clientX, e.clientY);
      if (!p) return;
      startDrag(p.x, p.y);

      // Attach document-level listeners for drag (works outside container)
      docMoveHandler = (ev: MouseEvent) => {
        const pp = containerXY(ev.clientX, ev.clientY);
        if (pp) updateDrag(pp.x, pp.y);
      };
      docUpHandler = () => {
        endDrag();
        if (docMoveHandler)
          document.removeEventListener('mousemove', docMoveHandler);
        if (docUpHandler)
          document.removeEventListener('mouseup', docUpHandler);
        docMoveHandler = null;
        docUpHandler = null;
      };
      document.addEventListener('mousemove', docMoveHandler);
      document.addEventListener('mouseup', docUpHandler);
    };

    // --- Wheel zoom ---

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = containerXY(e.clientX, e.clientY);
      if (!p) return;
      zoomAt(p.x, p.y, e.deltaY > 0 ? 0.9 : 1.1);
    };

    // --- Attach listeners ---

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('wheel', onWheel);
      if (docMoveHandler)
        document.removeEventListener('mousemove', docMoveHandler);
      if (docUpHandler)
        document.removeEventListener('mouseup', docUpHandler);
    };
    // Re-attach when image loads or modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, imgLoaded]);

  // --- Aspect ratio change ---

  const handleAspectChange = (preset: AspectPreset) => {
    setAspect(preset);
    const ratio = ASPECTS[preset];
    if (ratio && v.current.imgW && v.current.imgH) {
      setCrop((prev) => applyAspect(prev, ratio));
    }
  };

  // --- Crop execution ---

  const handleCrop = async () => {
    if (!imgW || !imgRef.current || !canvasRef.current) return;
    setIsSaving(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      const w = Math.round(crop.width);
      const h = Math.round(crop.height);
      canvas.width = w;
      canvas.height = h;

      ctx.drawImage(
        imgRef.current,
        Math.round(crop.x),
        Math.round(crop.y),
        w,
        h,
        0,
        0,
        w,
        h
      );

      canvas.toBlob(
        (blob) => {
          if (blob) onSave(blob, w, h);
          else console.error('toBlob returned null');
          setIsSaving(false);
        },
        'image/jpeg',
        0.85
      );
    } catch (err) {
      console.error('Crop error:', err);
      setIsSaving(false);
    }
  };

  // --- Render ---

  if (!isOpen) return null;

  // Computed display values for rendering
  const bs = imgW && contW ? Math.min(contW / imgW, contH / imgH) : 1;
  const s = bs * zoom;
  const ox = imgW ? (contW - imgW * s) / 2 + panX : 0;
  const oy = imgH ? (contH - imgH * s) / 2 + panY : 0;

  // Crop rect in screen coordinates
  const cs = {
    x: crop.x * s + ox,
    y: crop.y * s + oy,
    w: Math.max(0, crop.width * s),
    h: Math.max(0, crop.height * s),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-lg m-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('gallery.cropPhoto')}
          </h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Aspect ratio presets + zoom indicator */}
        {!imgError && (
          <div className="flex gap-2 flex-wrap px-4 py-2 border-b shrink-0 items-center">
            <span className="text-sm text-gray-600">
              {t('gallery.aspectRatio')}:
            </span>
            {(Object.keys(ASPECTS) as AspectPreset[]).map((p) => (
              <button
                key={p}
                onClick={() => handleAspectChange(p)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  aspect === p
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={isSaving}
              >
                {p === 'free' ? t('gallery.free') : p}
              </button>
            ))}
            {zoom > 1.05 && (
              <button
                onClick={() => {
                  setZoom(1);
                  setPanX(0);
                  setPanY(0);
                }}
                className="ml-auto text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200"
              >
                {zoom.toFixed(1)}x — Reset
              </button>
            )}
          </div>
        )}

        {/* Error state */}
        {imgError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded m-4 text-red-700 text-sm">
            Failed to load image. Please try again.
          </div>
        )}

        {/* Main crop area */}
        {!imgError && (
          <div
            ref={containerRef}
            className="relative flex-1 min-h-0 bg-gray-900 overflow-hidden select-none"
            style={{
              cursor: dragging ? 'grabbing' : 'crosshair',
              touchAction: 'none',
            }}
          >
            {imgLoaded && imgW > 0 && contW > 0 && (
              <>
                {/* Image (positioned by zoom + pan) */}
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop source"
                  crossOrigin="anonymous"
                  className="absolute pointer-events-none"
                  style={{
                    width: imgW * s,
                    height: imgH * s,
                    left: ox,
                    top: oy,
                    maxWidth: 'none',
                  }}
                  draggable={false}
                />

                {/* Dark overlay with crop cutout (SVG mask — no gaps) */}
                <svg
                  className="absolute inset-0 pointer-events-none"
                  width={contW}
                  height={contH}
                >
                  <defs>
                    <mask id="crop-cutout">
                      <rect width={contW} height={contH} fill="white" />
                      <rect
                        x={cs.x}
                        y={cs.y}
                        width={cs.w}
                        height={cs.h}
                        fill="black"
                      />
                    </mask>
                  </defs>
                  <rect
                    width={contW}
                    height={contH}
                    fill="rgba(0,0,0,0.55)"
                    mask="url(#crop-cutout)"
                  />
                </svg>

                {/* Crop frame + handles + grid */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: cs.x,
                    top: cs.y,
                    width: cs.w,
                    height: cs.h,
                  }}
                >
                  {/* White border */}
                  <div className="absolute inset-0 border-2 border-white" />

                  {/* Rule-of-thirds grid */}
                  {[1, 2].map((i) => (
                    <div
                      key={`gv${i}`}
                      className="absolute top-0 bottom-0 border-l border-white/30"
                      style={{ left: `${(i / 3) * 100}%` }}
                    />
                  ))}
                  {[1, 2].map((i) => (
                    <div
                      key={`gh${i}`}
                      className="absolute left-0 right-0 border-t border-white/30"
                      style={{ top: `${(i / 3) * 100}%` }}
                    />
                  ))}

                  {/* Corner brackets (iOS Photos style) */}
                  {/* Top-left */}
                  <div className="absolute" style={{ top: -2, left: -2 }}>
                    <div
                      className="absolute bg-white"
                      style={{ width: 20, height: 3, top: 0, left: 0 }}
                    />
                    <div
                      className="absolute bg-white"
                      style={{ width: 3, height: 20, top: 0, left: 0 }}
                    />
                  </div>
                  {/* Top-right */}
                  <div
                    className="absolute"
                    style={{ top: -2, right: -2 }}
                  >
                    <div
                      className="absolute bg-white"
                      style={{
                        width: 20,
                        height: 3,
                        top: 0,
                        right: 0,
                      }}
                    />
                    <div
                      className="absolute bg-white"
                      style={{
                        width: 3,
                        height: 20,
                        top: 0,
                        right: 0,
                      }}
                    />
                  </div>
                  {/* Bottom-left */}
                  <div
                    className="absolute"
                    style={{ bottom: -2, left: -2 }}
                  >
                    <div
                      className="absolute bg-white"
                      style={{
                        width: 20,
                        height: 3,
                        bottom: 0,
                        left: 0,
                      }}
                    />
                    <div
                      className="absolute bg-white"
                      style={{
                        width: 3,
                        height: 20,
                        bottom: 0,
                        left: 0,
                      }}
                    />
                  </div>
                  {/* Bottom-right */}
                  <div
                    className="absolute"
                    style={{ bottom: -2, right: -2 }}
                  >
                    <div
                      className="absolute bg-white"
                      style={{
                        width: 20,
                        height: 3,
                        bottom: 0,
                        right: 0,
                      }}
                    />
                    <div
                      className="absolute bg-white"
                      style={{
                        width: 3,
                        height: 20,
                        bottom: 0,
                        right: 0,
                      }}
                    />
                  </div>

                  {/* Edge midpoint bars */}
                  <div
                    className="absolute bg-white rounded-full"
                    style={{
                      width: 32,
                      height: 3,
                      top: -1,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  />
                  <div
                    className="absolute bg-white rounded-full"
                    style={{
                      width: 32,
                      height: 3,
                      bottom: -1,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  />
                  <div
                    className="absolute bg-white rounded-full"
                    style={{
                      width: 3,
                      height: 32,
                      left: -1,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                  <div
                    className="absolute bg-white rounded-full"
                    style={{
                      width: 3,
                      height: 32,
                      right: -1,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                </div>

                {/* Zoom hint */}
                {zoom <= 1 && !dragging && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                    Pinch or scroll to zoom
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-end px-4 py-3 border-t shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleCrop}
            disabled={isSaving || !imgLoaded}
            className="px-4 py-2 rounded bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('gallery.cropSaving')}
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {t('gallery.crop')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hidden canvas for crop output */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
