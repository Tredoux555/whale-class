// components/montree/media/CameraCapture.tsx
// Camera capture — clean fullscreen viewfinder matching native iOS camera feel
// No 4:3 overlay — photos are captured at native video resolution, cropped later if needed

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CapturedPhoto, CapturedVideo, CapturedMedia } from '@/lib/montree/media/types';
import { useI18n } from '@/lib/montree/i18n';
import { compressImage as compressCacheImage } from '@/lib/montree/cache';
import { isNativeCameraAvailable, captureNativePhoto, pickFromAlbum } from '@/lib/montree/platform/camera';

// ============================================
// TYPES
// ============================================

interface CameraCaptureProps {
  onCapture: (media: CapturedMedia) => void;
  onCancel: () => void;
  facingMode?: 'user' | 'environment';
  allowVideo?: boolean;
  // PATH B (event session) remounts this component after every shot to get a
  // live viewfinder back. A remount resets ALL local state, which would wipe the
  // teacher's zoom between consecutive frames of the same scene — exactly what
  // SPEC2 §2.2 rules out. The parent keeps the last level and hands it back.
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
}

type CameraState = 'initializing' | 'ready' | 'recording' | 'captured' | 'error';
type CaptureMode = 'photo' | 'video';

const MAX_VIDEO_DURATION = 30; // seconds

// ── Zoom ─────────────────────────────────────────────────────────────────
// Digital zoom is a real crop of the sensor frame, so it costs resolution:
// at 3× a 1920×1080 feed yields 640×360. That is the floor we accept —
// do NOT raise this without a call (SPEC2 §2.2 / §6 risk 4).
const MAX_DIGITAL_ZOOM = 3;
// Ignore sub-2% pinch jitter so a resting two-finger hold doesn't crawl.
const PINCH_MIN_DELTA = 0.02;

const clampZoom = (z: number, min: number, max: number) => Math.min(Math.max(z, min), max);

// Distance between the first two touch points — the pinch metric.
// Typed against React's synthetic TouchList (this is only ever called from
// React.TouchEvent handlers), not the DOM lib's TouchList, which requires an
// iterator React's type doesn't declare.
const touchDistance = (touches: React.TouchList) => {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
};

// ============================================
// COMPONENT
// ============================================

