// components/montree/student/ProfilePhotoCapture.tsx
// Simplified camera capture for student profile photos
// Point-and-snap: camera → preview → confirm → upload
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { compressImage } from '@/lib/montree/media/compression';

interface ProfilePhotoCaptureProps {
  childId: string;
  childName: string;
  currentPhotoUrl?: string;
  onPhotoSaved: (url: string) => void;
  onCancel: () => void;
}

type CaptureState = 'camera' | 'preview' | 'uploading' | 'error';

export default function ProfilePhotoCapture({
  childId,
  childName,
  currentPhotoUrl,
  onPhotoSaved,
  onCancel,
}: ProfilePhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CaptureState>('camera');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');

  // Start camera on mount
  useEffect(() => {
    startCamera(facing);
    return () => stopCamera();
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = async (facingMode: 'user' | 'environment') => {
    try {
      setState('camera');
      setError(null);
      stopCamera();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
      } catch {
        // Fallback: try without resolution constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setFacing(facingMode);
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions.');
      } else if (name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Could not access camera. Please try again.');
      }
      setState('error');
    }
  };

  const flipCamera = () => {
    const newFacing = facing === 'environment' ? 'user' : 'environment';
    startCamera(newFacing);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPhotoBlob(blob);
          setState('preview');
          stopCamera();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPhotoBlob(null);
    startCamera(facing);
  };

  const confirmAndUpload = async () => {
    if (!photoBlob) return;
    setState('uploading');

    try {
      // Compress client-side (target 500KB, max 800px for profile photos)
      const compressed = await compressImage(photoBlob, {
        maxWidth: 800,
        maxHeight: 800,
        targetSizeKB: 300,
      });

      // Upload to profile photo API
      const formData = new FormData();
      formData.append('photo', compressed.blob, 'profile.jpg');

      const res = await fetch(`/api/montree/children/${childId}/photo`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      // Clean up preview
      if (previewUrl) URL.revokeObjectURL(previewUrl);

      onPhotoSaved(data.photo_url);
    } catch (err) {
      console.error('Profile photo upload error:', err);
      setError('Failed to upload photo. Please try again.');
      setState('preview');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-white z-10">
        <button onClick={onCancel} className="p-2 -ml-2">
          <span className="text-2xl">✕</span>
        </button>
        <div className="text-center">
          <h2 className="font-bold text-base">{childName}</h2>
          <p className="text-white/60 text-xs">Profile Photo</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Camera / Preview / Error */}
      <div className="flex-1 relative overflow-hidden">
        {state === 'camera' && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Circular guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full border-4 border-white/30" />
            </div>

            {/* Flip camera button */}
            <button
              onClick={flipCamera}
              className="absolute top-4 right-4 w-10 h-10 bg-black/40 rounded-full flex items-center justify-center text-white"
            >
              🔄
            </button>
          </>
        )}

        {state === 'preview' && previewUrl && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            {/* Circular guide overlay on preview too */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full border-4 border-white/30" />
            </div>
          </div>
        )}

        {state === 'uploading' && (
          <div className="w-full h-full flex items-center justify-center bg-black">
            {previewUrl && (
              <img src={previewUrl} alt="Uploading" className="max-w-full max-h-full object-contain opacity-50" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/70 rounded-2xl px-8 py-6 text-center">
                <div className="text-3xl mb-3 animate-pulse">📸</div>
                <p className="text-white font-medium">Saving photo...</p>
              </div>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="w-full h-full flex items-center justify-center bg-black px-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📷</div>
              <p className="text-white/80 mb-4">{error}</p>
              <button
                onClick={() => startCamera(facing)}
                className="px-6 py-3 bg-white text-black rounded-xl font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 px-6">
        {state === 'camera' && (
          <div className="flex items-center justify-center">
            <button
              onClick={takePhoto}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform shadow-lg"
            >
              <div className="w-16 h-16 rounded-full border-4 border-gray-300" />
            </button>
          </div>
        )}

        {state === 'preview' && (
          <div className="flex gap-4">
            <button
              onClick={retake}
              className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-medium text-lg"
            >
              ↻ Retake
            </button>
            <button
              onClick={confirmAndUpload}
              className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg"
            >
              ✓ Use Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
