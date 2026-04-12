// components/montree/media/CameraCapture.tsx
// Camera capture with 4:3 viewfinder overlay — WYSIWYG for parent reports
// Photos are auto-cropped to the 4:3 zone on capture

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
}

type CameraState = 'initializing' | 'ready' | 'recording' | 'captured' | 'error';
type CaptureMode = 'photo' | 'video';

const MAX_VIDEO_DURATION = 30; // seconds
const TARGET_ASPECT = 4 / 3; // Width:Height ratio for parent report display

// ============================================
// COMPONENT
// ============================================

export default function CameraCapture({
  onCapture,
  onCancel,
  facingMode = 'environment',
  allowVideo = true,
}: CameraCaptureProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Viewfinder dimensions (updated on resize)
  const [viewfinder, setViewfinder] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  // ============================================
  // VIEWFINDER CALCULATION
  // ============================================

  const updateViewfinder = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const landscape = cw > ch;
    setIsLandscape(landscape);

    // Calculate the largest 4:3 rectangle that fits within the container with margin
    const margin = 0.04; // 4% margin on each side
    const availW = cw * (1 - margin * 2);
    const availH = ch * (1 - margin * 2);
    const availRatio = availW / availH;

    let zoneW: number, zoneH: number;
    if (availRatio > TARGET_ASPECT) {
      // Container wider than 4:3 — constrained by height
      zoneH = availH;
      zoneW = availH * TARGET_ASPECT;
    } else {
      // Container taller than 4:3 — constrained by width
      zoneW = availW;
      zoneH = availW / TARGET_ASPECT;
    }

    setViewfinder({
      x: (cw - zoneW) / 2,
      y: (ch - zoneH) / 2,
      w: zoneW,
      h: zoneH,
    });
  }, []);

  useEffect(() => {
    updateViewfinder();

    // Use ResizeObserver for accurate container dimension tracking
    const container = containerRef.current;
    let ro: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => updateViewfinder());
      ro.observe(container);
    }

    // Fallback: also listen for window resize + orientation change
    const handleResize = () => updateViewfinder();
    const handleOrientation = () => setTimeout(updateViewfinder, 150);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientation);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [updateViewfinder]);

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

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        if (withAudio) {
          console.warn('Camera+audio failed, retrying video-only:', firstErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: constraints.video, audio: false });
          } catch (secondErr) {
            console.warn('HD video failed, retrying basic:', secondErr);
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
          }
        } else if (firstErr instanceof Error && firstErr.name === 'OverconstrainedError') {
          console.warn('HD constraints failed, retrying basic:', firstErr);
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
        } else {
          throw firstErr;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Recalculate viewfinder once video metadata (dimensions) are available
        videoRef.current.onloadedmetadata = () => updateViewfinder();
        await videoRef.current.play();
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
  }, [updateViewfinder]);

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
  }, [facingMode, startCamera]);

  // ============================================
  // CAPTURE PHOTO — AUTO-CROP TO 4:3
  // ============================================

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !containerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (!vw || !vh) {
      // Video dimensions not available yet — capture raw frame as best-effort
      console.warn('[CameraCapture] Video dimensions not ready, capturing raw frame');
      canvas.width = video.clientWidth || 1920;
      canvas.height = video.clientHeight || 1440;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    } else if (!viewfinder) {
      // Viewfinder not calculated yet (ResizeObserver race) — do centered 4:3 crop from video directly
      console.warn('[CameraCapture] Viewfinder not ready, using centered 4:3 crop');
      const videoRatio = vw / vh;
      let sx = 0, sy = 0, sw = vw, sh = vh;
      if (videoRatio > TARGET_ASPECT) {
        sw = vh * TARGET_ASPECT;
        sx = (vw - sw) / 2;
      } else {
        sh = vw / TARGET_ASPECT;
        sy = (vh - sh) / 2;
      }
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    } else {
      // Calculate 4:3 crop centered on the video feed
      // This matches the viewfinder overlay the teacher sees
      const container = containerRef.current;
      const cw = container.offsetWidth;
      const ch = container.offsetHeight;

      // How object-cover scales the video into the container
      const scale = Math.max(cw / vw, ch / vh);
      const dispW = vw * scale;
      const dispH = vh * scale;
      const offX = (cw - dispW) / 2;
      const offY = (ch - dispH) / 2;

      // Map viewfinder rectangle from display coords → video pixel coords
      // viewfinder is guaranteed non-null here (null case handled above)
      const srcX = Math.max(0, (viewfinder.x - offX) / scale);
      const srcY = Math.max(0, (viewfinder.y - offY) / scale);
      const srcW = Math.min(viewfinder.w / scale, vw - srcX);
      const srcH = Math.min(viewfinder.h / scale, vh - srcY);

      canvas.width = Math.round(srcW);
      canvas.height = Math.round(srcH);
      ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
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
  }, [viewfinder]);

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
  }, []);

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
  // RENDER
  // ============================================

  const isRecording = cameraState === 'recording';
  const isCaptured = cameraState === 'captured';
  const previewUrl = captureMode === 'photo' ? capturedPhoto?.dataUrl : capturedVideo?.dataUrl;
  const showViewfinder = !isCaptured && captureMode === 'photo' && viewfinder && cameraState !== 'error';

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
      {/* Hidden file input for album selection */}
      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        onChange={handleAlbumSelect}
        className="hidden"
      />

      {/* Mode toggle (top center) */}
      {allowVideo && !isCaptured && !isRecording && (
        <div className="absolute left-1/2 -translate-x-1/2 z-30 flex bg-black/50 rounded-full p-1" style={{ top: 'max(12px, env(safe-area-inset-top, 12px))' }}>
          <button
            onClick={() => handleModeChange('photo')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              captureMode === 'photo' ? 'bg-white text-black' : 'text-white hover:bg-white/20'
            }`}
          >
            📷 {t('camera.photo')}
          </button>
          <button
            onClick={() => handleModeChange('video')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              captureMode === 'video' ? 'bg-white text-black' : 'text-white hover:bg-white/20'
            }`}
          >
            🎥 {t('camera.video')}
          </button>
        </div>
      )}

      {/* Camera indicator (top right) */}
      {!isCaptured && (
        <div className="absolute right-3 z-30 px-3 py-1 bg-black/50 rounded-full text-white text-xs font-medium" style={{ top: 'max(14px, env(safe-area-inset-top, 14px))' }}>
          {currentFacing === 'user' ? `🤳 ${t('camera.front')}` : `📷 ${t('camera.back')}`}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-full" style={{ top: 'max(14px, env(safe-area-inset-top, 14px))' }}>
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span className="font-mono font-bold">{formatTime(recordingTime)}</span>
          <span className="text-white/70 text-sm">/ {formatTime(MAX_VIDEO_DURATION)}</span>
        </div>
      )}

      {/* ═══ Camera View ═══ */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {cameraState === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-xl font-medium text-center mb-4">{error}</p>
            <button
              onClick={() => startCamera(currentFacing, captureMode === 'video')}
              className="px-6 py-3 bg-blue-500 rounded-xl font-medium hover:bg-blue-600 transition-colors"
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
            {/* Live camera feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {cameraState === 'initializing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <div className="flex flex-col items-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4" />
                  <p className="text-lg">{t('camera.starting')}</p>
                </div>
              </div>
            )}

            {/* ═══ 4:3 Viewfinder Overlay ═══ */}
            {showViewfinder && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                {/* Dark overlay — 4 panels around the clear zone */}
                {/* Top */}
                <div
                  className="absolute left-0 right-0 top-0 bg-black/45"
                  style={{ height: viewfinder.y }}
                />
                {/* Bottom */}
                <div
                  className="absolute left-0 right-0 bottom-0 bg-black/45"
                  style={{ height: `calc(100% - ${viewfinder.y + viewfinder.h}px)` }}
                />
                {/* Left */}
                <div
                  className="absolute left-0 bg-black/45"
                  style={{ top: viewfinder.y, height: viewfinder.h, width: viewfinder.x }}
                />
                {/* Right */}
                <div
                  className="absolute right-0 bg-black/45"
                  style={{ top: viewfinder.y, height: viewfinder.h, width: `calc(100% - ${viewfinder.x + viewfinder.w}px)` }}
                />

                {/* Corner brackets — premium camera feel */}
                {(() => {
                  const s = 24; // bracket arm length
                  const bw = 2.5; // bracket thickness
                  const corners = [
                    // top-left
                    { top: viewfinder.y, left: viewfinder.x },
                    // top-right
                    { top: viewfinder.y, left: viewfinder.x + viewfinder.w - s },
                    // bottom-left
                    { top: viewfinder.y + viewfinder.h - s, left: viewfinder.x },
                    // bottom-right
                    { top: viewfinder.y + viewfinder.h - s, left: viewfinder.x + viewfinder.w - s },
                  ];

                  return corners.map((pos, i) => {
                    const isTop = i < 2;
                    const isLeft = i % 2 === 0;
                    return (
                      <div key={i} className="absolute" style={{ top: pos.top, left: pos.left, width: s, height: s }}>
                        {/* Horizontal arm */}
                        <div
                          className="absolute bg-white/80"
                          style={{
                            [isTop ? 'top' : 'bottom']: 0,
                            [isLeft ? 'left' : 'right']: 0,
                            width: s,
                            height: bw,
                            borderRadius: bw / 2,
                          }}
                        />
                        {/* Vertical arm */}
                        <div
                          className="absolute bg-white/80"
                          style={{
                            [isTop ? 'top' : 'bottom']: 0,
                            [isLeft ? 'left' : 'right']: 0,
                            width: bw,
                            height: s,
                            borderRadius: bw / 2,
                          }}
                        />
                      </div>
                    );
                  });
                })()}

                {/* Subtle label */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 text-white/50 text-xs font-medium tracking-wide"
                  style={{ top: viewfinder.y + viewfinder.h + 8 }}
                >
                  4:3
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Controls ═══ */}
      <div
        className={`bg-black/80 backdrop-blur-sm ${isLandscape ? 'py-2' : ''}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {isCaptured ? (
          <div className={`flex items-center justify-between px-6 ${isLandscape ? 'py-2' : 'py-4'}`}>
            <button
              onClick={retake}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
            >
              <span className="text-xl">↺</span>
              <span>{t('camera.retake')}</span>
            </button>

            <button
              onClick={confirmCapture}
              className="flex items-center gap-2 px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
            >
              <span className="text-xl">✓</span>
              <span>{t('camera.use')} {captureMode === 'photo' ? t('camera.photo') : t('camera.video')}</span>
            </button>
          </div>
        ) : (
          <div className={`flex items-center justify-between px-6 ${isLandscape ? 'py-2' : 'py-4'}`}>
            {/* Cancel + Album (left) */}
            <div className="flex items-center gap-2">
              <button
                onClick={onCancel}
                disabled={isRecording}
                className="w-12 h-12 flex items-center justify-center text-white text-xl disabled:opacity-50"
              >
                ✕
              </button>
              {!isRecording && captureMode === 'photo' && (
                <button
                  onClick={handleNativeAlbumPick}
                  className="w-12 h-12 flex items-center justify-center bg-white/20 rounded-full text-white active:scale-90 transition-transform"
                  title={t('camera.album')}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
              )}
            </div>

            {/* Switch camera (center) */}
            <button
              onClick={switchCamera}
              disabled={cameraState !== 'ready'}
              className={`${isLandscape ? 'w-12 h-12' : 'w-14 h-14'} flex items-center justify-center bg-white/20 rounded-full text-white disabled:opacity-50 active:scale-90 transition-transform`}
            >
              <svg width={isLandscape ? 24 : 28} height={isLandscape ? 24 : 28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
                <circle cx="12" cy="12" r="3" />
                <path d="m18 22-3-3 3-3" />
                <path d="m6 2 3 3-3 3" />
              </svg>
            </button>

            {/* Capture button (right — easy thumb reach) */}
            <button
              onClick={handleMainButton}
              disabled={cameraState === 'initializing'}
              className={`${isLandscape ? 'w-16 h-16' : 'w-20 h-20'} rounded-full flex items-center justify-center disabled:opacity-50 transition-all active:scale-95 ${
                isRecording
                  ? 'bg-red-500 border-4 border-red-300'
                  : captureMode === 'video'
                    ? 'bg-red-500 border-4 border-red-300'
                    : 'bg-white border-4 border-white/30'
              }`}
            >
              {isRecording ? (
                <div className={`${isLandscape ? 'w-6 h-6' : 'w-8 h-8'} bg-white rounded-sm`} />
              ) : captureMode === 'video' ? (
                <div className={`${isLandscape ? 'w-6 h-6' : 'w-8 h-8'} bg-white rounded-full`} />
              ) : (
                <div className={`${isLandscape ? 'w-12 h-12' : 'w-16 h-16'} rounded-full bg-white`} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
