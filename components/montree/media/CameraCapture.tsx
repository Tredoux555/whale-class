// components/montree/media/CameraCapture.tsx
// Camera capture component using browser getUserMedia API
// Phase 2 - Session 53
// Tablet-ready, beautiful UI

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CapturedPhoto } from '@/lib/montree/media/types';

// ============================================
// TYPES
// ============================================

interface CameraCaptureProps {
  onCapture: (photo: CapturedPhoto) => void;
  onCancel: () => void;
  facingMode?: 'user' | 'environment';
}

type CameraState = 'initializing' | 'ready' | 'captured' | 'error';

// ============================================
// COMPONENT
// ============================================

export default function CameraCapture({ 
  onCapture, 
  onCancel,
  facingMode = 'environment' // Default to back camera
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [currentFacing, setCurrentFacing] = useState(facingMode);

  // ============================================
  // CAMERA INITIALIZATION
  // ============================================

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
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
        audio: false,
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
    startCamera(facingMode);

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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
  // ACTIONS
  // ============================================

  const retake = useCallback(() => {
    setCapturedPhoto(null);
    setCameraState('ready');
  }, []);

  const confirmPhoto = useCallback(() => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  }, [capturedPhoto, onCapture]);

  const switchCamera = useCallback(() => {
    const newFacing = currentFacing === 'environment' ? 'user' : 'environment';
    startCamera(newFacing);
  }, [currentFacing, startCamera]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera view or captured preview */}
      <div className="flex-1 relative overflow-hidden">
        {cameraState === 'error' ? (
          // Error state
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-xl font-medium text-center mb-4">{error}</p>
            <button
              onClick={() => startCamera(currentFacing)}
              className="px-6 py-3 bg-blue-500 rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : cameraState === 'captured' && capturedPhoto ? (
          // Captured preview
          <img
            src={capturedPhoto.dataUrl}
            alt="Captured"
            className="absolute inset-0 w-full h-full object-contain"
          />
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
        {cameraState === 'captured' ? (
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
              onClick={confirmPhoto}
              className="flex items-center gap-2 px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors"
            >
              <span className="text-xl">✓</span>
              <span>Use Photo</span>
            </button>
          </div>
        ) : (
          // Camera controls
          <div className="flex items-center justify-between px-6 py-4">
            {/* Cancel button */}
            <button
              onClick={onCancel}
              className="w-14 h-14 flex items-center justify-center text-white text-2xl"
            >
              ✕
            </button>

            {/* Capture button */}
            <button
              onClick={capturePhoto}
              disabled={cameraState !== 'ready'}
              className="w-20 h-20 rounded-full bg-white border-4 border-white/30 flex items-center justify-center disabled:opacity-50 transition-transform active:scale-95"
            >
              <div className="w-16 h-16 rounded-full bg-white" />
            </button>

            {/* Switch camera button */}
            <button
              onClick={switchCamera}
              disabled={cameraState !== 'ready'}
              className="w-14 h-14 flex items-center justify-center text-white text-2xl disabled:opacity-50"
            >
              🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