export default function CameraCapture({
  onCapture,
  onCancel,
  facingMode = 'environment',
  allowVideo = true,
  initialZoom = 1,
  onZoomChange,
}: CameraCaptureProps) {
  // Never trust the restored value blindly: floor at 1×. The per-stream
  // capability probe in startCamera clamps it to what THIS track supports
  // before the preview ever becomes visible (zoomEnabled is false while
  // cameraState === 'initializing', so no transform is applied until then).
  const startZoomRef = useRef(
    Number.isFinite(initialZoom) ? Math.max(1, initialZoom) : 1
  );
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartRef = useRef<number>(0);

  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [error, setError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [capturedVideo, setCapturedVideo] = useState<CapturedVideo | null>(null);
  const [currentFacing, setCurrentFacing] = useState(facingMode);
  const [recordingTime, setRecordingTime] = useState(0);
  const albumInputRef = useRef<HTMLInputElement>(null);

  // ── Zoom state ──────────────────────────────────────────────────────────
  // Two modes, decided once per stream by the capability probe in startCamera:
  //  • 'native'  — the TRACK zooms (getCapabilities().zoom + applyConstraints).
  //                videoWidth/Height are unchanged, so the preview needs no CSS
  //                transform and capturePhoto() needs no crop. Video records
  //                genuinely zoomed.
  //  • 'digital' — mandatory fallback and the real path on iPhone (WebKit does
  //                not expose `zoom` on iOS): CSS scale on the preview + a
  //                matching centred crop at capture time, so the saved JPEG is
  //                exactly what the teacher framed.
  const [zoom, setZoom] = useState(startZoomRef.current);
  const [zoomMode, setZoomMode] = useState<'native' | 'digital'>('digital');
  const [zoomMax, setZoomMax] = useState(MAX_DIGITAL_ZOOM);
  // Fresh-value refs. Touch handlers fire far faster than React re-renders and
  // capturePhoto() must read the CURRENT zoom without taking `zoom` as a dep
  // (same pattern as PhotoCropModal's `v.current`).
  const zoomRef = useRef(startZoomRef.current);
  const zoomMinRef = useRef(1);
  const zoomStepRef = useRef(0);            // native step; 0 ⇒ continuous
  const zoomModeRef = useRef<'native' | 'digital'>('digital');
  const zoomEnabledRef = useRef(false);
  const lastNativeZoomRef = useRef<number | null>(null);
  const pinchStartRef = useRef<{ dist: number; zoom: number } | null>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);

  // Zoom is available only when there is a live feed to zoom, and — in digital
  // mode — only for photos. MediaRecorder records the RAW track, so a CSS-only
  // zoom during video would show the teacher a close-up and record a wide shot.
  // Native zoom is real, so it is allowed while recording. (SPEC2 §6 risk 3.)
  const zoomEnabled =
    cameraState !== 'captured' &&
    cameraState !== 'initializing' &&
    cameraState !== 'error' &&
    (zoomMode === 'native' || captureMode === 'photo');

  zoomModeRef.current = zoomMode;
  zoomEnabledRef.current = zoomEnabled;

  // Report the live level up so a parent that remounts us (PATH B event
  // sessions bump a key on this component after every shot) can hand the same
  // zoom straight back. One effect on `zoom` covers EVERY writer — pinch,
  // reset, the blocked-mode reset, the per-stream clamp and the native→digital
  // demotion — so no write path can silently drift. Read through a ref so an
  // inline arrow prop can't churn the dep array.
  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  useEffect(() => {
    onZoomChangeRef.current?.(zoom);
  }, [zoom]);

  // Reset only on the DURABLE off-conditions. 'captured' and 'initializing'
  // are transient (every shot, every retake, every camera switch passes through
  // them) — resetting there would wipe the zoom between shots, which is exactly
  // the behaviour SPEC2 §2.2 rules out: the teacher stands back from a child at
  // work and takes several frames of the same scene.
  const zoomBlocked = cameraState === 'error' || (zoomMode === 'digital' && captureMode === 'video');
  useEffect(() => {
    if (!zoomBlocked) return;
    pinchStartRef.current = null;
    if (zoomRef.current === zoomMinRef.current) return;
    zoomRef.current = zoomMinRef.current;
    setZoom(zoomMinRef.current);
  }, [zoomBlocked]);

  const applyNativeZoom = useCallback((track: MediaStreamTrack, z: number) => {
    if (lastNativeZoomRef.current === z) return;
    lastNativeZoomRef.current = z;
    track
      // `zoom` is not in TS's MediaTrackConstraintSet — cast at the call site
      // rather than augmenting the DOM lib globally.
      .applyConstraints({ advanced: [{ zoom: z } as unknown as MediaTrackConstraintSet] })
      .catch((err) => {
        // Some drivers advertise `zoom` in getCapabilities() and then refuse it.
        // Demote to digital for the rest of this stream or the teacher pinches
        // and nothing moves. (SPEC2 §6 risk 2.)
        console.warn('[CameraCapture] native zoom rejected, falling back to digital:', err);
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

  // Snap to the driver's advertised step, if it publishes one.
  const quantizeZoom = useCallback((z: number) => {
    const step = zoomStepRef.current;
    if (!step || step <= 0) return z;
    const min = zoomMinRef.current;
    return min + Math.round((z - min) / step) * step;
  }, []);

  const setZoomTo = useCallback((next: number) => {
    // Callers clamp to the live range; this is the belt-and-braces ceiling that
    // survives the one-render window after a native→digital demotion, when the
    // `zoomMax` the pinch handler closed over may still be the track's (much
    // larger) native max. Digital can therefore NEVER exceed MAX_DIGITAL_ZOOM,
    // which is also what keeps the capture crop inside its resolution budget.
    const capped = zoomModeRef.current === 'digital'
      ? clampZoom(next, zoomMinRef.current, MAX_DIGITAL_ZOOM)
      : Math.max(next, zoomMinRef.current);
    if (capped === zoomRef.current) return;
    zoomRef.current = capped;
    setZoom(capped);
    if (zoomModeRef.current === 'native') {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track) applyNativeZoom(track, quantizeZoom(capped));
    }
  }, [applyNativeZoom, quantizeZoom]);

  const resetZoom = useCallback(() => {
    pinchStartRef.current = null;
    setZoomTo(zoomMinRef.current);
  }, [setZoomTo]);

  // ── Pinch gesture (viewfinder only — never the controls region) ──────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!zoomEnabled) return;
    // A single touch does nothing on the viewfinder today; leave it alone so
    // nothing existing changes behaviour.
    if (e.touches.length !== 2) return;
    pinchStartRef.current = { dist: touchDistance(e.touches), zoom: zoomRef.current };
  }, [zoomEnabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const start = pinchStartRef.current;
    if (!start || e.touches.length !== 2) return;
    // Read through the ref, not the closure: a pinch in flight when the shutter
    // fires (or the feed errors) must stop moving the zoom immediately.
    if (!zoomEnabledRef.current) return;
    const dist = touchDistance(e.touches);
    if (!start.dist) return;
    const ratio = dist / start.dist;
    if (Math.abs(ratio - 1) < PINCH_MIN_DELTA) return;
    setZoomTo(clampZoom(start.zoom * ratio, zoomMinRef.current, zoomMax));
  }, [setZoomTo, zoomMax]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartRef.current = null;
  }, []);

  // Safari's proprietary page-pinch events fire alongside touch events in a
  // browser tab (harmless in the standalone PWA). React's root touch listeners
  // are passive, so preventDefault() inside onTouchMove is unreliable — this
  // non-passive listener plus touchAction:'none' on the container is what
  // actually stops the page from zooming under the camera.
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

  // Orientation drives Apple-style control placement. Portrait → bottom bar.
  // Landscape → a vertical rail on the physical (right) edge with labels
  // -rotate-90 so they read upright. This is the device-validated layout from
  // ded705b3: a bottom bar in landscape squashes the preview into a strip and
  // reads nothing like a native camera, so the controls move to the side.
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    const handleOrientation = () => setTimeout(check, 150);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', handleOrientation);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, []);

  // ============================================
  // NATIVE CAMERA (Capacitor — iOS/Android)
  // ============================================

  useEffect(() => {
    if (!isNativeCameraAvailable()) return;

    let mounted = true;

    const doNativeCapture = async () => {
      try {
        if (!mounted) return;
        setCameraState('initializing');
        const photo = await captureNativePhoto({
          facing: facingMode,
          quality: 90,
          targetWidth: 1920,
          targetHeight: 1080,
        });

        if (!mounted) return;

        const compressed = await compressCacheImage(photo.blob);
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(compressed);
        });

        if (!mounted) return;

        const img = new Image();
        img.onload = () => {
          if (!mounted) return;
          onCapture({
            type: 'photo',
            data: {
              blob: compressed,
              dataUrl,
              width: img.naturalWidth,
              height: img.naturalHeight,
              timestamp: new Date(),
            },
          });
        };
        img.onerror = () => {
          if (!mounted) return;
          onCapture({
            type: 'photo',
            data: { blob: compressed, dataUrl, width: 1920, height: 1080, timestamp: new Date() },
          });
        };
        img.src = dataUrl;
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error && err.message.includes('cancelled')) {
          onCancel();
          return;
        }
        // Native camera failed — fall through to web camera
        console.error('Native camera error, falling back to web:', err);
        setCameraState('initializing');
      }
    };

    doNativeCapture();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================
  // NATIVE ALBUM PICKER (Capacitor)
  // ============================================

  const handleNativeAlbumPick = useCallback(async () => {
    if (!isNativeCameraAvailable()) {
      albumInputRef.current?.click();
      return;
    }

    try {
      const photo = await pickFromAlbum();
      const compressed = await compressCacheImage(photo.blob);
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(compressed);
      });

      const img = new Image();
      img.onload = () => {
        onCapture({
          type: 'photo',
          data: {
            blob: compressed,
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            timestamp: new Date(),
          },
        });
      };
      img.onerror = () => {
        onCapture({
          type: 'photo',
          data: { blob: compressed, dataUrl, width: 0, height: 0, timestamp: new Date() },
        });
      };
      img.src = dataUrl;
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) return;
      console.error('Native album error:', err);
      setError(t('camera.error.captureFailed'));
    }
  }, [onCapture, t]);

  // ============================================
  // ALBUM / PHOTO LIBRARY PICKER (Web fallback)
  // ============================================

  const processAlbumFile = useCallback(async (file: File): Promise<CapturedPhoto> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read album photo'));
      reader.readAsDataURL(file);
    });

    const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 1920, height: 1080 });
      img.src = dataUrl;
    });

    return { blob: file, dataUrl, width, height, timestamp: new Date() };
  }, []);

  const handleAlbumSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (albumInputRef.current) albumInputRef.current.value = '';

    try {
      const photo = await Promise.race([
        processAlbumFile(file),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Album photo processing timed out')), 15_000)
        ),
      ]);
      onCapture({ type: 'photo', data: photo });
    } catch (err) {
      console.error('[ALBUM] Album pick error:', err);
      setError(t('camera.error.captureFailed'));
    }
  }, [onCapture, t, processAlbumFile]);

  // ============================================
  // CAMERA INITIALIZATION
  // ============================================

  const startCamera = useCallback(async (facing: 'user' | 'environment', withAudio = false) => {
    try {
      setCameraState('initializing');
      setError(null);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: withAudio,
      };

      // getUserMedia with a timeout that also cleans up a late-resolving stream.
      // Two failure modes this guards against:
      //  1) On mobile, calling getUserMedia while a prior stream is still releasing
      //     can hang forever (the original "camera won't open" freeze).
      //  2) If the race times out, the underlying getUserMedia keeps running and can
      //     grab the camera moments later — leaving the camera light on with no
      //     stream assigned. We stop that orphan stream's tracks when it lands late.
      // The first attempt gets a generous timeout because it may be sitting on the
      // browser's "Allow camera?" permission prompt (a human deciding). Retries are
      // shorter since permission is already settled by then.
      const getStream = (c: MediaStreamConstraints, ms: number, label: string): Promise<MediaStream> => {
        let settled = false;
        return new Promise<MediaStream>((resolve, reject) => {
          const timer = setTimeout(() => {
            if (!settled) { settled = true; reject(new Error(`getUserMedia timeout (${label})`)); }
          }, ms);
          navigator.mediaDevices.getUserMedia(c).then(
            (s) => {
              clearTimeout(timer);
              if (settled) {
                s.getTracks().forEach(track => track.stop()); // race already lost — release it
                return;
              }
              settled = true;
              resolve(s);
            },
            (e) => {
              clearTimeout(timer);
              if (!settled) { settled = true; reject(e); }
            }
          );
        });
      };

      let stream: MediaStream;
      try {
        stream = await getStream(constraints, 20000, 'primary');
      } catch (firstErr) {
        if (withAudio) {
          console.warn('Camera+audio failed, retrying video-only:', firstErr);
          try {
            stream = await getStream({ video: constraints.video, audio: false }, 12000, 'video-only');
          } catch (secondErr) {
            console.warn('HD video failed, retrying basic:', secondErr);
            stream = await getStream({ video: { facingMode: facing }, audio: false }, 12000, 'basic');
          }
        } else if (firstErr instanceof Error && firstErr.name === 'OverconstrainedError') {
          console.warn('HD constraints failed, retrying basic:', firstErr);
          stream = await getStream({ video: { facingMode: facing }, audio: false }, 12000, 'basic');
        } else {
          throw firstErr;
        }
      }

      streamRef.current = stream;

      // ── Zoom capability probe — once per stream ──────────────────────────
      // Every startCamera() (facing change, mode change, retake) produces a NEW
      // track, so the mode/range must be re-derived and the teacher's zoom
      // re-applied to it, clamped to what THIS track supports.
      {
        const track = stream.getVideoTracks()[0];
        let mode: 'native' | 'digital' = 'digital';
        let min = 1;
        let max = MAX_DIGITAL_ZOOM;
        let step = 0;
        try {
          // `zoom` is absent from TS's MediaTrackCapabilities; getCapabilities
          // itself is optional-chained because WebKit has shipped without it.
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
          // Safari can throw here — the digital fallback is the correct answer.
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
        if (mode === 'native' && track && restored !== min) {
          applyNativeZoom(track, restored);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // play() can hang indefinitely on iOS Safari / the installed PWA when
        // srcObject is reassigned rapidly. The <video autoPlay muted playsInline>
        // attributes start playback on their own, so never let an unresolved (or
        // rejected) play() trap us on the "initializing" spinner — proceed to
        // 'ready' either way after a short grace period.
        try {
          await Promise.race([
            videoRef.current.play(),
            new Promise<void>((resolve) => setTimeout(resolve, 3000)),
          ]);
        } catch (playErr) {
          console.warn('[CameraCapture] video.play() did not resolve cleanly, showing feed anyway:', playErr);
        }
        setCameraState('ready');
        setCurrentFacing(facing);
      }
    } catch (err) {
      console.error('Camera error:', err);

      let errorMessage = t('camera.error.failed');
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') errorMessage = t('camera.error.denied');
        else if (err.name === 'NotFoundError') errorMessage = t('camera.error.notFound');
        else if (err.name === 'NotReadableError') errorMessage = t('camera.error.inUse');
        else if (err.name === 'OverconstrainedError') errorMessage = t('camera.error.unsupported');
      }

      setError(errorMessage);
      setCameraState('error');
    }
  }, [t, applyNativeZoom]);

  useEffect(() => {
    startCamera(facingMode, captureMode === 'video');

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
    // IMPORTANT: do NOT include startCamera in deps — it closes over `t` from useI18n
    // which can change identity on re-render, causing an infinite init loop that
    // hangs getUserMedia on mobile. Re-init only when facing or captureMode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, captureMode]);

  // ============================================
  // CAPTURE PHOTO — FULL FRAME (no crop overlay)
  // ============================================

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
      // Video not ready yet — capture display dimensions as fallback
      console.warn('[CameraCapture] Video dimensions not ready, capturing raw frame');
      canvas.width = video.clientWidth || 1920;
      canvas.height = video.clientHeight || 1440;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else {
      // Capture full native resolution from the video feed, cropped to match a
      // DIGITAL zoom so the saved JPEG is exactly what the preview framed.
      //
      // Why this is WYSIWYG: CSS scale(z) about the centre of an object-cover
      // video shows the central 1/z of what was visible; cropping the central
      // 1/z of the source frame is the same region. sw/sh === vw/vh, so the
      // frame's aspect ratio — and therefore the pre-existing object-cover
      // relationship between the preview box and the sensor frame — is
      // unchanged. That slight object-cover crop predates zoom and is neither
      // introduced nor widened here; don't "correct" it.
      //
      // In native mode the TRACK is already zoomed (no CSS transform is applied),
      // so z stays 1 and this is byte-identical to the old full-frame draw —
      // as it is at z = 1 in digital mode (sx=sy=0, sw=vw, sh=vh).
      // Read through refs: capturePhoto must see the CURRENT zoom, not the
      // value captured when this callback was last created.
      const z = zoomModeRef.current === 'digital' && zoomEnabledRef.current
        ? Math.max(1, zoomRef.current)
        : 1;
      const sw = vw / z;
      const sh = vh / z;
      const sx = (vw - sw) / 2;   // centred — matches transformOrigin: center
      const sy = (vh - sh) / 2;
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) { setError(t('camera.error.captureFailed')); return; }
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const photo: CapturedPhoto = {
          blob, dataUrl,
          width: canvas.width, height: canvas.height,
          timestamp: new Date(),
        };
        setCapturedPhoto(photo);
        setCameraState('captured');
      },
      'image/jpeg',
      0.9
    );
  }, [t]);

  // ============================================
  // VIDEO RECORDING
  // ============================================

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setRecordingTime(0);
    recordingStartRef.current = Date.now();

    try {
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';

      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const duration = Math.round((Date.now() - recordingStartRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const dataUrl = URL.createObjectURL(blob);
        const video: CapturedVideo = { blob, dataUrl, duration, timestamp: new Date() };
        setCapturedVideo(video);
        setCameraState('captured');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setCameraState('recording');

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= MAX_VIDEO_DURATION) stopRecording();
          return newTime;
        });
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
      setError(t('camera.error.recordingFailed'));
    }
  }, [t]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ============================================
  // ACTIONS
  // ============================================

  const retake = useCallback(() => {
    setCapturedPhoto(null);
    setCapturedVideo(null);
    setRecordingTime(0);
    startCamera(currentFacing, captureMode === 'video');
  }, [currentFacing, captureMode, startCamera]);

  const confirmCapture = useCallback(() => {
    if (captureMode === 'photo' && capturedPhoto) {
      onCapture({ type: 'photo', data: capturedPhoto });
    } else if (captureMode === 'video' && capturedVideo) {
      onCapture({ type: 'video', data: capturedVideo });
    }
  }, [captureMode, capturedPhoto, capturedVideo, onCapture]);

  const switchCamera = useCallback(() => {
    const newFacing = currentFacing === 'environment' ? 'user' : 'environment';
    startCamera(newFacing, captureMode === 'video');
  }, [currentFacing, captureMode, startCamera]);

  const handleModeChange = useCallback((mode: CaptureMode) => {
    if (cameraState === 'recording') return;
    setCaptureMode(mode);
    startCamera(currentFacing, mode === 'video');
  }, [cameraState, currentFacing, startCamera]);

  const handleMainButton = useCallback(() => {
    if (captureMode === 'photo') {
      capturePhoto();
    } else {
      if (cameraState === 'recording') stopRecording();
      else startRecording();
    }
  }, [captureMode, cameraState, capturePhoto, startRecording, stopRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ============================================
  // RENDER — iOS-native camera feel
  // ============================================

  const isRecording = cameraState === 'recording';
  const isCaptured = cameraState === 'captured';
  const previewUrl = captureMode === 'photo' ? capturedPhoto?.dataUrl : capturedVideo?.dataUrl;

  // Shutter button JSX — identical size in portrait and landscape (iOS-native)
  const shutterButton = (
    <button
      onClick={handleMainButton}
      disabled={cameraState === 'initializing'}
      className="w-[72px] h-[72px] rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-30 disabled:pointer-events-none bg-transparent border-[3px] border-white"
    >
      {isRecording ? (
        <div className="w-6 h-6 bg-red-500 rounded-[4px]" />
      ) : captureMode === 'video' ? (
        <div className="w-[58px] h-[58px] rounded-full bg-red-500" />
      ) : (
        <div className="w-[62px] h-[62px] rounded-full bg-white" />
      )}
    </button>
  );

  const albumIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );

  const cameraIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
  const videoIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 8-6 4 6 4V8Z" />
      <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
    </svg>
  );

  // PHOTO / VIDEO mode toggle — an emerald (on-brand) segmented icon pill. Icons
  // instead of text so it never overlaps when the rail rotates in landscape (a
  // rotated text label keeps its unrotated layout box, so two stacked rotated
  // words collide — the "VIDEPHOTO" bug). Squares don't. Row in portrait,
  // column in landscape; active = emerald fill, inactive = dim white.
  const modeToggle = (
    <div
      className={`flex ${isLandscape ? 'flex-col' : 'flex-row'} gap-1 p-1 my-1 rounded-full`}
      style={{ background: 'rgba(255,255,255,0.10)' }}
    >
      <button
        onClick={() => handleModeChange('photo')}
        aria-label={t('camera.photo')}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={captureMode === 'photo' ? { background: '#34d399', color: '#04150c' } : { color: 'rgba(255,255,255,0.55)' }}
      >
        {cameraIcon}
      </button>
      <button
        onClick={() => handleModeChange('video')}
        aria-label={t('camera.video')}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={captureMode === 'video' ? { background: '#34d399', color: '#04150c' } : { color: 'rgba(255,255,255,0.55)' }}
      >
        {videoIcon}
      </button>
    </div>
  );

  return (
    <div className={`fixed inset-0 bg-black z-50 flex ${isLandscape ? 'flex-row' : 'flex-col'}`}>
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      {/* Hidden file input for album selection */}
      <input
        ref={albumInputRef}
        type="file"
        accept="image/jpeg,.jpg,.jpeg"
        onChange={handleAlbumSelect}
        className="hidden"
      />

      {/* ═══ Camera View — a DISTINCT region. What the preview shows is EXACTLY
           what gets captured (object-cover fills this box = the capture frame);
           the controls never overlay it. The preview reorients with the device;
           the controls below never move. ═══ */}
      <div
        ref={viewfinderRef}
        className="flex-1 relative overflow-hidden bg-black"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        // touchAction:'none' is what actually stops Safari's page zoom (same
        // technique as PhotoLightbox). Scoped to the viewfinder ONLY — on the
        // root it would kill the controls region's own touch behaviour.
        style={{ touchAction: 'none' }}
      >
        {cameraState === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-xl font-medium text-center mb-4">{error}</p>
            <button
              onClick={() => startCamera(currentFacing, captureMode === 'video')}
              className="btn btn-primary btn-lg"
            >
              {t('camera.tryAgain')}
            </button>
          </div>
        ) : isCaptured && previewUrl ? (
          captureMode === 'photo' ? (
            <img src={previewUrl} alt="Captured" className="absolute inset-0 w-full h-full object-contain" />
          ) : (
            <video src={previewUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-contain" />
          )
        ) : (
          <>
            {/* Live camera feed — fullscreen, no cropping overlay */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              // Digital zoom only. In native mode the track is already zoomed —
              // applying the transform too would double-zoom the preview and
              // break WYSIWYG against the (uncropped) capture.
              style={
                zoomEnabled && zoomMode === 'digital' && zoom > 1
                  ? { transform: `scale(${zoom})`, transformOrigin: 'center center', willChange: 'transform' }
                  : undefined
              }
            />

            {/* Loading spinner — only shown during initialization */}
            {cameraState === 'initializing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                <div className="flex flex-col items-center text-white">
                  <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-white/30 border-t-white mb-3" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Switch camera — top right (iOS-style) */}
        {!isCaptured && cameraState === 'ready' && !isRecording && (
          <button
            onClick={switchCamera}
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

        {/* Recording indicator — top center */}
        {isRecording && (
          <div className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-red-600/90 backdrop-blur-sm text-white px-4 py-1.5 rounded-full" style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}>
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
            <span className="font-mono font-bold text-sm">{formatTime(recordingTime)}</span>
            <span className="text-white/60 text-xs">/ {formatTime(MAX_VIDEO_DURATION)}</span>
          </div>
        )}

        {/* Zoom indicator / reset — bottom-centre of the VIEWFINDER, clear of
            the switch-camera button (top-right) and of the capture page's event
            chip (top-left). Its text content IS its accessible name, so this
            needs no aria-label and no i18n key: the level is numeric and the
            × is U+00D7. Tapping it returns to 1.0×. Hidden at rest so the
            viewfinder stays clean. */}
        {zoomEnabled && zoom > 1.02 && (
          <button
            onClick={resetZoom}
            className="absolute z-30 px-3 h-8 rounded-full bg-black/45 backdrop-blur-sm text-white text-xs font-semibold tabular-nums active:scale-95 transition-transform"
            style={{ left: '50%', transform: 'translateX(-50%)', bottom: 16 }}
          >
            {zoom.toFixed(1)}×
          </button>
        )}
      </div>

      {/* ═══ Controls — a solid, distinct region that NEVER overlays the preview,
           so the preview always shows exactly what's captured. Portrait: a bar
           BELOW the preview. Landscape: a 140px vertical rail on the physical
           (right) edge with labels -rotate-90 so they read upright — Apple's
           behaviour (the shutter follows the device's physical bottom edge; it
           doesn't reflow into a fat bottom bar that squashes the preview). Min
           edge clearance so the button never hugs the browser chrome (env
           safe-area reports 0 in a plain browser tab). ═══ */}
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
            /* ── Post-capture (landscape): Retake / Use Photo — vertical rail ── */
            <div className="flex flex-col-reverse items-center justify-between flex-1 py-8">
              <button
                onClick={retake}
                className="text-white font-medium text-base active:opacity-70 transition-opacity -rotate-90"
              >
                {t('camera.retake')}
              </button>
              <button
                onClick={confirmCapture}
                className="text-yellow-400 font-semibold text-base active:opacity-70 transition-opacity -rotate-90"
              >
                {t('camera.use')} {captureMode === 'photo' ? t('camera.photo') : t('camera.video')}
              </button>
            </div>
          ) : (
            /* ── Post-capture (portrait): Retake / Use Photo — bottom bar ── */
            <div className="flex items-center justify-between px-6 py-4">
              <button
                onClick={retake}
                className="text-white font-medium text-base active:opacity-70 transition-opacity"
              >
                {t('camera.retake')}
              </button>
              <button
                onClick={confirmCapture}
                className="text-yellow-400 font-semibold text-base active:opacity-70 transition-opacity"
              >
                {t('camera.use')} {captureMode === 'photo' ? t('camera.photo') : t('camera.video')}
              </button>
            </div>
          )
        ) : isLandscape ? (
          /* ── Live controls (landscape) — vertical rail ── */
          <div className="flex flex-col items-center justify-between flex-1 py-6">
            {/* Mode toggle — top of rail (emerald icon pill, no rotated text) */}
            {allowVideo && !isRecording ? modeToggle : <div />}

            {/* Shutter — center of rail */}
            {shutterButton}

            {/* Album + Cancel — bottom of rail */}
            <div className="flex flex-col items-center gap-3">
              {!isRecording && captureMode === 'photo' && (
                <button
                  onClick={handleNativeAlbumPick}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 active:text-white transition-colors -rotate-90"
                  title={t('camera.album')}
                >
                  {albumIcon}
                </button>
              )}
              <button
                onClick={onCancel}
                disabled={isRecording}
                className="text-white text-[15px] font-medium disabled:opacity-30 active:opacity-70 transition-opacity -rotate-90"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Live controls (portrait) — bottom bar ── */
          <div className="flex flex-col items-center">
            {/* Mode toggle — above capture button (emerald icon pill) */}
            {allowVideo && !isRecording && modeToggle}

            {/* Main row: Cancel / Album — [Capture] — spacer */}
            <div className="flex items-center w-full px-6 py-3">
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={onCancel}
                  disabled={isRecording}
                  className="text-white text-[15px] font-medium disabled:opacity-30 active:opacity-70 transition-opacity"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                {!isRecording && captureMode === 'photo' && (
                  <button
                    onClick={handleNativeAlbumPick}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-white/70 active:text-white transition-colors"
                    title={t('camera.album')}
                  >
                    {albumIcon}
                  </button>
                )}
              </div>

              {shutterButton}

              <div className="flex-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
