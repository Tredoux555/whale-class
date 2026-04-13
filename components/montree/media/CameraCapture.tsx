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
}

type CameraState = 'initializing' | 'ready' | 'recording' | 'captured' | 'error';
type CaptureMode = 'photo' | 'video';

const MAX_VIDEO_DURATION = 30; // seconds

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
  const [isLandscape, setIsLandscape] = useState(false);

  // Track orientation
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
  }, [t]);

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
      // Capture full native resolution from the video feed
      canvas.width = vw;
      canvas.height = vh;
      ctx.drawImage(video, 0, 0, vw, vh);
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

      {/* ═══ Camera View — full screen, no overlay ═══ */}
      <div className="flex-1 relative overflow-hidden bg-black">
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
            {/* Live camera feed — fullscreen, no cropping overlay */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
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
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      </div>

      {/* ═══ Controls — bottom bar ═══ */}
      <div
        className="bg-black"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}
      >
        {isCaptured ? (
          /* ── Post-capture: Retake / Use Photo ── */
          <div className={`flex items-center justify-between px-6 ${isLandscape ? 'py-2' : 'py-4'}`}>
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
        ) : (
          /* ── Live camera controls ── */
          <div className="flex flex-col items-center">
            {/* Mode toggle — above capture button (iOS-style bottom position) */}
            {allowVideo && !isRecording && (
              <div className="flex gap-6 py-2">
                <button
                  onClick={() => handleModeChange('photo')}
                  className={`text-sm font-semibold transition-colors ${
                    captureMode === 'photo' ? 'text-yellow-400' : 'text-white/50'
                  }`}
                >
                  {t('camera.photo').toUpperCase()}
                </button>
                <button
                  onClick={() => handleModeChange('video')}
                  className={`text-sm font-semibold transition-colors ${
                    captureMode === 'video' ? 'text-yellow-400' : 'text-white/50'
                  }`}
                >
                  {t('camera.video').toUpperCase()}
                </button>
              </div>
            )}

            {/* Main row: Cancel / Album — [Capture] */}
            <div className={`flex items-center w-full px-6 ${isLandscape ? 'py-2' : 'py-3'}`}>
              {/* Left: Cancel + Album */}
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Center: Capture button — THE big button */}
              <button
                onClick={handleMainButton}
                disabled={cameraState === 'initializing'}
                className={`
                  ${isLandscape ? 'w-[60px] h-[60px]' : 'w-[72px] h-[72px]'}
                  rounded-full flex items-center justify-center
                  transition-transform active:scale-95
                  disabled:opacity-30 disabled:pointer-events-none
                  ${isRecording
                    ? 'bg-transparent border-[3px] border-white'
                    : captureMode === 'video'
                      ? 'bg-transparent border-[3px] border-white'
                      : 'bg-transparent border-[3px] border-white'
                  }
                `}
              >
                {isRecording ? (
                  /* Stop: red rounded square */
                  <div className={`${isLandscape ? 'w-5 h-5' : 'w-6 h-6'} bg-red-500 rounded-[4px]`} />
                ) : captureMode === 'video' ? (
                  /* Video ready: red circle */
                  <div className={`${isLandscape ? 'w-[48px] h-[48px]' : 'w-[58px] h-[58px]'} rounded-full bg-red-500`} />
                ) : (
                  /* Photo: white circle inside ring */
                  <div className={`${isLandscape ? 'w-[50px] h-[50px]' : 'w-[62px] h-[62px]'} rounded-full bg-white`} />
                )}
              </button>

              {/* Right: spacer for balance */}
              <div className="flex-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
