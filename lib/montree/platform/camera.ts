// lib/montree/platform/camera.ts
// Unified camera abstraction: native Capacitor camera OR web getUserMedia
//
// On native (iOS/Android): Uses @capacitor/camera for native photo capture
//   - Better reliability on low-end devices
//   - Native permissions UI
//   - Direct album access
//   - Returns photo directly (no streaming)
//
// On web: Falls through to existing getUserMedia in CameraCapture.tsx
//   - Live preview stream
//   - Canvas-based capture
//   - Album via <input type="file">
//
// Usage:
//   import { captureNativePhoto, pickFromAlbum, isNativeCameraAvailable } from '@/lib/montree/platform/camera';
//
//   if (isNativeCameraAvailable()) {
//     const photo = await captureNativePhoto({ facing: 'environment' });
//   }

import { isNative } from '@/lib/montree/platform';
import type { CapturedPhoto } from '@/lib/montree/media/types';

// ============================================
// AVAILABILITY CHECK
// ============================================

/**
 * Check if native Capacitor camera is available.
 * Returns false on web — caller should fall back to getUserMedia flow.
 */
export function isNativeCameraAvailable(): boolean {
  return isNative();
}

// ============================================
// NATIVE PHOTO CAPTURE
// ============================================

export interface NativeCaptureOptions {
  facing?: 'user' | 'environment';
  quality?: number;       // 0-100, default 90
  targetWidth?: number;   // default 1920
  targetHeight?: number;  // default 1080
}

/**
 * Capture a photo using the native device camera.
 * Only works in Capacitor native shell — throws if called on web.
 *
 * Returns a CapturedPhoto compatible with the existing upload pipeline.
 */
export async function captureNativePhoto(
  options: NativeCaptureOptions = {}
): Promise<CapturedPhoto> {
  const { Camera, CameraResultType, CameraSource, CameraDirection } = await import('@capacitor/camera');

  const result = await Camera.getPhoto({
    quality: options.quality ?? 90,
    width: options.targetWidth ?? 1920,
    height: options.targetHeight ?? 1080,
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    direction: options.facing === 'user' ? CameraDirection.Front : CameraDirection.Rear,
    correctOrientation: true,
    presentationStyle: 'fullScreen',
  });

  if (!result.webPath) {
    throw new Error('Camera returned no photo');
  }

  // Convert URI to Blob
  const response = await fetch(result.webPath);
  const blob = await response.blob();

  // Get dimensions by loading into an Image element
  const { width, height, dataUrl } = await loadImageDimensions(blob);

  return {
    blob,
    dataUrl,
    width,
    height,
    timestamp: new Date(),
  };
}

// ============================================
// NATIVE ALBUM PICKER
// ============================================

/**
 * Pick a photo from the device's photo library using native picker.
 * Only works in Capacitor native shell.
 */
export async function pickFromAlbum(): Promise<CapturedPhoto> {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

  const result = await Camera.getPhoto({
    quality: 90,
    width: 1920,
    resultType: CameraResultType.Uri,
    source: CameraSource.Photos,
    correctOrientation: true,
    presentationStyle: 'popover',
  });

  if (!result.webPath) {
    throw new Error('No photo selected');
  }

  const response = await fetch(result.webPath);
  const blob = await response.blob();
  const { width, height, dataUrl } = await loadImageDimensions(blob);

  return {
    blob,
    dataUrl,
    width,
    height,
    timestamp: new Date(),
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Load an image blob to get its dimensions and data URL.
 */
function loadImageDimensions(blob: Blob): Promise<{ width: number; height: number; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          dataUrl,
        });
      };
      img.onerror = () => {
        // Fallback: use sensible defaults (prevents 0x0 in gallery/Smart Capture)
        console.warn('[NATIVE_CAMERA] Failed to read image dimensions, using defaults');
        resolve({ width: 1920, height: 1080, dataUrl });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read photo'));
    reader.readAsDataURL(blob);
  });
}
