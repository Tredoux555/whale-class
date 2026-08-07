// components/potato/CameraCapture.tsx
//
// Adapted from components/montree/media/CameraCapture.tsx (the device-validated
// original). What was kept, and why:
//
//   • the LANDSCAPE RAIL — a 140px vertical control strip on the physical right
//     edge with labels -rotate-90 so they read upright. A bottom bar in landscape
//     squashes the preview into a strip and reads nothing like a native camera.
//     This layout was rejected-and-restored three times upstream; do not
//     "simplify" it back into a bottom bar.
//   • pinch zoom, native-track first with a digital (CSS + matching capture crop)
//     fallback, because WebKit does not expose track zoom on iOS.
//   • the getUserMedia timeout ladder — on mobile, calling getUserMedia while a
//     previous stream is still releasing can hang forever, and a late-resolving
//     stream must have its tracks stopped or the camera light stays on.
//   • safe-area padding on every edge control.
//
// What was removed for Potato Snaps:
//   • video mode entirely (photos only in v1) — so no mode toggle, no
//     MediaRecorder, no duration timer.
//   • the Capacitor native-camera and native-album paths (they live under
//     lib/montree/platform, which this product may not import). The web
//     getUserMedia path and a plain file input cover both browsers and the PWA.
//   • useI18n — Potato Snaps is hardcoded English by design.

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface PotatoCapturedPhoto {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  timestamp: Date;
}

interface CameraCaptureProps {
  onCapture: (photo: PotatoCapturedPhoto) => void;
  onCancel: () => void;
  facingMode?: 'user' | 'environment';
}

type CameraState = 'initializing' | 'ready' | 'captured' | 'error';

const MAX_DIGITAL_ZOOM = 3;
const PINCH_MIN_DELTA = 0.02;

const clampZoom = (z: number, min: number, max: number) => Math.min(Math.max(z, min), max);

const touchDistance = (touches: React.TouchList) => {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
};

