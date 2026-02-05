// components/montree/media/CameraCapture.tsx
// Camera capture component with photo and video support
// Phase 2 - Session 53 + Testing Week video enhancements

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CapturedPhoto, CapturedVideo, CapturedMedia } from '@/lib/montree/media/types';

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

  // ============================================
  // CAMERA INITIALIZATION
  // ============================================

  const startCamera = useCallback(async (facing: 'user' | 'environment', withAudio = false) => {
    try {
      setCameraState('initializing');
      setError(null);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Request camera access
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: withAudio,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState('ready');
        setCurrentFacing(facing);
      }
    } catch (err) {
      console.error('Camera error:', err);

      let errorMessage = 'Failed to access camera';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is in use by another application.';
        }
      }

      setError(errorMessage);
      setCameraState('error');
    }
  }, []);

  // Initialize camera on mount
  useEffect(() => {
    startCamera(facingMode, captureMode === 'video');

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [facingMode, startCamera]);

  // ============================================
  // CAPTURE PHOTO
  // ============================================

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Failed to capture photo');
          return;
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

        const photo: CapturedPhoto = {
          blob,
          dataUrl,
          width: canvas.width,
          height: canvas.height,
          timestamp: new Date(),
        };

        setCapturedPhoto(photo);
        setCameraState('captured');
      },
      'image/jpeg',
      0.9
    );
  }, []);

  // ============================================
  // VIDEO RECORDING
  // ============================================

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setRecordingTime(0);
    recordingStartRef.current = Date.now();

    try {
      // Try different codecs for better compatibility
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const duration = Math.round((Date.now() - recordingStartRef.current) / 1000);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const dataUrl = URL.createObjectURL(blob);

        const video: CapturedVideo = {
          blob,
          dataUrl,
          duration,
          timestamp: new Date(),
        };

        setCapturedVideo(video);
        setCameraState('captured');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setCameraState('recording');

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= MAX_VIDEO_DURATION) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording. Your browser may not support video recording.');
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
    // Restart the camera stream
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
    // Restart camera with audio if switching to video
    startCamera(currentFacing, mode === 'video');
  }, [cameraState, currentFacing, startCamera]);

  const handleMainButton = useCallback(() => {
    if (captureMode === 'photo') {
      capturePhoto();
    } else {
      if (cameraState === 'recording') {
        stopRecording();
      } else {
        startRecording();
      }
    }
  }, [captureMode, cameraState, capturePhoto, startRecording, stopRecording]);

  // Format time as MM:SS
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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Mode toggle (top) */}
      {allowVideo && !isCaptured && !isRecording && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex bg-black/50 rounded-full p-1">
          <button
            onClick={() => handleModeChange('photo')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              captureMode === 'photo'
                ? 'bg-white text-black'
                : 'text-white hover:bg-white/20'
            }`}
          >
            📷 Photo
          </button>
          <button
            onClick={() => handleModeChange('video')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              captureMode === 'video'
                ? 'bg-white text-black'
                : 'text-white hover:bg-white/20'
            }`}
          >
            🎥 Video
          </button>
        </div>
      )}

      {/* Camera indicator (top right) */}
      {!isCaptured && (
        <div className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-black/50 rounded-full text-white text-xs font-medium">
          {currentFacing === 'user' ? '🤳 Front' : '📷 Back'}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span className="font-mono font-bold">{formatTime(recordingTime)}</span>
          <span className="text-white/70 text-sm">/ {formatTime(MAX_VIDEO_DURATION)}</span>
        </div>
      )}

      {/* Camera view or captured preview */}
      <div className="flex-1 relative overflow-hidden">
        {cameraState === 'error' ? (
          // Error state
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-xl font-medium text-center mb-4">{error}</p>
            <button
              onClick={() => startCamera(currentFacing, captureMode === 'video')}
              className="px-6 py-3 bg-blue-500 rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : isCaptured && previewUrl ? (
          // Captured preview
          captureMode === 'photo' ? (
            <img
              src={previewUrl}
              alt="Captured"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <video
              src={previewUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-contain"
            />
          )
        ) : (
          // Live camera view
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {cameraState === 'initializing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex flex-col items-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mb-4" />
                  <p className="text-lg">Starting camera...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black/80 backdrop-blur-sm safe-area-bottom">
        {isCaptured ? (
          // Captured controls
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={retake}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
            >
              <span className="text-xl">↺</span>
              <span>Retake</span>
            </button>

            <button
              onClick={confirmCapture}
              className="flex items-center gap-2 px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
            >
              <span className="text-xl">✓</span>
              <span>Use {captureMode === 'photo' ? 'Photo' : 'Video'}</span>
            </button>
          </div>
        ) : (
          // Camera controls
          <div className="flex items-center justify-between px-6 py-4">
            {/* Cancel button */}
            <button
              onClick={onCancel}
              disabled={isRecording}
              className="w-14 h-14 flex items-center justify-center text-white text-2xl disabled:opacity-50"
            >
              ✕
            </button>

            {/* Capture/Record button */}
            <button
              onClick={handleMainButton}
              disabled={cameraState === 'initializing'}
              className={`w-20 h-20 rounded-full flex items-center justify-center disabled:opacity-50 transition-all active:scale-95 ${
                isRecording
                  ? 'bg-red-500 border-4 border-red-300'
                  : captureMode === 'video'
                    ? 'bg-red-500 border-4 border-red-300'
                    : 'bg-white border-4 border-white/30'
              }`}
            >
              {isRecording ? (
                // Stop button
                <div className="w-8 h-8 bg-white rounded-sm" />
              ) : captureMode === 'video' ? (
                // Record button
                <div className="w-8 h-8 bg-white rounded-full" />
              ) : (
                // Photo button
                <div className="w-16 h-16 rounded-full bg-white" />
              )}
            </button>

            {/* Switch camera button */}
            <button
              onClick={switchCamera}
              disabled={cameraState !== 'ready'}
              className="w-14 h-14 flex items-center justify-center bg-white/20 rounded-full text-white disabled:opacity-50 active:scale-90 transition-transform"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
                <circle cx="12" cy="12" r="3" />
                <path d="m18 22-3-3 3-3" />
                <path d="m6 2 3 3-3 3" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
