// lib/montree/media/compression.ts
// Client-side image compression + thumbnail generation
// Phase 2 - Session 53

import type { CompressedImage, ThumbnailResult } from './types';

// ============================================
// COMPRESSION SETTINGS
// ============================================

const COMPRESSION_SETTINGS = {
  maxWidth: 1920,           // Max width for photos
  maxHeight: 1920,          // Max height for photos
  quality: 0.8,             // JPEG quality (0-1)
  targetSizeKB: 500,        // Target file size in KB
  maxIterations: 5,         // Max compression attempts
  qualityStep: 0.1,         // Quality reduction per iteration
};

const THUMBNAIL_SETTINGS = {
  width: 200,
  height: 200,
  quality: 0.7,
};

// ============================================
// MAIN COMPRESSION FUNCTION
// ============================================

/**
 * Compress an image blob to target size while maintaining quality
 * Uses progressive quality reduction if needed
 */
export async function compressImage(
  file: File | Blob,
  options?: Partial<typeof COMPRESSION_SETTINGS>
): Promise<CompressedImage> {
  const settings = { ...COMPRESSION_SETTINGS, ...options };
  const originalSize = file.size;

  // Load image
  const img = await loadImage(file);
  const originalWidth = img.width;
  const originalHeight = img.height;

  // Calculate new dimensions (maintain aspect ratio)
  let { width, height } = calculateDimensions(
    originalWidth,
    originalHeight,
    settings.maxWidth,
    settings.maxHeight
  );

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Compress with progressive quality reduction
  let quality = settings.quality;
  let blob: Blob | null = null;
  let iterations = 0;

  while (iterations < settings.maxIterations) {
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    
    // Check if we've hit target size or quality is too low
    if (blob.size <= settings.targetSizeKB * 1024 || quality <= 0.3) {
      break;
    }

    // Reduce quality and try again
    quality -= settings.qualityStep;
    iterations++;
  }

  if (!blob) {
    throw new Error('Failed to compress image');
  }

  const dataUrl = await blobToDataUrl(blob);

  return {
    blob,
    dataUrl,
    width,
    height,
    originalSize,
    compressedSize: blob.size,
  };
}

// ============================================
// THUMBNAIL GENERATION
// ============================================

/**
 * Generate a square thumbnail from an image
 * Crops to center square before resizing
 */
export async function generateThumbnail(
  file: File | Blob,
  options?: Partial<typeof THUMBNAIL_SETTINGS>
): Promise<ThumbnailResult> {
  const settings = { ...THUMBNAIL_SETTINGS, ...options };

  // Load image
  const img = await loadImage(file);

  // Create canvas for thumbnail
  const canvas = document.createElement('canvas');
  canvas.width = settings.width;
  canvas.height = settings.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Calculate crop area (center square)
  const size = Math.min(img.width, img.height);
  const sx = (img.width - size) / 2;
  const sy = (img.height - size) / 2;

  // Draw cropped and scaled image
  ctx.drawImage(
    img,
    sx, sy, size, size,  // Source rectangle (crop)
    0, 0, settings.width, settings.height  // Destination rectangle
  );

  const blob = await canvasToBlob(canvas, 'image/jpeg', settings.quality);
  const dataUrl = await blobToDataUrl(blob);

  return {
    blob,
    dataUrl,
    width: settings.width,
    height: settings.height,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Load an image from a File or Blob
 * Note: Caller should revoke the objectURL when done with the image
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      // Revoke URL after image loads to free memory
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    img.src = objectUrl;
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // If image is smaller than max dimensions, return original
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  // Calculate scale factor
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const scale = Math.min(widthRatio, heightRatio);

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Convert canvas to Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Convert Blob to Data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Get image dimensions from a File or Blob
 */
export async function getImageDimensions(
  file: File | Blob
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return { width: img.width, height: img.height };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Check if file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}