export default function CameraCapture({
  onCapture,
  onCancel,
  facingMode = 'environment',
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);

  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<PotatoCapturedPhoto | null>(null);
  const [currentFacing, setCurrentFacing] = useState(facingMode);

  // ── zoom ────────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<'native' | 'digital'>('digital');
  const [zoomMax, setZoomMax] = useState(MAX_DIGITAL_ZOOM);
  const zoomRef = useRef(1);
  const zoomMinRef = useRef(1);
  const zoomStepRef = useRef(0);
  const zoomModeRef = useRef<'native' | 'digital'>('digital');
  const zoomEnabledRef = useRef(false);
  const lastNativeZoomRef = useRef<number | null>(null);
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);

  const zoomEnabled = cameraState === 'ready';
  zoomModeRef.current = zoomMode;
  zoomEnabledRef.current = zoomEnabled;

  const applyNativeZoom = useCallback((track: MediaStreamTrack, z: number) => {
    if (lastNativeZoomRef.current === z) return;
    lastNativeZoomRef.current = z;
    track
      // `zoom` is absent from TS's MediaTrackConstraintSet — cast at the call site.
      .applyConstraints({ advanced: [{ zoom: z } as unknown as MediaTrackConstraintSet] })
      .catch((err) => {
        // Some drivers advertise zoom in getCapabilities() and then refuse it.
        console.warn('[potato camera] native zoom rejected, falling back to digital:', err);
        lastNativeZoomRef.current = null;
        zoomModeRef.current = 'digital';
        zoomMinRef.current = 1;
        zoomStepRef.current = 0;
        setZoomMode('digital');
        setZoomMax(MAX_DIGITAL_ZOOM);
        const clamped = clampZoom(zoomRef.current, 1, MAX_DIGITAL_ZOOM);
        zoomRef.current = clamped;
        setZoom(clamped);
      });
  }, []);

  const quantizeZoom = useCallback((z: number) => {
    const step = zoomStepRef.current;
    if (!step || step <= 0) return z;
    const min = zoomMinRef.current;
    return min + Math.round((z - min) / step) * step;
  }, []);

  const setZoomTo = useCallback(
    (next: number) => {
      const capped =
        zoomModeRef.current === 'digital'
          ? clampZoom(next, zoomMinRef.current, MAX_DIGITAL_ZOOM)
          : Math.max(next, zoomMinRef.current);
      if (capped === zoomRef.current) return;
      zoomRef.current = capped;
      setZoom(capped);
      if (zoomModeRef.current === 'native') {
        const track = streamRef.current?.getVideoTracks()[0];
        if (track) applyNativeZoom(track, quantizeZoom(capped));
      }
    },
    [applyNativeZoom, quantizeZoom],
  );

  const resetZoom = useCallback(() => {
    pinchStartRef.current = null;
    setZoomTo(zoomMinRef.current);
  }, [setZoomTo]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!zoomEnabled || e.touches.length !== 2) return;
      pinchStartRef.current = { dist: touchDistance(e.touches), zoom: zoomRef.current };
    },
    [zoomEnabled],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const start = pinchStartRef.current;
      if (!start || e.touches.length !== 2) return;
      // Read through the ref: a pinch in flight when the shutter fires must stop.
      if (!zoomEnabledRef.current || !start.dist) return;
      const ratio = touchDistance(e.touches) / start.dist;
      if (Math.abs(ratio - 1) < PINCH_MIN_DELTA) return;
      setZoomTo(clampZoom(start.zoom * ratio, zoomMinRef.current, zoomMax));
    },
    [setZoomTo, zoomMax],
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartRef.current = null;
  }, []);

  // Safari's proprietary page-pinch events fire alongside touch events. React's
  // root touch listeners are passive, so preventDefault() inside onTouchMove is
  // unreliable — this non-passive listener plus touchAction:'none' is what
  // actually stops the page zooming under the camera.
  useEffect(() => {
    const el = viewfinderRef.current;
    if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener('gesturestart', stop, { passive: false });
    el.addEventListener('gesturechange', stop, { passive: false });
    return () => {
      el.removeEventListener('gesturestart', stop);
      el.removeEventListener('gesturechange', stop);
    };
  }, []);

  // ── orientation ─────────────────────────────────────────────────────────
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    const onOrientation = () => setTimeout(check, 150);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, []);

  // ── camera start ────────────────────────────────────────────────────────
  const startCamera = useCallback(
    async (facing: 'user' | 'environment') => {
      try {
        setCameraState('initializing');
        setError(null);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          setError('This browser can’t open the camera. Use “Choose a photo” instead.');
          setCameraState('error');
          return;
        }

        const constraints: MediaStreamConstraints = {
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        };

        // A timeout that also cleans up a LATE-resolving stream: if the race is
        // lost, getUserMedia keeps running and can grab the camera moments later,
        // leaving the camera light on with no stream assigned.
        const getStream = (c: MediaStreamConstraints, ms: number, label: string): Promise<MediaStream> => {
          let settled = false;
          return new Promise<MediaStream>((resolve, reject) => {
            const timer = setTimeout(() => {
              if (!settled) {
                settled = true;
                reject(new Error(`getUserMedia timeout (${label})`));
              }
            }, ms);
            navigator.mediaDevices.getUserMedia(c).then(
              (s) => {
                clearTimeout(timer);
                if (settled) {
                  s.getTracks().forEach((track) => track.stop());
                  return;
                }
                settled = true;
                resolve(s);
              },
              (e) => {
                clearTimeout(timer);
                if (!settled) {
                  settled = true;
                  reject(e);
                }
              },
            );
          });
        };

        let stream: MediaStream;
        try {
          // Generous first timeout — it may be sitting on the browser's
          // "Allow camera?" prompt, which is a human deciding.
          stream = await getStream(constraints, 20000, 'primary');
        } catch (firstErr) {
          if (firstErr instanceof Error && firstErr.name === 'OverconstrainedError') {
            stream = await getStream({ video: { facingMode: facing }, audio: false }, 12000, 'basic');
          } else {
            throw firstErr;
          }
        }

        streamRef.current = stream;

        // Zoom capability probe — once per stream. Every startCamera produces a
        // NEW track, so the mode/range must be re-derived each time.
        {
          const track = stream.getVideoTracks()[0];
          let mode: 'native' | 'digital' = 'digital';
          let min = 1;
          let max = MAX_DIGITAL_ZOOM;
          let step = 0;
          try {
            const caps = track?.getCapabilities?.() as
              | (MediaTrackCapabilities & { zoom?: { min: number; max: number; step?: number } })
              | undefined;
            if (caps?.zoom && typeof caps.zoom.max === 'number' && caps.zoom.max > caps.zoom.min) {
              mode = 'native';
              min = caps.zoom.min;
              max = caps.zoom.max;
              step = caps.zoom.step ?? 0;
            }
          } catch {
            // Safari can throw here — digital is the correct answer.
          }
          lastNativeZoomRef.current = null;
          zoomModeRef.current = mode;
          zoomMinRef.current = min;
          zoomStepRef.current = step;
          setZoomMode(mode);
          setZoomMax(max);
          const restored = clampZoom(zoomRef.current, min, max);
          zoomRef.current = restored;
          setZoom(restored);
          if (mode === 'native' && track && restored !== min) applyNativeZoom(track, restored);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // play() can hang forever on iOS Safari when srcObject is reassigned
          // rapidly. The <video autoPlay muted playsInline> attributes start
          // playback on their own, so never let an unresolved play() trap us on
          // the spinner.
          try {
            await Promise.race([
              videoRef.current.play(),
              new Promise<void>((resolve) => setTimeout(resolve, 3000)),
            ]);
          } catch (playErr) {
            console.warn('[potato camera] play() did not resolve cleanly:', playErr);
          }
          setCameraState('ready');
          setCurrentFacing(facing);
        }
      } catch (err) {
        console.error('[potato camera] error:', err);
        let message = 'The camera didn’t open.';
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') message = 'The camera is blocked. Allow it in your browser settings.';
          else if (err.name === 'NotFoundError') message = 'No camera found on this device.';
          else if (err.name === 'NotReadableError') message = 'Another app is using the camera.';
          else if (err.name === 'OverconstrainedError') message = 'This camera isn’t supported.';
        }
        setError(message);
        setCameraState('error');
      }
    },
    [applyNativeZoom],
  );

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    };
    // Re-init only when the requested facing changes — startCamera is stable but
    // listing it here has historically caused an init loop that hangs
    // getUserMedia on mobile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ── capture ─────────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
      canvas.width = video.clientWidth || 1920;
      canvas.height = video.clientHeight || 1440;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      // WYSIWYG: CSS scale(z) about the centre of an object-cover video shows
      // the central 1/z of the frame, so capture crops the central 1/z of the
      // source. In native mode the TRACK is already zoomed, so z stays 1 and
      // this is byte-identical to a plain full-frame draw.
      const z =
        zoomModeRef.current === 'digital' && zoomEnabledRef.current ? Math.max(1, zoomRef.current) : 1;
      const sw = vw / z;
      const sh = vh / z;
      const sx = (vw - sw) / 2;
      const sy = (vh - sh) / 2;
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('That shot didn’t save. Try again.');
          return;
        }
        setCaptured({
          blob,
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
          width: canvas.width,
          height: canvas.height,
          timestamp: new Date(),
        });
        setCameraState('captured');
      },
      'image/jpeg',
      0.9,
    );
  }, []);

  const retake = useCallback(() => {
    setCaptured(null);
    startCamera(currentFacing);
  }, [currentFacing, startCamera]);

  const confirm = useCallback(() => {
    if (captured) onCapture(captured);
  }, [captured, onCapture]);

  const switchCamera = useCallback(() => {
    startCamera(currentFacing === 'environment' ? 'user' : 'environment');
  }, [currentFacing, startCamera]);

  // ── album fallback ──────────────────────────────────────────────────────
  const handleAlbumSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (albumInputRef.current) albumInputRef.current.value = '';
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read that photo'));
        reader.readAsDataURL(file);
      });
      const dims = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = dataUrl;
      });
      setCaptured({ blob: file, dataUrl, width: dims.width, height: dims.height, timestamp: new Date() });
      setCameraState('captured');
    } catch (err) {
      console.error('[potato camera] album pick error:', err);
      setError('Could not open that photo.');
    }
  }, []);

  // ── render ──────────────────────────────────────────────────────────────
  const isCaptured = cameraState === 'captured';

  const shutter = (
    <button
      type="button"
      onClick={capturePhoto}
      disabled={cameraState !== 'ready'}
      aria-label="Take the photo"
      className="w-[72px] h-[72px] rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none bg-transparent border-[3px] border-white"
    >
      <div className="w-[62px] h-[62px] rounded-full bg-white" />
    </button>
  );

  const albumButton = (
    <button
      type="button"
      onClick={() => albumInputRef.current?.click()}
      title="Choose a photo"
      aria-label="Choose a photo"
      className={`w-9 h-9 flex items-center justify-center rounded-full text-white/70 active:text-white transition-colors ${
        isLandscape ? '-rotate-90' : ''
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    </button>
  );

  return (
    <div className={`fixed inset-0 bg-black z-50 flex ${isLandscape ? 'flex-row' : 'flex-col'}`}>
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        onChange={handleAlbumSelect}
        className="hidden"
      />

      {/* Viewfinder — what the preview shows is EXACTLY what gets captured, and
          the controls never overlay it. */}
      <div
        ref={viewfinderRef}
        className="flex-1 relative overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        {cameraState === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white text-center">
            <div className="text-5xl mb-4">📷</div>
            <p className="text-lg font-medium mb-5">{error}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => startCamera(currentFacing)}
                className="px-5 py-3 rounded-2xl font-semibold"
                style={{ background: '#E8A317', color: '#23395B' }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => albumInputRef.current?.click()}
                className="px-5 py-3 rounded-2xl font-semibold border border-white/30 text-white"
              >
                Choose a photo
              </button>
            </div>
          </div>
        ) : isCaptured && captured ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={captured.dataUrl} alt="The photo you just took" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={
                zoomEnabled && zoomMode === 'digital' && zoom > 1
                  ? { transform: `scale(${zoom})`, transformOrigin: 'center center', willChange: 'transform' }
                  : undefined
              }
            />
            {cameraState === 'initializing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-white/30 border-t-white" />
              </div>
            )}
          </>
        )}

        {!isCaptured && cameraState === 'ready' && (
          <button
            type="button"
            onClick={switchCamera}
            aria-label="Switch camera"
            className="absolute z-30 w-11 h-11 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-full text-white active:scale-90 transition-transform"
            style={{ top: 'max(16px, env(safe-area-inset-top, 16px))', right: 16 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLandscape ? 'rotate-90' : ''}>
              <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
              <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
              <circle cx="12" cy="12" r="3" />
              <path d="m18 22-3-3 3-3" />
              <path d="m6 2 3 3-3 3" />
            </svg>
          </button>
        )}

        {zoomEnabled && zoom > 1.02 && (
          <button
            type="button"
            onClick={resetZoom}
            className="absolute z-30 px-3 h-8 rounded-full bg-black/45 backdrop-blur-sm text-white text-xs font-semibold tabular-nums active:scale-95 transition-transform"
            style={{ left: '50%', transform: 'translateX(-50%)', bottom: 16 }}
          >
            {zoom.toFixed(1)}×
          </button>
        )}
      </div>

      {/* Controls — a solid region that NEVER overlays the preview. Portrait: a
          bar below. Landscape: a 140px rail on the physical right edge. */}
      <div
        className={`bg-black ${isLandscape ? 'flex flex-col w-[140px]' : ''}`}
        style={
          isLandscape
            ? { paddingRight: 'max(8px, env(safe-area-inset-right, 8px))' }
            : { paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }
        }
      >
        {isCaptured ? (
          isLandscape ? (
            <div className="flex flex-col-reverse items-center justify-between flex-1 py-8">
              <button type="button" onClick={retake} className="text-white font-medium text-base active:opacity-70 -rotate-90">
                Retake
              </button>
              <button type="button" onClick={confirm} className="font-semibold text-base active:opacity-70 -rotate-90" style={{ color: '#FFD466' }}>
                Use photo
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-6 py-4">
              <button type="button" onClick={retake} className="text-white font-medium text-base active:opacity-70">
                Retake
              </button>
              <button type="button" onClick={confirm} className="font-semibold text-base active:opacity-70" style={{ color: '#FFD466' }}>
                Use photo
              </button>
            </div>
          )
        ) : isLandscape ? (
          <div className="flex flex-col items-center justify-between flex-1 py-6">
            <div />
            {shutter}
            <div className="flex flex-col items-center gap-3">
              {albumButton}
              <button type="button" onClick={onCancel} className="text-white text-[15px] font-medium active:opacity-70 -rotate-90">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex items-center w-full px-6 py-3">
              <div className="flex items-center gap-3 flex-1">
                <button type="button" onClick={onCancel} className="text-white text-[15px] font-medium active:opacity-70">
                  Cancel
                </button>
                {albumButton}
              </div>
              {shutter}
              <div className="flex-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
