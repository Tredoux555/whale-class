// lib/montree/media/upload.ts
// Client-side upload service - orchestrates compression + upload
// Phase 2 - Session 53

import { compressImage, generateThumbnail, formatFileSize } from './compression';
import type {
  UploadProgress,
  MontreeMedia,
  CapturedPhoto,
  CapturedVideo,
  CompressedImage,
  ThumbnailResult
} from './types';

// ============================================
// UPLOAD SERVICE
// ============================================

export interface UploadOptions {
  school_id: string;
  classroom_id?: string;
  child_id?: string;
  child_ids?: string[];  // For group photos
  is_class_photo?: boolean;  // Class photo - shared with ALL parents
  work_id?: string;
  caption?: string;
  tags?: string[];
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadResult {
  success: boolean;
  media?: MontreeMedia;
  error?: string;
  stats?: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: string;
    uploadTime: number;
  };
}

/**
 * Upload a captured photo with compression and thumbnail generation
 */
export async function uploadPhoto(
  photo: CapturedPhoto | File | Blob,
  options: UploadOptions
): Promise<UploadResult> {
  const startTime = Date.now();
  const { onProgress } = options;

  try {
    // Step 1: Preparing
    onProgress?.({
      status: 'preparing',
      progress: 0,
      message: 'Preparing photo...',
    });

    // Get the blob from CapturedPhoto or use directly if File/Blob
    const originalBlob = 'blob' in photo ? photo.blob : photo;
    const originalSize = originalBlob.size;

    // Step 2: Compress
    onProgress?.({
      status: 'compressing',
      progress: 20,
      message: 'Compressing image...',
    });

    let compressed: CompressedImage;
    try {
      compressed = await compressImage(originalBlob);
    } catch (err) {
      console.error('Compression failed, using original:', err);
      // Fallback to original if compression fails
      compressed = {
        blob: originalBlob,
        dataUrl: '',
        width: 'width' in photo ? photo.width : 0,
        height: 'height' in photo ? photo.height : 0,
        originalSize,
        compressedSize: originalSize,
      };
    }

    // Step 3: Generate thumbnail
    onProgress?.({
      status: 'compressing',
      progress: 40,
      message: 'Creating thumbnail...',
    });

    let thumbnail: ThumbnailResult | null = null;
    try {
      thumbnail = await generateThumbnail(compressed.blob);
    } catch (err) {
      console.error('Thumbnail generation failed:', err);
      // Continue without thumbnail
    }

    // Step 4: Upload
    onProgress?.({
      status: 'uploading',
      progress: 60,
      message: 'Uploading to server...',
    });

    const formData = new FormData();
    
    // Add main file
    formData.append('file', compressed.blob, `photo-${Date.now()}.jpg`);
    
    // Add thumbnail if available
    if (thumbnail) {
      formData.append('thumbnail', thumbnail.blob, `thumb-${Date.now()}.jpg`);
    }

    // Add metadata
    const metadata = {
      school_id: options.school_id,
      classroom_id: options.classroom_id,
      child_id: options.child_id,
      child_ids: options.child_ids,
      is_class_photo: options.is_class_photo,  // For class photos shared with all parents
      media_type: 'photo',
      captured_at: new Date().toISOString(),
      work_id: options.work_id,
      caption: options.caption,
      tags: options.tags,
      width: compressed.width,
      height: compressed.height,
    };
    formData.append('metadata', JSON.stringify(metadata));

    // Make upload request
    const response = await fetch('/api/montree/media/upload', {
      method: 'POST',
      body: formData,
    });

    // Step 5: Creating record
    onProgress?.({
      status: 'creating-record',
      progress: 90,
      message: 'Saving to database...',
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    // Step 6: Complete
    const uploadTime = Date.now() - startTime;
    
    onProgress?.({
      status: 'complete',
      progress: 100,
      message: 'Upload complete!',
    });

    return {
      success: true,
      media: result.media,
      stats: {
        originalSize,
        compressedSize: compressed.compressedSize,
        compressionRatio: `${Math.round((1 - compressed.compressedSize / originalSize) * 100)}%`,
        uploadTime,
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    onProgress?.({
      status: 'error',
      progress: 0,
      message: 'Upload failed',
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Upload a captured video without compression (videos stay in original format)
 */
export async function uploadVideo(
  video: CapturedVideo | File | Blob,
  options: UploadOptions
): Promise<UploadResult> {
  const startTime = Date.now();
  const { onProgress } = options;

  try {
    // Step 1: Preparing
    onProgress?.({
      status: 'preparing',
      progress: 0,
      message: 'Preparing video...',
    });

    // Get the blob from CapturedVideo or use directly if File/Blob
    const originalBlob = 'blob' in video ? video.blob : video;
    const originalSize = originalBlob.size;
    const duration = 'duration' in video ? video.duration : 0;

    // Step 2: Upload (no compression for videos to preserve quality)
    onProgress?.({
      status: 'uploading',
      progress: 20,
      message: 'Uploading video...',
    });

    const formData = new FormData();

    // Add main file
    const filename = `video-${Date.now()}.webm`;
    formData.append('file', originalBlob, filename);

    // Add metadata
    const metadata = {
      school_id: options.school_id,
      classroom_id: options.classroom_id,
      child_id: options.child_id,
      child_ids: options.child_ids,
      is_class_photo: options.is_class_photo,
      media_type: 'video',
      captured_at: new Date().toISOString(),
      work_id: options.work_id,
      caption: options.caption,
      tags: options.tags,
      duration: duration,
    };
    formData.append('metadata', JSON.stringify(metadata));

    // Make upload request
    const response = await fetch('/api/montree/media/upload', {
      method: 'POST',
      body: formData,
    });

    // Step 3: Creating record
    onProgress?.({
      status: 'creating-record',
      progress: 80,
      message: 'Saving to database...',
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    // Step 4: Complete
    const uploadTime = Date.now() - startTime;

    onProgress?.({
      status: 'complete',
      progress: 100,
      message: 'Upload complete!',
    });

    return {
      success: true,
      media: result.media,
      stats: {
        originalSize,
        compressedSize: originalSize,
        compressionRatio: '0%',
        uploadTime,
      },
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    onProgress?.({
      status: 'error',
      progress: 0,
      message: 'Upload failed',
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Upload multiple photos (batch upload)
 */
export async function uploadPhotos(
  photos: (CapturedPhoto | File | Blob)[],
  options: UploadOptions,
  onProgress?: (index: number, total: number, progress: UploadProgress) => void
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];

    const result = await uploadPhoto(photo, {
      ...options,
      onProgress: (progress) => {
        onProgress?.(i, photos.length, progress);
      },
    });

    results.push(result);

    // If one fails, continue with the rest but log it
    if (!result.success) {
      console.error(`Photo ${i + 1} failed:`, result.error);
    }
  }

  return results;
}

// ============================================
// MEDIA URL HELPERS
// ============================================

/**
 * Get signed URL for a media file (for display)
 * Note: This calls an API endpoint to generate signed URL
 */
export async function getMediaUrl(storagePath: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/montree/media/url?path=${encodeURIComponent(storagePath)}`);
    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error('Failed to get media URL:', error);
    return null;
  }
}

/**
 * Get signed URLs for multiple media files
 */
export async function getMediaUrls(storagePaths: string[]): Promise<Record<string, string>> {
  try {
    const response = await fetch('/api/montree/media/urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: storagePaths }),
    });
    const data = await response.json();
    return data.urls || {};
  } catch (error) {
    console.error('Failed to get media URLs:', error);
    return {};
  }
}

// ============================================
// PROGRESS DISPLAY HELPERS
// ============================================

/**
 * Get human-readable status message
 */
export function getProgressMessage(progress: UploadProgress): string {
  switch (progress.status) {
    case 'preparing':
      return progress.message.includes('video') ? '🎥 Preparing video...' : '📷 Preparing photo...';
    case 'compressing':
      return '🗜️ Optimizing image...';
    case 'uploading':
      return '☁️ Uploading...';
    case 'creating-record':
      return '💾 Saving...';
    case 'complete':
      return '✅ Done!';
    case 'error':
      return `❌ ${progress.error || 'Failed'}`;
    default:
      return progress.message;
  }
}

/**
 * Get progress bar color
 */
export function getProgressColor(status: UploadProgress['status']): string {
  switch (status) {
    case 'preparing':
    case 'compressing':
      return 'bg-yellow-500';
    case 'uploading':
    case 'creating-record':
      return 'bg-blue-500';
    case 'complete':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}
